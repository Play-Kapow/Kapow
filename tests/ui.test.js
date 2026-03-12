import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  renderCardHTML,
  renderPowersetInfo,
  renderHand,
  renderDiscardPile,
  renderDrawnCard,
  renderDrawPile,
  renderScorecard,
  updateDrawPileCount,
  updateMessage,
  updateScoreboard,
  updateButtons,
  showRoundEnd,
  hideRoundEnd,
  showGameOver,
  hideGameOver
} from '../js/ui.js';

// ========================================
// renderCardHTML
// ========================================
describe('renderCardHTML', () => {
  test('renders face-down card', () => {
    var card = { type: 'fixed', faceValue: 5, isRevealed: true };
    var html = renderCardHTML(card, true, false);
    expect(html).toContain('card-back');
    expect(html).toContain('KAPOW!');
  });

  test('renders unrevealed card as face-down', () => {
    var card = { type: 'fixed', faceValue: 5, isRevealed: false };
    var html = renderCardHTML(card, false, false);
    expect(html).toContain('card-back');
  });

  test('renders fixed card with face value', () => {
    var card = { type: 'fixed', faceValue: 7, isRevealed: true };
    var html = renderCardHTML(card, false, false);
    expect(html).toContain('card-fixed');
    expect(html).toContain('Fixed');
    expect(html).toContain('7');
  });

  test('renders fixed card with powerset value', () => {
    var card = { type: 'fixed', faceValue: 7, isRevealed: true };
    var html = renderCardHTML(card, false, false, 10);
    expect(html).toContain('Powerset');
    expect(html).toContain('has-powerset');
    expect(html).toContain('powerset-total');
    expect(html).toContain('10');
    expect(html).not.toContain('Fixed');
  });

  test('renders power card with face value and signs', () => {
    var card = { type: 'power', faceValue: 4, modifiers: [-2, 3], isRevealed: true };
    var html = renderCardHTML(card, false, false);
    expect(html).toContain('card-power');
    expect(html).toContain('Power');
    expect(html).toContain('4');
    expect(html).toContain('power-sign-minus');
    expect(html).toContain('power-sign-plus');
  });

  test('renders power card with powerset value', () => {
    var card = { type: 'power', faceValue: 4, modifiers: [-2, 3], isRevealed: true };
    var html = renderCardHTML(card, false, false, 8);
    expect(html).toContain('Powerset');
    expect(html).toContain('has-powerset');
    expect(html).toContain('powerset-total');
    expect(html).toContain('8');
    expect(html).not.toContain('>Power<');
  });

  test('renders kapow card', () => {
    var card = { type: 'kapow', isRevealed: true };
    var html = renderCardHTML(card, false, false);
    expect(html).toContain('card-kapow');
    expect(html).toContain('KAPOW!');
    expect(html).toContain('Wild (0-12)');
  });

  test('adds clickable class when clickable', () => {
    var card = { type: 'fixed', faceValue: 3, isRevealed: true };
    var html = renderCardHTML(card, false, true);
    expect(html).toContain('clickable');
  });

  test('does not add clickable class when not clickable', () => {
    var card = { type: 'fixed', faceValue: 3, isRevealed: true };
    var html = renderCardHTML(card, false, false);
    expect(html).not.toContain('clickable');
  });

  test('returns fallback for unknown card type', () => {
    var card = { type: 'unknown', isRevealed: true };
    var html = renderCardHTML(card, false, false);
    expect(html).toContain('?');
  });

  test('does not show powerset for null powersetValue', () => {
    var card = { type: 'fixed', faceValue: 5, isRevealed: true };
    var html = renderCardHTML(card, false, false, null);
    expect(html).toContain('Fixed');
    expect(html).not.toContain('Powerset');
  });

  test('does not show powerset for undefined powersetValue', () => {
    var card = { type: 'fixed', faceValue: 5, isRevealed: true };
    var html = renderCardHTML(card, false, false, undefined);
    expect(html).toContain('Fixed');
    expect(html).not.toContain('Powerset');
  });
});

