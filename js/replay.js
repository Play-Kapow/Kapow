// ========================================
// KAPOW! - Game Log Replay System
// ========================================
// Parses exported game logs and reconstructs the exact deck order
// to replay a game to any point for bug reproduction and debugging.

import { createDeck, setRiggedDeck } from './deck.js';

// ── Card Description Parsing ──────────────────────────

function parseCardDesc(desc) {
  if (!desc) return null;
  desc = desc.trim();
  if (desc === 'KAPOW! card') return { type: 'kapow', faceValue: 0, modifiers: null };
  var m = desc.match(/^Power (\d+) \((-?\d+)\/([+-]?\d+)\)$/);
  if (m) return { type: 'power', faceValue: parseInt(m[1]), modifiers: [parseInt(m[2]), parseInt(m[3])] };
  m = desc.match(/^(\d+)$/);
  if (m) return { type: 'fixed', faceValue: parseInt(m[1]), modifiers: null };
  return null;
}

function cardKey(spec) {
  if (!spec) return null;
  if (spec.type === 'kapow') return 'kapow';
  if (spec.type === 'power') return 'power_' + spec.faceValue;
  return 'fixed_' + spec.faceValue;
}

// ── Log Parser ────────────────────────────────────────

export function parseGameLog(text) {
  var lines = text.split('\n');
  var playerName = '';
  var firstDiscard = null;
  var actions = [];       // ALL actions in order (both players + system)
  var humanActions = [];   // only human player's replay-relevant actions

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;

    // Player name from header
    var nameMatch = line.match(/^Player: (.+) vs AI$/);
    if (nameMatch) { playerName = nameMatch[1]; continue; }

    // Action line: R1 T2 [Actor] Body
    var prefix = line.match(/^R(\d+) T(\d+) \[(.+?)\] (.+)$/);
    if (!prefix) continue;
    var round = parseInt(prefix[1]);
    var turn = parseInt(prefix[2]);
    var actor = prefix[3];
    var body = prefix[4];
    var isHuman = (actor === playerName);

    // First discard
    var dStart = body.match(/^Discard pile starts with: (.+)$/);
    if (dStart) {
      firstDiscard = parseCardDesc(dStart[1]);
      actions.push({ turn, actor, type: 'firstDiscard', card: firstDiscard });
      continue;
    }

    // Turn start marker with discard top
    var turnStart = body.match(/^--- Turn (\d+): (.+?) --- \(discard: (.+)\)$/);
    if (turnStart) {
      actions.push({
        turn: parseInt(turnStart[1]), actor: 'SYSTEM', type: 'turnStart',
        turnPlayer: turnStart[2],
        discardTop: parseCardDesc(turnStart[3])
      });
      continue;
    }

    // Discard pile empty event
    if (body.includes('Discard pile empty')) {
      actions.push({ turn, actor: 'SYSTEM', type: 'discardEmpty' });
      continue;
    }

    // Reveal
    var rev = body.match(/^Reveals (.+) in Triad (\d+) \((\w+)\)$/);
    if (rev) {
      var a = { turn, actor, type: 'reveal', card: parseCardDesc(rev[1]),
        triadIndex: parseInt(rev[2]) - 1, position: rev[3] };
      actions.push(a);
      if (isHuman) humanActions.push({ type: 'reveal', triadIndex: a.triadIndex, position: a.position });
      continue;
    }

    // Draw
    var draw = body.match(/^Draws (.+) from (discard|draw) pile$/);
    if (draw) {
      var drawType = draw[2] === 'discard' ? 'drawDiscard' : 'drawDeck';
      var a = { turn, actor, type: drawType, card: parseCardDesc(draw[1]) };
      actions.push(a);
      if (isHuman) humanActions.push({ type: drawType });
      continue;
    }

    // Place
    var place = body.match(/^Places (.+) in Triad (\d+) \((\w+)\), replacing (.+)$/);
    if (place) {
      var a = { turn, actor, type: 'place', card: parseCardDesc(place[1]),
        triadIndex: parseInt(place[2]) - 1, position: place[3],
        replacing: place[4] };
      actions.push(a);
      if (isHuman) humanActions.push({ type: 'place', triadIndex: a.triadIndex, position: a.position });
      continue;
    }

    // Add powerset
    var ps = body.match(/^Creates powerset: (.+) as modifier \(([+-]?\d+)\) under card in Triad (\d+) \((\w+)\)$/);
    if (ps) {
      actions.push({ turn, actor, type: 'addPowerset', card: parseCardDesc(ps[1]),
        triadIndex: parseInt(ps[3]) - 1, position: ps[4] });
      continue;
    }

    // Triad completion
    var triadComp = body.match(/^Triad (\d+) completed!/);
    if (triadComp) {
      actions.push({ turn, actor, type: 'triadComplete', triadIndex: parseInt(triadComp[1]) - 1 });
      continue;
    }

    // Hand state
    var hand = body.match(/^Hand: (.+)$/);
    if (hand) {
      actions.push({ turn, actor, type: 'handState', handStr: hand[1] });
    }
  }

  return { playerName, firstDiscard, actions, humanActions };
}

