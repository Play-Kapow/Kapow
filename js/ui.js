// ========================================
// KAPOW! - UI Rendering & Interaction
// ========================================

import { getPositionValue } from './hand.js';

/**
 * Render a single card as an HTML string.
 * Matches kapow.js renderCardHTML exactly.
 */
export function renderCardHTML(card, faceDown, clickable, powersetValue) {
  var classes = 'card';
  if (clickable) classes += ' clickable';

  if (faceDown || !card.isRevealed) {
    classes += ' card-back';
    return '<div class="' + classes + '">' +
      '<div class="card-back-inner"><span class="card-back-text">KAPOW!</span></div></div>';
  }

  if (card.type === 'fixed') {
    classes += ' card-fixed';
    var hasPowerset = powersetValue !== undefined && powersetValue !== null;
    var typeLabel = hasPowerset ? 'Powerset' : 'Fixed';
    var html = '<div class="' + classes + (hasPowerset ? ' has-powerset' : '') + '">' +
      '<span class="card-type-label">' + typeLabel + '</span>' +
      '<span class="card-value-center">' + card.faceValue + '</span>';

    if (hasPowerset) {
      html += '<span class="powerset-total">' + powersetValue + '</span>';
    }

    html += '</div>';
    return html;
  }

  if (card.type === 'power') {
    classes += ' card-power';
    var hasPowerset = powersetValue !== undefined && powersetValue !== null;
    var html = '<div class="' + classes + (hasPowerset ? ' has-powerset' : '') + '">' +
      '<div class="card-power-header">';

    if (hasPowerset) {
      html += '<span class="card-type-label">Powerset</span>';
    } else {
      html += '<span class="card-type-label">Power</span>';
    }

    html += '</div>' +
      '<div class="card-power-face-row">' +
      '<span class="power-sign power-sign-minus">&minus;</span>' +
      '<span class="card-power-face-value">' + card.faceValue + '</span>' +
      '<span class="power-sign power-sign-plus">+</span>' +
      '</div>';

    if (hasPowerset) {
      html += '<span class="powerset-total">' + powersetValue + '</span>';
    }

    html += '</div>';
    return html;
  }

  if (card.type === 'kapow') {
    classes += ' card-kapow';
    var valueText = 'Wild (0-12)';
    return '<div class="' + classes + '">' +
      '<span class="kapow-text">KAPOW!</span>' +
      '<span class="kapow-value">' + valueText + '</span></div>';
  }

  return '<div class="' + classes + '">?</div>';
}

/**
 * Render powerset info (modifier details + effective value) beneath a card stack.
 * Matches kapow.js renderPowersetInfo exactly.
 */
export function renderPowersetInfo(positionCards) {
  // Show the combined effective value and modifier details beneath the card
  var effectiveValue = getPositionValue(positionCards);
  var modifierText = '';
  for (var i = 1; i < positionCards.length; i++) {
    var mod = positionCards[i];
    if (mod.type === 'power' && mod.activeModifier != null) {
      modifierText += (mod.activeModifier >= 0 ? '+' : '') + mod.activeModifier;
      if (i < positionCards.length - 1) modifierText += ', ';
    }
  }
  return '<div class="powerset-info">' +
    '<span class="powerset-modifier">' + modifierText + '</span>' +
    '<span class="powerset-effective">' + effectiveValue + '</span>' +
    '</div>';
}

/**
 * Render a player's hand into a container element.
 * Matches kapow.js renderHand exactly.
 */