// ========================================
// renderPowersetInfo
// ========================================
describe('renderPowersetInfo', () => {
  test('renders effective value and modifier text', () => {
    var cards = [
      { type: 'fixed', faceValue: 5, isRevealed: true },
      { type: 'power', faceValue: 3, modifiers: [-2, 3], activeModifier: 3, isRevealed: true }
    ];
    var html = renderPowersetInfo(cards);
    expect(html).toContain('powerset-info');
    expect(html).toContain('powerset-modifier');
    expect(html).toContain('powerset-effective');
    expect(html).toContain('+3');
  });

  test('renders negative modifier', () => {
    var cards = [
      { type: 'fixed', faceValue: 5, isRevealed: true },
      { type: 'power', faceValue: 3, modifiers: [-2, 3], activeModifier: -2, isRevealed: true }
    ];
    var html = renderPowersetInfo(cards);
    expect(html).toContain('-2');
  });

  test('renders multiple modifiers with comma separation', () => {
    var cards = [
      { type: 'fixed', faceValue: 5, isRevealed: true },
      { type: 'power', faceValue: 3, modifiers: [-2, 3], activeModifier: 3, isRevealed: true },
      { type: 'power', faceValue: 4, modifiers: [-1, 2], activeModifier: -1, isRevealed: true }
    ];
    var html = renderPowersetInfo(cards);
    expect(html).toContain('+3, ');
    expect(html).toContain('-1');
  });
});

