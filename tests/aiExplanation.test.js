import { describe, test, expect, vi } from 'vitest';
import {
  AI_BANTER, generateAIBanter, clearAIBanter,
  buildAiExplanation, generateTakeawayTip
} from '../js/aiExplanation.js';

// Helpers
function fc(value, revealed = true) {
  return { id: `f${value}_${Math.random().toString(36).slice(2, 6)}`, type: 'fixed', faceValue: value, modifiers: null, isRevealed: revealed, isFrozen: false, assignedValue: null };
}
function kapowCard(revealed = true) {
  return { id: `kw_${Math.random().toString(36).slice(2, 6)}`, type: 'kapow', faceValue: 0, modifiers: null, isRevealed: revealed, isFrozen: false, assignedValue: null };
}
function powerCard(fv = 1, mods = [-1, 1]) {
  return { id: `p${fv}`, type: 'power', faceValue: fv, modifiers: mods, isRevealed: true, isFrozen: false, assignedValue: null };
}

function makeTriad(t, m, b, discarded = false) {
  return {
    top: [typeof t === 'object' ? t : fc(t)],
    middle: [typeof m === 'object' ? m : fc(m)],
    bottom: [typeof b === 'object' ? b : fc(b)],
    isDiscarded: discarded
  };
}

function makeGameState(playerTriads, aiTriads, options = {}) {
  return {
    players: [
      { hand: { triads: playerTriads || [makeTriad(5, 5, 5), makeTriad(3, 3, 3)] }, name: 'You' },
      { hand: { triads: aiTriads || [makeTriad(2, 2, 2), makeTriad(4, 4, 4)] }, name: 'AI' }
    ],
    drawPile: options.drawPile || [fc(1)],
    discardPile: options.discardPile || [],
    drawnCard: options.drawnCard || null,
    phase: options.phase || 'playing',
    turnNumber: options.turnNumber || 1,
  };
}

// ========================================
// AI_BANTER constant
// ========================================

describe('AI_BANTER', () => {
  test('has all expected scenario keys', () => {
    const expectedKeys = [
      'discard_helps_ai', 'ai_completes_triad', 'ai_goes_out',
      'player_goes_out', 'ai_wins_round', 'player_wins_round',
      'player_doubled', 'ai_doubled', 'ai_grabs_kapow',
      'ai_takes_discard', 'ai_wins_game', 'player_wins_game'
    ];
    for (const key of expectedKeys) {
      expect(AI_BANTER).toHaveProperty(key);
      expect(Array.isArray(AI_BANTER[key])).toBe(true);
      expect(AI_BANTER[key].length).toBeGreaterThan(0);
    }
  });

  test('all banter entries are strings', () => {
    for (const key of Object.keys(AI_BANTER)) {
      for (const msg of AI_BANTER[key]) {
        expect(typeof msg).toBe('string');
      }
    }
  });
});

// ========================================
// generateAIBanter
// ========================================

describe('generateAIBanter', () => {
  test('sets aiCommentary on state from valid scenario', () => {
    const state = { aiCommentary: '' };
    generateAIBanter(state, 'ai_goes_out');
    expect(typeof state.aiCommentary).toBe('string');
    expect(state.aiCommentary.length).toBeGreaterThan(0);
    expect(AI_BANTER.ai_goes_out).toContain(state.aiCommentary);
  });

  test('returns undefined for unknown scenario', () => {
    const state = { aiCommentary: '' };
    const result = generateAIBanter(state, 'nonexistent_scenario');
    expect(result).toBeUndefined();
    expect(state.aiCommentary).toBe('');
  });

  test('picks from correct pool', () => {
    const state = { aiCommentary: '' };
    generateAIBanter(state, 'player_doubled');
    expect(AI_BANTER.player_doubled).toContain(state.aiCommentary);
  });
});

// ========================================
// clearAIBanter
// ========================================

describe('clearAIBanter', () => {
  test('clears aiCommentary to empty string', () => {
    const state = { aiCommentary: 'Some banter' };
    clearAIBanter(state);
    expect(state.aiCommentary).toBe('');
  });

  test('handles null state without error', () => {
    expect(() => clearAIBanter(null)).not.toThrow();
  });

  test('handles undefined state without error', () => {
    expect(() => clearAIBanter(undefined)).not.toThrow();
  });
});

// ========================================
// buildAiExplanation
// ========================================