export function renderHand(hand, containerId, isOpponent, clickablePositions, onClickAttr, highlight) {
  var container = document.getElementById(containerId);
  var html = '';

  for (var t = 0; t < hand.triads.length; t++) {
    var triad = hand.triads[t];

    // Skip discarded triads - they are visibly removed from the hand
    if (triad.isDiscarded) {
      var discardedPositions = isOpponent ? ['bottom', 'middle', 'top'] : ['top', 'middle', 'bottom'];
      var discardLabels = { top: 'Top', middle: 'Mid', bottom: 'Bot' };
      html += '<div class="triad-column discarded-triad">';
      html += '<div class="triad-label">Triad ' + (t + 1) + '</div>';
      for (var dp = 0; dp < discardedPositions.length; dp++) {
        html += '<div class="position-slot empty-slot"><span class="pos-label">' + discardLabels[discardedPositions[dp]] + '</span></div>';
      }
      html += '</div>';
      continue;
    }

    html += '<div class="triad-column">';
    html += '<div class="triad-label">Triad ' + (t + 1) + '</div>';

    // For the AI hand (opponent), reverse render order so "top" position (closest to
    // center of table) appears at the bottom of the column, nearest the center strip.
    // Both players see "top" = closest to center, matching physical card game layout.
    var positions = isOpponent ? ['bottom', 'middle', 'top'] : ['top', 'middle', 'bottom'];
    var posLabels = { top: 'Top', middle: 'Mid', bottom: 'Bot' };
    for (var p = 0; p < positions.length; p++) {
      var pos = positions[p];

      // Check if this position should be highlighted (AI actions or KAPOW swap selection)
      var hlClass = '';
      if (highlight && highlight.triadIndex === t && highlight.position === pos) {
        if (highlight.type === 'place') hlClass = ' ai-place-highlight';
        else if (highlight.type === 'reveal') hlClass = ' ai-reveal-highlight';
        else if (highlight.type === 'kapow-selected') hlClass = ' kapow-selected-highlight';
      }
      html += '<div class="position-slot' + hlClass + '">';
      html += '<span class="pos-label">' + posLabels[pos] + '</span>';

      if (triad[pos].length > 0) {
        var isClickable = false;
        if (clickablePositions) {
          for (var c = 0; c < clickablePositions.length; c++) {
            if (clickablePositions[c].triadIndex === t && clickablePositions[c].position === pos) {
              isClickable = true;
              break;
            }
          }
        }

        var card = triad[pos][0];
        var faceDown = isOpponent && !card.isRevealed;
        var hasPowerset = triad[pos].length > 1 && card.isRevealed;

        // Calculate powerset value if it exists (to display on card)
        var powersetValue = null;
        if (hasPowerset) {
          powersetValue = getPositionValue(triad[pos]);
        }

        // Wrap in clickable div if needed
        if (isClickable && onClickAttr) {
          html += '<div onclick="' + onClickAttr + '(' + t + ',\'' + pos + '\')">';
          html += renderCardHTML(card, faceDown, true, powersetValue);
          html += '</div>';
        } else {
          html += renderCardHTML(card, faceDown, false, powersetValue);
        }
      }

      html += '</div>';
    }

    html += '</div>';
  }

  container.innerHTML = html;
}

/**
 * Render the discard pile top card.
 * Matches kapow.js renderDiscardPile exactly.
 */
export function renderDiscardPile(discardPile, drawnCard, drawnFromDiscard) {
  var container = document.getElementById('discard-top');
  if (!container) return;

  container.innerHTML = '';
  container.className = 'card';

  // If the player just drew from discard, show that card still on top
  var topCard = (drawnCard && drawnFromDiscard) ? drawnCard : discardPile[discardPile.length - 1];

  if (!topCard) {
    container.classList.add('empty-pile');
    container.innerHTML = '<span>Empty</span>';
    return;
  }

  if (topCard.type === 'fixed') {
    container.classList.add('card-fixed');
    container.innerHTML =
      '<span class="card-type-label">Fixed</span>' +
      '<span class="card-value-center">' + topCard.faceValue + '</span>';
  } else if (topCard.type === 'power') {
    container.classList.add('card-power');
    container.innerHTML =
      '<div class="card-power-header">' +
      '<span class="card-type-label">Power</span></div>' +
      '<div class="card-power-face-row">' +
      '<span class="power-sign power-sign-minus">&minus;</span>' +
      '<span class="card-power-face-value">' + topCard.faceValue + '</span>' +
      '<span class="power-sign power-sign-plus">+</span></div>';
  } else if (topCard.type === 'kapow') {
    container.classList.add('card-kapow');
    container.innerHTML =
      '<span class="kapow-text">KAPOW!</span>' +
      '<span class="kapow-value">Wild (0-12)</span>';
  }
}