// ========================================
// renderHand
// ========================================
describe('renderHand', () => {
  var container;

  beforeEach(() => {
    container = { innerHTML: '' };
    globalThis.document = {
      getElementById: vi.fn(function(id) { return container; })
    };
  });

  afterEach(() => {
    delete globalThis.document;
  });

  function makeHand(triads) {
    return { triads: triads || [] };
  }

  function makeTriad(opts) {
    return {
      top: opts.top || [],
      middle: opts.middle || [],
      bottom: opts.bottom || [],
      isDiscarded: opts.isDiscarded || false
    };
  }

  function makeCard(type, faceValue, revealed) {
    return { type: type, faceValue: faceValue, isRevealed: revealed !== false, modifiers: [-2, 3] };
  }

  test('renders empty hand', () => {
    renderHand(makeHand([]), 'player-hand', false, [], null, null);
    expect(container.innerHTML).toBe('');
  });

  test('renders triad labels', () => {
    var hand = makeHand([
      makeTriad({ top: [makeCard('fixed', 5)], middle: [makeCard('fixed', 3)], bottom: [makeCard('fixed', 7)] })
    ]);
    renderHand(hand, 'player-hand', false, [], null, null);
    expect(container.innerHTML).toContain('Triad 1');
  });

  test('renders position labels', () => {
    var hand = makeHand([
      makeTriad({ top: [makeCard('fixed', 5)], middle: [makeCard('fixed', 3)], bottom: [makeCard('fixed', 7)] })
    ]);
    renderHand(hand, 'player-hand', false, [], null, null);
    expect(container.innerHTML).toContain('Top');
    expect(container.innerHTML).toContain('Mid');
    expect(container.innerHTML).toContain('Bot');
  });

  test('renders discarded triad with empty slots', () => {
    var hand = makeHand([
      makeTriad({ top: [], middle: [], bottom: [], isDiscarded: true })
    ]);
    renderHand(hand, 'player-hand', false, [], null, null);
    expect(container.innerHTML).toContain('discarded-triad');
    expect(container.innerHTML).toContain('empty-slot');
  });

  test('reverses position order for opponent', () => {
    var hand = makeHand([
      makeTriad({ top: [makeCard('fixed', 1)], middle: [makeCard('fixed', 2)], bottom: [makeCard('fixed', 3)] })
    ]);
    renderHand(hand, 'ai-hand', true, [], null, null);
    // For opponent, bottom comes first in render order
    var bottomIdx = container.innerHTML.indexOf('Bot');
    var topIdx = container.innerHTML.indexOf('Top');
    expect(bottomIdx).toBeLessThan(topIdx);
  });

  test('renders cards as face-down for opponent when unrevealed', () => {
    var card = makeCard('fixed', 5, false);
    var hand = makeHand([
      makeTriad({ top: [card], middle: [], bottom: [] })
    ]);
    renderHand(hand, 'ai-hand', true, [], null, null);
    expect(container.innerHTML).toContain('card-back');
  });

  test('adds onclick wrapper for clickable positions', () => {
    var hand = makeHand([
      makeTriad({ top: [makeCard('fixed', 5)], middle: [], bottom: [] })
    ]);
    var clickable = [{ triadIndex: 0, position: 'top' }];
    renderHand(hand, 'player-hand', false, clickable, 'window._onCardClick', null);
    expect(container.innerHTML).toContain('onclick="window._onCardClick(0,\'top\')"');
    expect(container.innerHTML).toContain('clickable');
  });

  test('does not add onclick when no onClickAttr', () => {
    var hand = makeHand([
      makeTriad({ top: [makeCard('fixed', 5)], middle: [], bottom: [] })
    ]);
    var clickable = [{ triadIndex: 0, position: 'top' }];
    renderHand(hand, 'player-hand', false, clickable, null, null);
    expect(container.innerHTML).not.toContain('onclick');
  });

  test('applies highlight class for place action', () => {
    var hand = makeHand([
      makeTriad({ top: [makeCard('fixed', 5)], middle: [], bottom: [] })
    ]);
    var hl = { type: 'place', triadIndex: 0, position: 'top' };
    renderHand(hand, 'ai-hand', true, [], null, hl);
    expect(container.innerHTML).toContain('ai-place-highlight');
  });

  test('applies highlight class for reveal action', () => {
    var hand = makeHand([
      makeTriad({ top: [makeCard('fixed', 5)], middle: [], bottom: [] })
    ]);
    var hl = { type: 'reveal', triadIndex: 0, position: 'top' };
    renderHand(hand, 'ai-hand', true, [], null, hl);
    expect(container.innerHTML).toContain('ai-reveal-highlight');
  });

  test('applies highlight class for kapow-selected', () => {
    var hand = makeHand([
      makeTriad({ top: [makeCard('fixed', 5)], middle: [], bottom: [] })
    ]);
    var hl = { type: 'kapow-selected', triadIndex: 0, position: 'top' };
    renderHand(hand, 'player-hand', false, [], null, hl);
    expect(container.innerHTML).toContain('kapow-selected-highlight');
  });

  test('no highlight class when highlight does not match triad', () => {
    var hand = makeHand([
      makeTriad({ top: [makeCard('fixed', 5)], middle: [], bottom: [] }),
      makeTriad({ top: [makeCard('fixed', 3)], middle: [], bottom: [] })
    ]);
    // Highlight is for triad 1, but we check triad 0 doesn't get it
    var hl = { type: 'place', triadIndex: 1, position: 'top' };
    renderHand(hand, 'player-hand', false, [], null, hl);
    // The first triad-column should not contain the highlight
    var firstTriadEnd = container.innerHTML.indexOf('</div></div>') + '</div></div>'.length;
    var firstTriadHtml = container.innerHTML.substring(0, firstTriadEnd);
    expect(firstTriadHtml).not.toContain('ai-place-highlight');
  });

  test('renders powerset value for stacked revealed cards', () => {
    var cards = [
      makeCard('fixed', 5),
      { type: 'power', faceValue: 3, modifiers: [-2, 3], activeModifier: 3, isRevealed: true }
    ];
    var hand = makeHand([
      makeTriad({ top: cards, middle: [], bottom: [] })
    ]);
    renderHand(hand, 'player-hand', false, [], null, null);
    expect(container.innerHTML).toContain('Powerset');
    expect(container.innerHTML).toContain('powerset-total');
  });
});