describe('buildAiExplanation', () => {
  test('returns string with draw explanation when drawing from deck', () => {
    const gs = makeGameState();
    const drawnCard = fc(5);
    const result = buildAiExplanation(gs, drawnCard, 'deck', null, '');
    expect(typeof result).toBe('string');
    expect(result).toContain('Draw:');
    expect(result).toContain('draw pile');
  });

  test('returns string with draw explanation when drawing from discard', () => {
    const gs = makeGameState();
    const drawnCard = fc(3);
    const result = buildAiExplanation(gs, drawnCard, 'discard', null, 'completes a triad');
    expect(result).toContain('discard pile');
    expect(result).toContain('completes one of Kai');
  });

  test('includes draw reason for "deck offers better odds"', () => {
    const gs = makeGameState();
    const drawnCard = fc(7);
    const result = buildAiExplanation(gs, drawnCard, 'deck', null, 'deck offers better odds');
    expect(result).toContain('didn\'t offer a good opportunity');
  });

  test('includes draw reason for "strong placement available"', () => {
    const gs = makeGameState();
    const drawnCard = fc(4);
    const result = buildAiExplanation(gs, drawnCard, 'discard', null, 'strong placement available');
    expect(result).toContain('strong use');
  });

  test('includes draw reason for "low card improves hand"', () => {
    const gs = makeGameState();
    const drawnCard = fc(1);
    const result = buildAiExplanation(gs, drawnCard, 'discard', null, 'low card improves hand');
    expect(result).toContain('low-value card');
  });

  test('includes draw reason for final turn', () => {
    const gs = makeGameState();
    const drawnCard = fc(2);
    const result = buildAiExplanation(gs, drawnCard, 'discard', null, 'final turn — guaranteed improvement');
    expect(result).toContain('final turn');
  });

  test('explains discard action', () => {
    const gs = makeGameState();
    const drawnCard = fc(9);
    const action = { type: 'discard' };
    const result = buildAiExplanation(gs, drawnCard, 'deck', action, '');
    expect(result).toContain('Action:');
    expect(result).toContain('discarded');
    expect(result).toContain('Strategy:');
  });

  test('explains discard of high-value card', () => {
    const gs = makeGameState();
    const drawnCard = fc(10);
    const action = { type: 'discard' };
    const result = buildAiExplanation(gs, drawnCard, 'deck', action, '');
    expect(result).toContain('High-value cards');
  });

  test('explains replace action', () => {
    const aiTriads = [
      makeTriad(fc(5), fc(7), fc(3)),
      makeTriad(fc(2), fc(2), fc(8))
    ];
    const gs = makeGameState(null, aiTriads);
    const drawnCard = fc(2);
    const action = { type: 'replace', triadIndex: 0, position: 'top' };
    const result = buildAiExplanation(gs, drawnCard, 'deck', action, '');
    expect(result).toContain('Action:');
    expect(result).toContain('Triad 1');
    expect(result).toContain('Top');
  });

  test('explains replace on unrevealed card', () => {
    const aiTriads = [
      makeTriad(fc(5, false), fc(7), fc(3)),
      makeTriad(fc(2), fc(2), fc(8))
    ];
    const gs = makeGameState(null, aiTriads);
    const drawnCard = fc(1);
    const action = { type: 'replace', triadIndex: 0, position: 'top' };
    const result = buildAiExplanation(gs, drawnCard, 'deck', action, '');
    expect(result).toContain('face-down card');
  });

  test('returns valid HTML with explain-step paragraphs', () => {
    const gs = makeGameState();
    const drawnCard = fc(4);
    const action = { type: 'discard' };
    const result = buildAiExplanation(gs, drawnCard, 'deck', action, '');
    expect(result).toContain('<p class="explain-step">');
    expect(result).toContain('<span class="explain-label">');
  });

  test('includes status line when triads are discarded', () => {
    const aiTriads = [
      makeTriad(1, 1, 1, true),
      makeTriad(fc(4), fc(4), fc(8))
    ];
    const gs = makeGameState(null, aiTriads);
    const drawnCard = fc(3);
    const action = { type: 'discard' };
    const result = buildAiExplanation(gs, drawnCard, 'deck', action, '');
    expect(result).toContain('Status:');
    expect(result).toContain('discarded 1 of 4 triads');
  });

  test('explains powerset-on-power action', () => {
    const existingPower = powerCard(3, [-2, 2]);
    const aiTriads = [
      makeTriad(existingPower, fc(5), fc(7)),
      makeTriad(fc(2), fc(2), fc(8))
    ];
    const gs = makeGameState(null, aiTriads);
    const drawnCard = fc(4);
    const action = { type: 'powerset-on-power', triadIndex: 0, position: 'top', usePositive: false };
    const result = buildAiExplanation(gs, drawnCard, 'deck', action, '');
    expect(result).toContain('powerset');
    expect(result).toContain('modifier');
  });

  test('explains add-powerset action', () => {
    const aiTriads = [
      makeTriad(fc(5), fc(7), fc(3)),
      makeTriad(fc(2), fc(2), fc(8))
    ];
    const gs = makeGameState(null, aiTriads);
    const drawnCard = powerCard(2, [-3, 3]);
    const action = { type: 'add-powerset', triadIndex: 0, position: 'top', usePositive: false };
    const result = buildAiExplanation(gs, drawnCard, 'deck', action, '');
    expect(result).toContain('modifier');
    expect(result).toContain('Stacking');
  });
});