/**
 * Render the drawn card display.
 */
export function renderDrawnCard(card) {
  var area = document.getElementById('drawn-card-area');
  var display = document.getElementById('drawn-card-display');

  if (!card) {
    area.classList.add('hidden');
    display.innerHTML = '';
    return;
  }

  area.classList.remove('hidden');
  display.innerHTML = renderCardHTML(card, false, false);
}

/**
 * Render the draw pile state.
 * Matches kapow.js renderDrawPile exactly.
 */
export function renderDrawPile(state) {
  var container = document.getElementById('draw-top');
  if (!container) return;

  if (state.drawnCard && !state.drawnFromDiscard) {
    // Show the drawn card face-up and highlighted on the draw pile
    container.innerHTML = renderCardHTML(state.drawnCard, false, false);
    container.classList.add('drawn-highlight');
  } else {
    container.innerHTML = '<div class="card card-back"><div class="card-back-inner"><span class="card-back-text">KAPOW!</span></div></div>';
    container.classList.remove('drawn-highlight');
  }
}

/**
 * Update the draw pile count display.
 */
export function updateDrawPileCount(count) {
  document.getElementById('draw-count').textContent = '(' + count + ' cards)';
}

/**
 * Update the game message display.
 */
export function updateMessage(message) {
  document.getElementById('game-message').textContent = message;
}

/**
 * Update the scoreboard.
 */
export function updateScoreboard(state) {
  document.getElementById('round-number').textContent = state.round;
  document.getElementById('player-score-display').textContent =
    state.players[0].name + ': ' + state.players[0].totalScore;
  document.getElementById('ai-score-display').textContent =
    state.players[1].name + ': ' + state.players[1].totalScore;
}

/**
 * Enable/disable action buttons.
 */
export function updateButtons(buttons) {
  for (var id in buttons) {
    if (buttons.hasOwnProperty(id)) {
      var btn = document.getElementById(id);
      if (btn) btn.disabled = !buttons[id];
    }
  }
}

/**
 * Render the scorecard sidebar with round-by-round breakdown.
 * Matches kapow.js renderScorecard exactly.
 */
export function renderScorecard(state) {
  var tbody = document.getElementById('scorecard-body');
  if (!tbody) return;
  var rows = tbody.getElementsByTagName('tr');

  for (var r = 0; r < rows.length; r++) {
    var cells = rows[r].getElementsByTagName('td');
    var roundNum = r + 1;

    // Highlight current round
    if (roundNum === state.round && state.phase !== 'gameOver') {
      rows[r].className = 'current-round';
    } else if (roundNum < state.round || state.phase === 'gameOver') {
      rows[r].className = 'completed-round';
    } else {
      rows[r].className = '';
    }

    // Fill in scores
    if (state.players[0].roundScores[r] != null) {
      cells[1].textContent = state.players[0].roundScores[r];
      cells[2].textContent = state.players[1].roundScores[r];
    } else {
      cells[1].textContent = '-';
      cells[2].textContent = '-';
    }
  }

  // Update totals
  document.getElementById('sc-player-total').innerHTML = '<strong>' + state.players[0].totalScore + '</strong>';
  document.getElementById('sc-ai-total').innerHTML = '<strong>' + state.players[1].totalScore + '</strong>';
}

/**
 * Show the round end screen.
 * Matches kapow.js showRoundEnd exactly.
 */