// ========================================
// renderDiscardPile
// ========================================
describe('renderDiscardPile', () => {
  var container;

  beforeEach(() => {
    container = {
      innerHTML: '',
      className: '',
      classList: {
        add: vi.fn(function(cls) { container.className += ' ' + cls; }),
        remove: vi.fn()
      }
    };
    globalThis.document = {
      getElementById: vi.fn(function(id) {
        if (id === 'discard-top') return container;
        return null;
      })
    };
  });

  afterEach(() => {
    delete globalThis.document;
  });

  test('shows empty when no cards', () => {
    renderDiscardPile([], null, false);
    expect(container.innerHTML).toContain('Empty');
  });

  test('renders fixed card on top', () => {
    renderDiscardPile([{ type: 'fixed', faceValue: 8, isRevealed: true }], null, false);
    expect(container.innerHTML).toContain('8');
    expect(container.className).toContain('card-fixed');
  });

  test('renders power card on top with face-row layout', () => {
    renderDiscardPile([{ type: 'power', faceValue: 4, modifiers: [-2, 3], isRevealed: true }], null, false);
    expect(container.innerHTML).toContain('card-power-face-row');
    expect(container.innerHTML).toContain('power-sign-minus');
    expect(container.innerHTML).toContain('power-sign-plus');
  });

  test('renders kapow card on top', () => {
    renderDiscardPile([{ type: 'kapow', isRevealed: true }], null, false);
    expect(container.innerHTML).toContain('KAPOW!');
    expect(container.className).toContain('card-kapow');
  });

  test('shows drawn card when drawnFromDiscard is true', () => {
    var drawnCard = { type: 'fixed', faceValue: 9, isRevealed: true };
    renderDiscardPile([{ type: 'fixed', faceValue: 3, isRevealed: true }], drawnCard, true);
    expect(container.innerHTML).toContain('9');
  });

  test('shows top of pile when drawnFromDiscard is false', () => {
    var drawnCard = { type: 'fixed', faceValue: 9, isRevealed: true };
    renderDiscardPile([{ type: 'fixed', faceValue: 3, isRevealed: true }], drawnCard, false);
    expect(container.innerHTML).toContain('3');
  });

  test('returns early when container not found', () => {
    globalThis.document = {
      getElementById: vi.fn(function() { return null; })
    };
    // Should not throw
    renderDiscardPile([], null, false);
  });
});

// ========================================
// renderDrawPile
// ========================================
describe('renderDrawPile', () => {
  var container;

  beforeEach(() => {
    container = {
      innerHTML: '',
      classList: {
        add: vi.fn(),
        remove: vi.fn()
      }
    };
    globalThis.document = {
      getElementById: vi.fn(function(id) {
        if (id === 'draw-top') return container;
        return null;
      })
    };
  });

  afterEach(() => {
    delete globalThis.document;
  });

  test('shows card back when no drawn card', () => {
    renderDrawPile({ drawnCard: null, drawnFromDiscard: false });
    expect(container.innerHTML).toContain('card-back');
    expect(container.classList.remove).toHaveBeenCalledWith('drawn-highlight');
  });

  test('shows drawn card face-up when drawn from deck', () => {
    var state = {
      drawnCard: { type: 'fixed', faceValue: 6, isRevealed: true },
      drawnFromDiscard: false
    };
    renderDrawPile(state);
    expect(container.innerHTML).toContain('6');
    expect(container.classList.add).toHaveBeenCalledWith('drawn-highlight');
  });

  test('shows card back when drawn from discard', () => {
    var state = {
      drawnCard: { type: 'fixed', faceValue: 6, isRevealed: true },
      drawnFromDiscard: true
    };
    renderDrawPile(state);
    expect(container.innerHTML).toContain('card-back');
    expect(container.classList.remove).toHaveBeenCalledWith('drawn-highlight');
  });

  test('returns early when container not found', () => {
    globalThis.document = {
      getElementById: vi.fn(function() { return null; })
    };
    renderDrawPile({ drawnCard: null, drawnFromDiscard: false });
  });
});

