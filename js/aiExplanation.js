// ========================================
// KAPOW! - AI Explanation & Banter System
// ========================================

import { getPositionValue } from './hand.js';
import { isTriadComplete } from './triad.js';
import { aiAnalyzeTriad, aiEvaluateHand, aiEvaluateCardSynergy, aiGetOpponentNeeds } from './ai.js';

// ========================================
// AI BANTER SYSTEM
// ========================================

export var AI_BANTER = {
  discard_helps_ai: [
    'Thanks, I needed that!',
    'Thanks for the card. Keep them coming!',
    'I owe you one\u2026 Just kidding!',
    'Much appreciated!',
    'Watch what you discard!',
    'Did you really mean to give me that?',
    '\ud83d\ude0f\ud83d\ude0f\ud83d\ude0f',
    'I appreciate the charity work.',
    "You didn't have to do that, but I'm glad you did.",
    'Are you trying to make this too easy for me?',
    'Thanks for the assist!',
    "Well, that's one way to play it\u2026",
    "I didn't need that much help, but I'll take it.",
    'Are you playing for me, or against me?',
    "I'm planning to win anyway, but thanks for speeding it up.",
    'If you keep this up, I might actually have to start trying.',
    'Are you sure you read the rules?'
  ],
  ai_completes_triad: [
    'One down!',
    "That's how it's done.",
    'Boom! Triad complete.',
    "Triads don't complete themselves\u2026 oh wait, mine do.",
    'Another one bites the dust.',
    'Piece by piece, I build my empire.',
    "That's called strategy.",
    'Check that off the list.',
    'Like clockwork.',
    "And that's how the pros do it."
  ],
  ai_goes_out: [
    "And that's a wrap!",
    'Game, set, match\u2026 well, round.',
    'Read it and weep!',
    "I'm out! Your turn to sweat.",
    'All done here. No pressure.',
    "Hope you've got a good last move in you.",
    'Dropping the mic.',
    "That's all, folks!",
    'Out! Good luck on your final turn.'
  ],
  player_goes_out: [
    "Not bad\u2026 Let's see if it pays off.",
    'Bold move. I respect it.',
    'I hope you did the math on that one.',
    'Going out already? Brave.',
    "Interesting choice. Let's see how this plays out.",
    "You sure about that? No take-backs!",
    "Okay, my turn to clean up.",
    "Confident! I like it."
  ],
  ai_wins_round: [
    'Better luck next round!',
    "I'll try to go easy on you\u2026 nah.",
    'My round! Want some tips?',
    "That's how you close out a round.",
    'Another round in the books.',
    "Don't worry, there are more rounds to go.",
    "I'd say sorry, but I'm not."
  ],
  player_wins_round: [
    'Enjoy it while it lasts.',
    "Lucky round. Won't happen again.",
    "Okay, you got me. This time.",
    "Not bad! But I'm just warming up.",
    "Well played\u2026 this round.",
    "I let you have that one.",
    "Savor it. It won't last."
  ],
  player_doubled: [
    "Ouch! That's gotta sting.",
    "The doubling rule is brutal, isn't it?",
    'Double trouble!',
    "That's a costly way to go out.",
    'Going out first is a gamble, and you lost it.',
    "Doubled! That'll leave a mark.",
    "Maybe next time, check the scoreboard first?"
  ],
  ai_doubled: [
    "Well\u2026 that didn't go as planned.",
    'I meant to do that. Character building.',
    "Okay, I deserved that one.",
    "We don't talk about this round.",
    "Let's pretend that didn't happen.",
    "Even geniuses have off days.",
    "That was\u2026 a learning experience."
  ],
  ai_grabs_kapow: [
    "Don't mind if I do!",
    'A wild card? Yes please!',
    'KAPOW! Mine now.',
    "I'll take that KAPOW, thank you very much.",
    'You left a KAPOW on the discard pile?!',
    "Christmas came early!",
    'A KAPOW! This changes everything.'
  ],
  ai_takes_discard: [
    "I'll take that off your hands.",
    "One person's trash\u2026",
    'Thanks, this is exactly what I needed.',
    "Didn't need that, did you?",
    "I see you don't want this. I do.",
    'Your loss, my gain.'
  ],
  ai_wins_game: [
    'GG! Better luck next time!',
    'I was programmed to win. No hard feelings!',
    'Victory! Want to go again?',
    "That was fun! Well, for me anyway.",
    'Another win for the AI. Humanity: 0.',
    "Great game! You made me work for it.",
    "I'd say it was close, but\u2026 was it?"
  ],
  player_wins_game: [
    'Well played! You earned that one.',
    "Rematch? I promise I'll try harder.",
    "Congratulations! Don't let it go to your head.",
    "You win this time. I'll remember this.",
    "Impressive! Truly. I'm not even mad.",
    "Okay, you're actually good at this.",
    "Winner winner! Respect."
  ]
};