export function showRoundEnd(state) {
  var screen = document.getElementById('round-end-screen');
  var title = document.getElementById('round-end-title');
  var scores = document.getElementById('round-scores');

  title.textContent = 'Round ' + state.round + ' Complete!';

  // Determine round winner
  var playerScore = state.players[0].roundScores[state.players[0].roundScores.length - 1];
  var aiScore = state.players[1].roundScores[state.players[1].roundScores.length - 1];
  var winnerLine = '';
  if (playerScore < aiScore) {
    winnerLine = '<div class="round-winner-line player-won">' + state.players[0].name + ' wins the round!</div>';
  } else if (aiScore < playerScore) {
    winnerLine = '<div class="round-winner-line kai-won">Kai wins the round!</div>';
  } else {
    winnerLine = '<div class="round-winner-line tied">It\'s a tie!</div>';
  }

  var html = winnerLine;
  html += '<table style="margin: 0 auto; text-align: left;">';
  for (var i = 0; i < state.players.length; i++) {
    var player = state.players[i];
    var roundScore = player.roundScores[player.roundScores.length - 1];
    html += '<tr><td style="padding: 4px 12px; font-weight: bold;">' + player.name + '</td>' +
      '<td style="padding: 4px 12px;">Round: ' + (roundScore >= 0 ? '+' : '') + roundScore + '</td>' +
      '<td style="padding: 4px 12px;">Total: ' + player.totalScore + '</td></tr>';
  }
  html += '</table>';

  if (state.firstOutPlayer !== null) {
    html += '<p style="margin-top: 12px; font-size: 14px; opacity: 0.8;">' +
      state.players[state.firstOutPlayer].name + ' went out first.</p>';
  }

  scores.innerHTML = html;
  screen.classList.remove('hidden');
}

/**
 * Hide the round end screen.
 */
export function hideRoundEnd() {
  document.getElementById('round-end-screen').classList.add('hidden');
}

/**
 * Show the game over screen.
 * Matches kapow.js showGameOver exactly.
 */
export function showGameOver(state) {
  var screen = document.getElementById('game-over-screen');
  var title = document.getElementById('game-over-title');
  var scores = document.getElementById('final-scores');

  var winnerIndex = 0;
  for (var i = 0; i < state.players.length; i++) {
    if (state.players[i].totalScore < state.players[winnerIndex].totalScore) winnerIndex = i;
  }

  title.textContent = state.players[winnerIndex].name + ' Wins!';

  var html = '<table style="margin: 0 auto; text-align: left;">';
  for (var i = 0; i < state.players.length; i++) {
    html += '<tr><td style="padding: 4px 12px; font-weight: bold;">' + state.players[i].name + '</td>' +
      '<td style="padding: 4px 12px;">Final Score: ' + state.players[i].totalScore + '</td></tr>';
  }
  html += '</table>';

  html += '<h3 style="margin-top: 16px;">Round-by-Round:</h3>';
  html += '<table style="margin: 0 auto; text-align: center; font-size: 14px;">';
  html += '<tr><th style="padding: 2px 8px;">Round</th>';
  for (var i = 0; i < state.players.length; i++) {
    html += '<th style="padding: 2px 8px;">' + state.players[i].name + '</th>';
  }
  html += '</tr>';
  for (var r = 0; r < state.maxRounds; r++) {
    html += '<tr><td style="padding: 2px 8px;">' + (r + 1) + '</td>';
    for (var i = 0; i < state.players.length; i++) {
      var score = state.players[i].roundScores[r] != null ? state.players[i].roundScores[r] : '-';
      html += '<td style="padding: 2px 8px;">' + score + '</td>';
    }
    html += '</tr>';
  }
  html += '</table>';

  scores.innerHTML = html;
  screen.classList.remove('hidden');
}

/**
 * Hide the game over screen.
 */
export function hideGameOver() {
  document.getElementById('game-over-screen').classList.add('hidden');
}