// ========================================
// renderDrawnCard
// ========================================
describe('renderDrawnCard', () => {
  var area, display;

  beforeEach(() => {
    area = {
      classList: {
        add: vi.fn(),
        remove: vi.fn()
      }
    };
    display = { innerHTML: '' };
    globalThis.document = {
      getElementById: vi.fn(function(id) {
        if (id === 'drawn-card-area') return area;
        if (id === 'drawn-card-display') return display;
        return null;
      })
    };
  });

  afterEach(() => {
    delete globalThis.document;
  });

  test('hides area and clears display when card is null', () => {
    renderDrawnCard(null);
    expect(area.classList.add).toHaveBeenCalledWith('hidden');
    expect(display.innerHTML).toBe('');
  });

  test('shows area and renders card HTML when card provided', () => {
    renderDrawnCard({ type: 'fixed', faceValue: 5, isRevealed: true });
    expect(area.classList.remove).toHaveBeenCalledWith('hidden');
    expect(display.innerHTML).toContain('5');
    expect(display.innerHTML).toContain('card-fixed');
  });
});

// ========================================
// renderScorecard
// ========================================
describe('renderScorecard', () => {
  var cells, rows, tbody, playerTotal, aiTotal;

  beforeEach(() => {
    cells = [
      { textContent: '' },
      { textContent: '' },
      { textContent: '' }
    ];
    rows = [
      { className: '', getElementsByTagName: vi.fn(function() { return cells; }) }
    ];
    tbody = {
      getElementsByTagName: vi.fn(function() { return rows; })
    };
    playerTotal = { innerHTML: '' };
    aiTotal = { innerHTML: '' };

    globalThis.document = {
      getElementById: vi.fn(function(id) {
        if (id === 'scorecard-body') return tbody;
        if (id === 'sc-player-total') return playerTotal;
        if (id === 'sc-ai-total') return aiTotal;
        return null;
      })
    };
  });

  afterEach(() => {
    delete globalThis.document;
  });

  test('highlights current round', () => {
    var state = {
      round: 1,
      phase: 'playing',
      players: [
        { roundScores: [], totalScore: 0 },
        { roundScores: [], totalScore: 0 }
      ]
    };
    renderScorecard(state);
    expect(rows[0].className).toBe('current-round');
  });

  test('marks completed rounds', () => {
    var state = {
      round: 2,
      phase: 'playing',
      players: [
        { roundScores: [10], totalScore: 10 },
        { roundScores: [8], totalScore: 8 }
      ]
    };
    renderScorecard(state);
    expect(rows[0].className).toBe('completed-round');
  });

  test('fills in scores', () => {
    var state = {
      round: 2,
      phase: 'playing',
      players: [
        { roundScores: [15], totalScore: 15 },
        { roundScores: [12], totalScore: 12 }
      ]
    };
    renderScorecard(state);
    expect(cells[1].textContent).toBe(15);
    expect(cells[2].textContent).toBe(12);
  });

  test('shows dash for unplayed rounds', () => {
    var state = {
      round: 1,
      phase: 'playing',
      players: [
        { roundScores: [], totalScore: 0 },
        { roundScores: [], totalScore: 0 }
      ]
    };
    renderScorecard(state);
    expect(cells[1].textContent).toBe('-');
    expect(cells[2].textContent).toBe('-');
  });

  test('updates total scores', () => {
    var state = {
      round: 1,
      phase: 'playing',
      players: [
        { roundScores: [], totalScore: 25 },
        { roundScores: [], totalScore: 18 }
      ]
    };
    renderScorecard(state);
    expect(playerTotal.innerHTML).toContain('25');
    expect(aiTotal.innerHTML).toContain('18');
  });

  test('returns early when scorecard-body not found', () => {
    globalThis.document = {
      getElementById: vi.fn(function() { return null; })
    };
    // Should not throw
    renderScorecard({ round: 1, phase: 'playing', players: [{ roundScores: [], totalScore: 0 }, { roundScores: [], totalScore: 0 }] });
  });
});

// ========================================
// updateDrawPileCount
// ========================================
describe('updateDrawPileCount', () => {
  test('sets draw count text', () => {
    var el = { textContent: '' };
    globalThis.document = { getElementById: vi.fn(function() { return el; }) };
    updateDrawPileCount(42);
    expect(el.textContent).toBe('(42 cards)');
    delete globalThis.document;
  });
});