export function generateAIBanter(state, scenario) {
  var pool = AI_BANTER[scenario];
  if (!pool || pool.length === 0) return;
  var msg = pool[Math.floor(Math.random() * pool.length)];
  state.aiCommentary = msg;
}

export function clearAIBanter(state) {
  if (state) state.aiCommentary = '';
}

// ========================================
// CARD DESCRIPTION HELPER
// ========================================

function cardDescription(card) {
  if (card.type === 'kapow') return 'KAPOW! card';
  if (card.type === 'power') return 'Power ' + card.faceValue + ' (' + card.modifiers[0] + '/' + card.modifiers[1] + ')';
  return '' + card.faceValue;
}

// ========================================
// AI MOVE EXPLANATION
// ========================================

export function buildAiExplanation(gameState, drawnCard, drawChoice, action, lastDrawReason) {
  var lines = [];
  var aiHand = gameState.players[1].hand;
  var drawnDesc = drawnCard ? cardDescription(drawnCard) : 'unknown';

  // DRAW explanation
  if (drawChoice === 'discard') {
    lines.push('<p class="explain-step"><span class="explain-label">Draw:</span> Kai chose to draw' + drawnDesc + ' from the discard pile rather than taking an unknown card from the draw pile.');
    if (lastDrawReason === 'completes a triad') {
      lines.push('This card directly completes one of Kai\'s triads, eliminating those points.</p>');
    } else if (lastDrawReason === 'strong placement available') {
      lines.push('Kai saw a strong use for this specific card in its hand.</p>');
    } else if (lastDrawReason === 'low card improves hand') {
      lines.push('This is a low-value card that reduces Kai\'s score.</p>');
    } else if (lastDrawReason === 'final turn — guaranteed improvement') {
      lines.push('On the final turn, Kai grabbed a guaranteed score improvement rather than risking an unknown draw.</p>');
    } else {
      lines.push('</p>');
    }
  } else {
    lines.push('<p class="explain-step"><span class="explain-label">Draw:</span> Kai drew from the draw pile.');
    if (lastDrawReason === 'deck offers better odds') {
      lines.push(' The discard pile card didn\'t offer a good opportunity, so Kai took a chance on an unknown card.</p>');
    } else {
      lines.push('</p>');
    }
  }

  // PLACEMENT explanation
  if (!action) {
    return lines.join('\n');
  }

  if (action.type === 'discard') {
    lines.push('<p class="explain-step"><span class="explain-label">Action:</span> Kai discarded ' + drawnDesc + '.</p>');
    // Explain why
    var discardReasons = [];
    var oppNeeds = aiGetOpponentNeeds(gameState);
    var cardVal = drawnCard.type === 'fixed' ? drawnCard.faceValue : -1;
    if (drawnCard.faceValue >= 8) {
      discardReasons.push('High-value cards (8+) are risky to place unless they build toward a triad completion');
    }
    if (cardVal >= 0 && oppNeeds[cardVal] && oppNeeds[cardVal] >= 2) {
      discardReasons.push('<em>Caution: this card may help your triads — but Kai had no better option than to discard it</em>');
    }
    if (discardReasons.length > 0) {
      lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> ' + discardReasons.join('. ') + '. When no placement improves your hand, discarding is the right play — don\'t waste a slot on a card that doesn\'t fit.</p>');
    } else {
      lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> None of the placement options improved Kai\'s hand enough to justify keeping this card. Sometimes the best move is to pass and wait for a better card.</p>');
    }
  } else if (action.type === 'powerset-on-power') {
    var existingPower = aiHand.triads[action.triadIndex][action.position][0];
    var modValue = action.usePositive ? existingPower.modifiers[1] : existingPower.modifiers[0];
    var modSign = modValue >= 0 ? '+' : '';
    var posLabel2 = action.position.charAt(0).toUpperCase() + action.position.slice(1);
    var faceVal = drawnCard.faceValue;
    var effectiveVal = faceVal + modValue;
    lines.push('<p class="explain-step"><span class="explain-label">Action:</span> Kai created a powerset in Triad ' + (action.triadIndex + 1) + ' (' + posLabel2 + '). The drawn ' + drawnDesc + ' sits on top of a Power ' + existingPower.faceValue + ' card, which acts as a modifier (' + modSign + modValue + '). The effective value is now ' + effectiveVal + ' instead of ' + faceVal + '.</p>');
    lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> Powersets are powerful because they let you change a card\'s effective value. Using a negative modifier can turn a medium card into a low-value one, reducing points and potentially enabling triad completion.</p>');
  } else if (action.type === 'add-powerset') {
    var posLabel3 = action.position.charAt(0).toUpperCase() + action.position.slice(1);
    var targetCards = aiHand.triads[action.triadIndex][action.position];
    var targetDesc = targetCards.length > 0 ? cardDescription(targetCards[0]) : 'the card';
    var modVal2 = action.usePositive ? drawnCard.modifiers[1] : drawnCard.modifiers[0];
    var modSign2 = modVal2 >= 0 ? '+' : '';
    var oldEffective = targetCards.length > 0 ? getPositionValue(targetCards) : 0;
    var newEffective = oldEffective + modVal2;
    lines.push('<p class="explain-step"><span class="explain-label">Action:</span> Kai used the drawn Power ' + drawnCard.faceValue + ' card as a modifier (' + modSign2 + modVal2 + ') beneath ' + targetDesc + ' in Triad ' + (action.triadIndex + 1) + ' (' + posLabel3 + '). The effective value changes from ' + oldEffective + ' to ' + newEffective + '.</p>');
    lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> Stacking a Power card as a modifier beneath an existing card changes its effective value without using a placement slot. This can bring a card closer to matching its neighbors for a set or run together.</p>');
  } else if (action.type === 'replace') {
    var triad = aiHand.triads[action.triadIndex];
    var posLabel = action.position.charAt(0).toUpperCase() + action.position.slice(1);
    var posCards = triad[action.position];
    var replacedWasRevealed = posCards.length > 0 && posCards[0].isRevealed;
    var replacedDesc = replacedWasRevealed ? cardDescription(posCards[0]) : 'a face-down card';
    var replacedVal = replacedWasRevealed ? getPositionValue(posCards) : -1;

    // Build the base placement message with replaced card info
    var placementMsg = 'Kai placed ' + drawnDesc + ' in Triad ' + (action.triadIndex + 1) + ' (' + posLabel + '), replacing ' + replacedDesc + '.';
    if (replacedWasRevealed) {
      var newVal = drawnCard.type === 'kapow' ? 25 : (drawnCard.type === 'power' ? drawnCard.faceValue : drawnCard.faceValue);
      var pointChange = replacedVal - newVal;
      if (pointChange > 0) {
        placementMsg += ' This saves ' + pointChange + ' points at that position.';
      } else if (pointChange < 0) {
        placementMsg += ' This adds ' + Math.abs(pointChange) + ' points at that position, but the strategic value outweighs the cost.';
      }
    }
    lines.push('<p class="explain-step"><span class="explain-label">Action:</span> ' + placementMsg + '</p>');

    // WHY this position — check for triad completion
    var origCards = triad[action.position];
    var newCard = { id: drawnCard.id, type: drawnCard.type, faceValue: drawnCard.faceValue,
      modifiers: drawnCard.modifiers, isRevealed: true,  };
    triad[action.position] = [newCard];
    var wouldComplete = isTriadComplete(triad);
    triad[action.position] = origCards;

    if (wouldComplete) {
      // Calculate total points being shed
      var triadPointsShed = 0;
      var triadPositions = ['top', 'middle', 'bottom'];
      for (var tp = 0; tp < 3; tp++) {
        var tpCards = tp === triadPositions.indexOf(action.position) ? [newCard] : triad[triadPositions[tp]];
        if (tpCards.length > 0) triadPointsShed += getPositionValue(tpCards);
      }
      lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> This completes the triad! All three cards are discarded, removing ' + triadPointsShed + ' points from Kai\'s score. Completing triads is the most powerful move in the game.</p>');
    } else {
      // Check if this placement would trigger going out (hand becomes fully revealed).
      // If so, skip the "future completion paths" explanation — they're irrelevant after going out.
      var wouldGoOut = false;
      if (gameState && gameState.phase === 'playing') {
        var handEvalForGoOut = aiEvaluateHand(aiHand);
        var posCards2 = triad[action.position];
        var isUnrevealedSlot = posCards2.length > 0 && !posCards2[0].isRevealed;
        if (isUnrevealedSlot && handEvalForGoOut.unrevealedCount === 1) {
          wouldGoOut = true;
        }
      }

      if (wouldGoOut) {
        // Placement triggers going out — explain the going-out decision instead
        var goOutScore = handEvalForGoOut.knownScore + (drawnCard.type === 'kapow' ? 25 : drawnCard.faceValue);
        lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> This placement reveals the last face-down card, triggering going out. Kai\'s score will be ' + goOutScore + ' points. Kai evaluated this was the best time to go out — the score is manageable and likely lower than your estimated final score.</p>');
      } else {
        // Analyze AFTER simulated placement to explain what this builds toward
        triad[action.position] = [newCard];
        var analysis = aiAnalyzeTriad(triad);
        triad[action.position] = origCards;

        // Show the triad state after placement
        var triadStateDesc = [];
        var triadPositions2 = ['top', 'middle', 'bottom'];
        for (var ts = 0; ts < 3; ts++) {
          var tsCards = triad[triadPositions2[ts]];
          if (triadPositions2[ts] === action.position) {
            triadStateDesc.push(drawnDesc);
          } else if (tsCards.length > 0 && tsCards[0].isRevealed) {
            triadStateDesc.push(cardDescription(tsCards[0]));
          } else if (tsCards.length > 0) {
            triadStateDesc.push('?');
          } else {
            triadStateDesc.push('empty');
          }
        }
        var triadVisual = 'Triad ' + (action.triadIndex + 1) + ' is now [' + triadStateDesc.join(', ') + '].';

        if (analysis.revealedCount >= 2 && (analysis.completionPaths > 0 || analysis.powerModifierPaths > 0)) {
          var pathParts = [];
          if (analysis.completionPaths > 0) {
            pathParts.push(analysis.completionPaths + ' standard card value(s)');
          }
          if (analysis.powerModifierPaths > 0) {
            pathParts.push(analysis.powerModifierPaths + ' Power card modifier combination(s)');
          }
          var pathDesc = pathParts.join(' and ');
          if (analysis.kapowBoost) {
            pathDesc += ', plus any KAPOW! wild card';
          }
          lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> ' + triadVisual + ' This triad can be completed by ' + pathDesc + '. Building toward triad completion is key — it removes all the triad\'s points from your score at once.</p>');
        } else if (!replacedWasRevealed) {
        // Replaced a face-down card
        var neighborSynergy = false;
        var synergyWith = '';
        for (var ni = 0; ni < 3; ni++) {
          var nPos = ['top', 'middle', 'bottom'][ni];
          if (nPos === action.position) continue;
          var nCards = triad[nPos];
          if (nCards.length > 0 && nCards[0].isRevealed) {
            var nSyn = aiEvaluateCardSynergy(
              drawnCard.type === 'fixed' ? drawnCard.faceValue : 0, ['top', 'middle', 'bottom'].indexOf(action.position),
              getPositionValue(nCards), ni
            );
            if (nSyn > 0) {
              neighborSynergy = true;
              synergyWith = cardDescription(nCards[0]) + ' at ' + nPos;
            }
          }
        }
        if (neighborSynergy) {
          lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> ' + triadVisual + ' This card has good synergy with ' + synergyWith + ' — they could form part of a set or run together. When cards work well together, future cards are more likely to complete the triad.</p>');
        } else {
          lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> ' + triadVisual + ' Kai replaced a face-down card (unknown value) with a known low card to start building this triad. Even without obvious synergy yet, placing low-value cards reduces risk.</p>');
        }
      } else if (replacedWasRevealed && replacedVal > newVal) {
        lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> ' + triadVisual + ' Reducing the value of cards that aren\'t part of a near-complete triad helps minimize your score if you can\'t complete the triad before the round ends.</p>');
      } else {
        lines.push('<p class="explain-step"><span class="explain-label">Strategy:</span> ' + triadVisual + '</p>');
      }
      }
    }

    // Defensive positioning explanation
    if (action.position === 'middle' || action.position === 'bottom') {
      if (drawnCard.type === 'kapow') {
        lines.push('<p class="explain-step"><span class="explain-label">Defense:</span> By placing the KAPOW! card in the ' + action.position + ' position, it will be buried in the discard pile when the triad completes. A KAPOW! card on top of the discard pile would give you a powerful wild card.</p>');
      } else if (analysis && analysis.revealedCount >= 2 && (analysis.completionPaths > 0 || analysis.powerModifierPaths > 0)) {
        var oppNeeds3 = aiGetOpponentNeeds(gameState);
        var cardVal3 = drawnCard.type === 'fixed' ? drawnCard.faceValue : -1;
        if (cardVal3 >= 0 && oppNeeds3[cardVal3] && oppNeeds3[cardVal3] >= 2) {
          lines.push('<p class="explain-step"><span class="explain-label">Defense:</span> By placing this card in the ' + action.position + ' position, it will be buried in the discard pile when the triad completes — keeping it away from you.</p>');
        }
      }
    }
  }

  // Context about AI's hand state
  var handEval = aiEvaluateHand(aiHand);
  var discardedCount = 0;
  for (var t = 0; t < aiHand.triads.length; t++) {
    if (aiHand.triads[t].isDiscarded) discardedCount++;
  }
  if (discardedCount > 0) {
    lines.push('<p class="explain-step"><span class="explain-label">Status:</span> Kai has discarded ' + discardedCount + ' of 4 triads. Remaining hand score is approximately ' + handEval.knownScore + ' points (plus unknowns).</p>');
  }

  // Lightbulb takeaway — contextual tip for the player
  var tip = generateTakeawayTip(gameState, drawnCard, drawChoice, action, discardedCount);
  if (tip) {
    lines.push('<div class="explain-takeaway"><span class="explain-takeaway-icon">\ud83d\udca1</span> <span class="explain-takeaway-text">' + tip + '</span></div>');
  }

  return lines.join('\n');
}