// ── Deck Reconstruction ──────────────────────────────

/**
 * Build a rigged 118-card deck from parsed log data.
 * deck[0..11] = human hand, deck[12..23] = AI hand,
 * deck[24..116] = draw pile (popped from END), deck[117] = first discard.
 */
export function reconstructDeck(parsed) {
  var DECK_SIZE = 118;
  var deckSpecs = new Array(DECK_SIZE).fill(null); // card specs for each position

  // Helper: deck index for a hand position
  function handIdx(actor, triadIdx, position) {
    var offset = (actor === parsed.playerName) ? 0 : 12;
    var posOff = position === 'top' ? 0 : position === 'middle' ? 1 : 2;
    return offset + triadIdx * 3 + posOff;
  }

  // 1. First discard = deck[117]
  deckSpecs[117] = parsed.firstDiscard;

  // 2. Identify cards from reveals (these are original dealt cards)
  // 3. Identify draw-pile cards (drawn from END of draw pile)
  // 4. Track discard-empty flips (each pops one more from draw pile)
  var drawPtr = 116; // current end of draw pile

  // Group actions by turn for discard trail analysis
  var turnActions = {}; // turn# → [actions]
  for (var i = 0; i < parsed.actions.length; i++) {
    var a = parsed.actions[i];
    if (!turnActions[a.turn]) turnActions[a.turn] = [];
    turnActions[a.turn].push(a);
  }

  // Walk through all actions to place known cards
  for (var i = 0; i < parsed.actions.length; i++) {
    var a = parsed.actions[i];

    if (a.type === 'reveal' && a.card) {
      // Original dealt card at this position
      var idx = handIdx(a.actor, a.triadIndex, a.position);
      if (!deckSpecs[idx]) deckSpecs[idx] = a.card;
    }

    if (a.type === 'drawDeck' && a.card) {
      // Card from draw pile (popped from end)
      deckSpecs[drawPtr] = a.card;
      drawPtr--;
    }

    if (a.type === 'discardEmpty') {
      // A card was popped from draw pile to replenish discard
      // Value is unknown (buried), but we need to reserve the position
      drawPtr--;
    }
  }

  // 5. Use discard trail to identify replaced face-down cards
  // For each turn T, the "discardTop" tells us what's on top of the discard pile.
  // If the previous turn had a simple placement (no triad completion), the
  // discard top IS the replaced face-down card.
  var turnNumbers = Object.keys(turnActions).map(Number).sort(function(a, b) { return a - b; });

  for (var ti = 0; ti < turnNumbers.length; ti++) {
    var t = turnNumbers[ti];
    var acts = turnActions[t];

    // Find turnStart action for this turn (has discardTop)
    var turnStartAction = null;
    for (var j = 0; j < acts.length; j++) {
      if (acts[j].type === 'turnStart') { turnStartAction = acts[j]; break; }
    }
    if (!turnStartAction || !turnStartAction.discardTop) continue;

    // Look at the PREVIOUS turn's actions
    var prevTurn = t - 1;
    if (!turnActions[prevTurn]) continue;
    var prevActs = turnActions[prevTurn];

    // Check if previous turn had a triad completion
    var hadTriadCompletion = false;
    for (var j = 0; j < prevActs.length; j++) {
      if (prevActs[j].type === 'triadComplete') { hadTriadCompletion = true; break; }
    }

    // Find the placement action in the previous turn
    var placeAction = null;
    for (var j = 0; j < prevActs.length; j++) {
      if (prevActs[j].type === 'place') { placeAction = prevActs[j]; break; }
    }

    // If simple placement (no triad completion), discard top = replaced card
    if (placeAction && !hadTriadCompletion && placeAction.replacing === 'face-down card') {
      var idx = handIdx(placeAction.actor, placeAction.triadIndex, placeAction.position);
      if (!deckSpecs[idx]) {
        deckSpecs[idx] = turnStartAction.discardTop;
      }
    }
  }

  // 6. Build actual Card objects and fill unknowns from remaining pool
  var pool = buildCardPool();

  // Remove known cards from pool
  for (var i = 0; i < DECK_SIZE; i++) {
    if (deckSpecs[i]) {
      removeFromPool(pool, deckSpecs[i]);
    }
  }

  // Fill unknowns
  var poolList = poolToList(pool);
  var poolIdx = 0;
  for (var i = 0; i < DECK_SIZE; i++) {
    if (!deckSpecs[i]) {
      deckSpecs[i] = poolList[poolIdx++];
    }
  }

  // Convert specs to Card objects
  return deckSpecs.map(function(spec, i) {
    return {
      id: 'card_' + i,
      type: spec.type,
      faceValue: spec.faceValue,
      modifiers: spec.modifiers,
      isRevealed: false,
      isFrozen: false,
      assignedValue: null
    };
  });
}