// ========================================
// updateMessage
// ========================================
describe('updateMessage', () => {
  test('sets message text', () => {
    var el = { textContent: '' };
    globalThis.document = { getElementById: vi.fn(function() { return el; }) };
    updateMessage('Your turn!');
    expect(el.textContent).toBe('Your turn!');
    delete globalThis.document;
  });
});

// ========================================
// updateScoreboard
// ========================================
describe('updateScoreboard', () => {
  test('sets round number and player scores', () => {
    var roundEl = { textContent: '' };
    var playerEl = { textContent: '' };
    var aiEl = { textContent: '' };
    globalThis.document = {
      getElementById: vi.fn(function(id) {
        if (id === 'round-number') return roundEl;
        if (id === 'player-score-display') return playerEl;
        if (id === 'ai-score-display') return aiEl;
        return null;
      })
    };
    updateScoreboard({
      round: 3,
      players: [
        { name: 'Eric', totalScore: 42 },
        { name: 'AI', totalScore: 35 }
      ]
    });
    expect(roundEl.textContent).toBe(3);
    expect(playerEl.textContent).toBe('Eric: 42');
    expect(aiEl.textContent).toBe('AI: 35');
    delete globalThis.document;
  });
});

// ========================================
// updateButtons
// ========================================
describe('updateButtons', () => {
  test('enables and disables buttons by id', () => {
    var btn1 = { disabled: true };
    var btn2 = { disabled: false };
    globalThis.document = {
      getElementById: vi.fn(function(id) {
        if (id === 'btn-draw-deck') return btn1;
        if (id === 'btn-discard') return btn2;
        return null;
      })
    };
    updateButtons({ 'btn-draw-deck': true, 'btn-discard': false });
    expect(btn1.disabled).toBe(false);
    expect(btn2.disabled).toBe(true);
    delete globalThis.document;
  });

  test('handles missing buttons gracefully', () => {
    globalThis.document = {
      getElementById: vi.fn(function() { return null; })
    };
    // Should not throw
    updateButtons({ 'nonexistent': true });
    delete globalThis.document;
  });
});

// ========================================
// showRoundEnd
// ========================================
describe('showRoundEnd', () => {
  var screen, title, scores;

  beforeEach(() => {
    screen = { classList: { add: vi.fn(), remove: vi.fn() } };
    title = { textContent: '' };
    scores = { innerHTML: '' };
    globalThis.document = {
      getElementById: vi.fn(function(id) {
        if (id === 'round-end-screen') return screen;
        if (id === 'round-end-title') return title;
        if (id === 'round-scores') return scores;
        return null;
      })
    };
  });

  afterEach(() => {
    delete globalThis.document;
  });

  test('sets round title', () => {
    showRoundEnd({
      round: 2,
      players: [
        { name: 'Eric', roundScores: [10, 15], totalScore: 25 },
        { name: 'AI', roundScores: [8, 20], totalScore: 28 }
      ],
      firstOutPlayer: null
    });
    expect(title.textContent).toBe('Round 2 Complete!');
  });

  test('shows winner line when player wins round', () => {
    showRoundEnd({
      round: 1,
      players: [
        { name: 'Eric', roundScores: [5], totalScore: 5 },
        { name: 'AI', roundScores: [10], totalScore: 10 }
      ],
      firstOutPlayer: null
    });
    expect(scores.innerHTML).toContain('player-won');
    expect(scores.innerHTML).toContain('Eric wins the round!');
  });

  test('shows winner line when AI wins round', () => {
    showRoundEnd({
      round: 1,
      players: [
        { name: 'Eric', roundScores: [15], totalScore: 15 },
        { name: 'AI', roundScores: [5], totalScore: 5 }
      ],
      firstOutPlayer: null
    });
    expect(scores.innerHTML).toContain('kai-won');
    expect(scores.innerHTML).toContain('Kai wins the round!');
  });

  test('shows tie when scores are equal', () => {
    showRoundEnd({
      round: 1,
      players: [
        { name: 'Eric', roundScores: [10], totalScore: 10 },
        { name: 'AI', roundScores: [10], totalScore: 10 }
      ],
      firstOutPlayer: null
    });
    expect(scores.innerHTML).toContain('tied');
    expect(scores.innerHTML).toContain("It's a tie!");
  });

  test('shows first out player', () => {
    showRoundEnd({
      round: 1,
      players: [
        { name: 'Eric', roundScores: [5], totalScore: 5 },
        { name: 'AI', roundScores: [10], totalScore: 10 }
      ],
      firstOutPlayer: 0
    });
    expect(scores.innerHTML).toContain('Eric went out first.');
  });

  test('shows positive sign for positive scores', () => {
    showRoundEnd({
      round: 1,
      players: [
        { name: 'Eric', roundScores: [5], totalScore: 5 },
        { name: 'AI', roundScores: [10], totalScore: 10 }
      ],
      firstOutPlayer: null
    });
    expect(scores.innerHTML).toContain('+5');
    expect(scores.innerHTML).toContain('+10');
  });

  test('removes hidden class', () => {
    showRoundEnd({
      round: 1,
      players: [
        { name: 'Eric', roundScores: [5], totalScore: 5 },
        { name: 'AI', roundScores: [10], totalScore: 10 }
      ],
      firstOutPlayer: null
    });
    expect(screen.classList.remove).toHaveBeenCalledWith('hidden');
  });
});