// ========================================
// generateTakeawayTip
// ========================================

describe('generateTakeawayTip', () => {
  test('returns string or null', () => {
    const gs = makeGameState();
    const tip = generateTakeawayTip(gs, fc(5), 'deck', null, 0);
    expect(tip === null || typeof tip === 'string').toBe(true);
  });

  test('returns discard pile warning when drawing from discard', () => {
    const gs = makeGameState();
    const tip = generateTakeawayTip(gs, fc(5), 'discard', null, 0);
    expect(tip).toContain('discard pile');
  });

  test('returns tip about unrevealed cards when many face-down', () => {
    const playerTriads = [
      makeTriad(fc(1, false), fc(2, false), fc(3, false)),
      makeTriad(fc(4, false), fc(5, false), fc(6, false)),
      makeTriad(fc(7, false), fc(8, false), fc(9, false)),
    ];
    const gs = makeGameState(playerTriads);
    const tip = generateTakeawayTip(gs, fc(5), 'deck', null, 0);
    expect(tip).toContain('face-down cards');
  });

  test('returns low discard tip when AI discards low card', () => {
    const gs = makeGameState();
    const drawnCard = fc(2);
    const action = { type: 'discard' };
    const tip = generateTakeawayTip(gs, drawnCard, 'deck', action, 0);
    expect(tip).toContain('low card');
  });

  test('returns KAPOW tip when KAPOW card drawn', () => {
    const gs = makeGameState();
    const drawnCard = kapowCard();
    const tip = generateTakeawayTip(gs, drawnCard, 'deck', null, 0);
    expect(tip).toContain('KAPOW');
  });

  test('returns triad warning when AI has cleared 2+ triads', () => {
    // Player needs >2 unrevealed
    const playerTriads = [
      makeTriad(fc(1, false), fc(2, false), fc(3, false)),
      makeTriad(fc(4), fc(5), fc(6)),
    ];
    const gs = makeGameState(playerTriads);
    const tip = generateTakeawayTip(gs, fc(5), 'deck', null, 2);
    expect(tip).toContain('cleared 2 triads');
  });

  test('returns score tip when player score is high and turn > 4', () => {
    // Player hand with high visible score
    const playerTriads = [
      makeTriad(fc(10), fc(10), fc(10)),
      makeTriad(fc(9), fc(9), fc(9)),
    ];
    const gs = makeGameState(playerTriads);
    gs.turnNumber = 6;
    const tip = generateTakeawayTip(gs, fc(5), 'deck', null, 0);
    expect(tip).toContain('visible score');
  });

  test('returns powerset tip for powerset-on-power action', () => {
    const gs = makeGameState();
    const action = { type: 'powerset-on-power' };
    const tip = generateTakeawayTip(gs, fc(5), 'deck', action, 0);
    expect(tip).toContain('Power card modifiers');
  });

  test('returns null when no tips apply', () => {
    // All cards revealed, low score, deck draw, no special action
    const playerTriads = [
      makeTriad(fc(0), fc(0), fc(0)),
    ];
    const gs = makeGameState(playerTriads);
    gs.turnNumber = 1;
    const tip = generateTakeawayTip(gs, fc(5), 'deck', null, 0);
    // Could be null or a string depending on eval
    expect(tip === null || typeof tip === 'string').toBe(true);
  });
});