export function generateTakeawayTip(state, drawnCard, drawChoice, action, aiTriadsCompleted) {
  var tips = [];
  var playerHand = state.players[0].hand;
  var playerEval = aiEvaluateHand(playerHand);

  if (drawChoice === 'discard') {
    tips.push('The AI grabbed from the discard pile — it saw exactly what it needed. Watch what you discard: if it completes an obvious pattern, the AI will pounce.');
  }

  if (action && action.type === 'replace') {
    var aiTriad = state.players[1].hand.triads[action.triadIndex];
    if (aiTriad && aiTriad.isDiscarded) {
      tips.push('AI just completed a triad for 0 points. Focus on building your own triads — even partial progress (two matching cards) puts you one draw away from clearing a column.');
    }
  }

  if (playerEval.unrevealedCount >= 6) {
    tips.push('You still have ' + playerEval.unrevealedCount + ' face-down cards. Revealing cards gives you information to plan triads — consider replacing unknowns with low cards even if they don\'t complete anything yet.');
  }

  if (action && action.type === 'discard' && drawnCard) {
    var discardVal = drawnCard.type === 'fixed' ? drawnCard.faceValue : -1;
    if (discardVal >= 0 && discardVal <= 4) {
      tips.push('AI just discarded a low card (' + discardVal + '). Low cards in the discard pile can be valuable — grab them if they fit your triads.');
    }
  }

  if (aiTriadsCompleted >= 2 && playerEval.unrevealedCount > 2) {
    tips.push('The AI has cleared ' + aiTriadsCompleted + ' triads already. Prioritize completing at least one triad soon — those 0-point columns are how you stay competitive.');
  }

  if (drawnCard && drawnCard.type === 'kapow') {
    tips.push('KAPOW! cards are wild but cost 25 points if unused. The AI placed one strategically — if you draw one, get it into a near-complete triad quickly.');
  }

  if (action && (action.type === 'powerset-on-power' || action.type === 'modifier-on-card')) {
    tips.push('Power card modifiers can create negative values — a -2 modifier on a 0 card = -2 points. Look for stacking opportunities in your own hand.');
  }

  if (playerEval.knownScore > 30 && state.turnNumber > 4) {
    tips.push('Your visible score is ' + playerEval.knownScore + ' points. Try to complete a high-value triad to shed points fast — targeting columns with 8+ cards gives the biggest payoff.');
  }

  return tips.length > 0 ? tips[tips.length - 1] : null;
}