// ========================================
// hideRoundEnd
// ========================================
describe('hideRoundEnd', () => {
  test('adds hidden class', () => {
    var screen = { classList: { add: vi.fn() } };
    globalThis.document = { getElementById: vi.fn(function() { return screen; }) };
    hideRoundEnd();
    expect(screen.classList.add).toHaveBeenCalledWith('hidden');
    delete globalThis.document;
  });
});

// ========================================
// showGameOver
// ========================================
describe('showGameOver', () => {
  var screen, title, scores;

  beforeEach(() => {
    screen = { classList: { add: vi.fn(), remove: vi.fn() } };
    title = { textContent: '' };
    scores = { innerHTML: '' };
    globalThis.document = {
      getElementById: vi.fn(function(id) {
        if (id === 'game-over-screen') return screen;
        if (id === 'game-over-title') return title;
        if (id === 'final-scores') return scores;
        return null;
      })
    };
  });

  afterEach(() => {
    delete globalThis.document;
  });

  test('declares winner with lowest score', () => {
    showGameOver({
      players: [
        { name: 'Eric', totalScore: 20, roundScores: [10, 10] },
        { name: 'AI', totalScore: 30, roundScores: [15, 15] }
      ],
      maxRounds: 2
    });
    expect(title.textContent).toBe('Eric Wins!');
  });

  test('shows final scores', () => {
    showGameOver({
      players: [
        { name: 'Eric', totalScore: 20, roundScores: [10, 10] },
        { name: 'AI', totalScore: 30, roundScores: [15, 15] }
      ],
      maxRounds: 2
    });
    expect(scores.innerHTML).toContain('20');
    expect(scores.innerHTML).toContain('30');
  });

  test('shows round-by-round breakdown', () => {
    showGameOver({
      players: [
        { name: 'Eric', totalScore: 20, roundScores: [10, 10] },
        { name: 'AI', totalScore: 30, roundScores: [15, 15] }
      ],
      maxRounds: 2
    });
    expect(scores.innerHTML).toContain('Round-by-Round');
    expect(scores.innerHTML).toContain('Round');
  });

  test('removes hidden class', () => {
    showGameOver({
      players: [
        { name: 'Eric', totalScore: 20, roundScores: [10, 10] },
        { name: 'AI', totalScore: 30, roundScores: [15, 15] }
      ],
      maxRounds: 2
    });
    expect(screen.classList.remove).toHaveBeenCalledWith('hidden');
  });
});

// ========================================
// hideGameOver
// ========================================
describe('hideGameOver', () => {
  test('adds hidden class', () => {
    var screen = { classList: { add: vi.fn() } };
    globalThis.document = { getElementById: vi.fn(function() { return screen; }) };
    hideGameOver();
    expect(screen.classList.add).toHaveBeenCalledWith('hidden');
    delete globalThis.document;
  });
});