function buildCardPool() {
  var pool = {};
  // Fixed 0: 8
  pool['fixed_0'] = 8;
  // Fixed 1: 4
  pool['fixed_1'] = 4;
  // Fixed 2: 4
  pool['fixed_2'] = 4;
  // Fixed 3-12: 8 each
  for (var v = 3; v <= 12; v++) pool['fixed_' + v] = 8;
  // Power 1: 8
  pool['power_1'] = 8;
  // Power 2: 8
  pool['power_2'] = 8;
  // KAPOW: 6
  pool['kapow'] = 6;
  return pool;
}

function removeFromPool(pool, spec) {
  var key = cardKey(spec);
  if (key && pool[key] > 0) pool[key]--;
}

function poolToList(pool) {
  var list = [];
  var keys = Object.keys(pool);
  for (var i = 0; i < keys.length; i++) {
    var count = pool[keys[i]];
    for (var j = 0; j < count; j++) {
      var parts = keys[i].split('_');
      if (keys[i] === 'kapow') {
        list.push({ type: 'kapow', faceValue: 0, modifiers: null });
      } else if (parts[0] === 'power') {
        var v = parseInt(parts[1]);
        list.push({ type: 'power', faceValue: v, modifiers: v === 1 ? [-1, 1] : [-2, 2] });
      } else {
        list.push({ type: 'fixed', faceValue: parseInt(parts[1]), modifiers: null });
      }
    }
  }
  return list;
}

// ── Replay Driver ─────────────────────────────────────

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

/**
 * Replay a game from a log file to a specific turn.
 * @param {string} logText - The exported game log text
 * @param {number} stopAtTurn - Stop when this turn number is reached (AI's turn)
 * @param {number} [speed=3] - Speed multiplier (1=normal, 5=fast, 10=turbo)
 */
export async function replayFromLog(logText, stopAtTurn, speed) {
  speed = speed || 3;

  console.log('[Replay] Parsing game log...');
  var parsed = parseGameLog(logText);
  if (!parsed.playerName) {
    console.error('[Replay] Could not parse player name from log');
    return;
  }
  console.log('[Replay] Player: ' + parsed.playerName + ', ' + parsed.humanActions.length + ' human actions');

  console.log('[Replay] Reconstructing deck...');
  var riggedDeck = reconstructDeck(parsed);
  console.log('[Replay] Deck ready (' + riggedDeck.length + ' cards)');

  // Set the rigged deck (will be used by next shuffle() call)
  setRiggedDeck(riggedDeck);

  // Start the game
  console.log('[Replay] Starting game as "' + parsed.playerName + '"...');
  var nameInput = document.getElementById('player-name-input');
  if (nameInput) nameInput.value = parsed.playerName;
  var startBtn = document.getElementById('btn-start-game');
  if (startBtn) startBtn.click();

  await sleep(500);

  // Speed up AI
  if (window._setReplaySpeed) window._setReplaySpeed(speed);

  var actionDelay = Math.max(100, 800 / speed);
  var actionIdx = 0;

  console.log('[Replay] Stepping through ' + parsed.humanActions.length + ' human actions (stop at T' + stopAtTurn + ')...');

  while (actionIdx < parsed.humanActions.length) {
    // Wait for human turn
    var waited = 0;
    while (true) {
      var state = window._getReplayState ? window._getReplayState() : null;
      if (!state) { console.error('[Replay] No replay state available'); return; }

      // Check if we've reached the stop turn
      if (state.turnNumber >= stopAtTurn) {
        console.log('[Replay] Reached turn ' + state.turnNumber + ' — stopping replay');
        if (window._setReplaySpeed) window._setReplaySpeed(1); // restore normal speed
        return;
      }

      // Check if it's human's turn and game is ready
      if (state.isHumanTurn && !state.aiTurnInProgress && !state.triadAnimationInProgress) {
        break;
      }

      await sleep(100);
      waited += 100;
      if (waited > 30000) {
        console.error('[Replay] Timed out waiting for human turn at action ' + actionIdx);
        if (window._setReplaySpeed) window._setReplaySpeed(1);
        return;
      }
    }

    // Check stop condition again after waiting
    var state = window._getReplayState();
    if (state.turnNumber >= stopAtTurn) {
      console.log('[Replay] Reached turn ' + state.turnNumber + ' — stopping replay');
      if (window._setReplaySpeed) window._setReplaySpeed(1);
      return;
    }

    // Execute next human action
    var action = parsed.humanActions[actionIdx];
    if (window._replayAction) {
      window._replayAction(action);
    }
    actionIdx++;

    await sleep(actionDelay);
  }

  console.log('[Replay] All human actions executed');
  if (window._setReplaySpeed) window._setReplaySpeed(1);
}
