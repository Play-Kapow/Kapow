# ES Module Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate KAPOW! from a single 5,858-line IIFE (`kapow.js`) to ES modules, eliminating dual-maintenance and preparing the codebase for store launch features (Stripe, product page, etc.).

**Architecture:** The game currently runs entirely from `kapow.js` (IIFE loaded via `<script>`). ES module files exist but are only used by tests. This plan ports all remaining kapow.js functionality into the ES modules, wires `index.html` to load `main.js` as the entry point, then deletes `kapow.js`. Each phase leaves the game in a working state.

**Tech Stack:** Vanilla JS (ES modules), Vitest, GitHub Pages (no build step)

**Branch:** `es-module-migration` off `beta`

**Key constraint:** Zero regression. The game must play identically before and after. All 169 tests must pass at every commit.

---

## Context

### What runs today
```
index.html
  ├── <script src="js/sound.js">      ← IIFE, KapowSounds global
  ├── <script src="js/telemetry.js">   ← IIFE, KapowTelemetry global
  └── <script src="js/kapow.js">       ← IIFE, ALL game logic (~5,858 lines)
```

### What exists but is never loaded
```
js/main.js        ← 316 lines, simplified game loop
js/gameState.js   ← 336 lines, state machine
js/ai.js          ← 851 lines, core AI decisions
js/hand.js        ← 189 lines, hand operations
js/deck.js        ← 138 lines, deck operations
js/triad.js       ← 184 lines, completion detection
js/rules.js       ← 140 lines, move validation
js/scoring.js     ← 97 lines, score calculation
js/ui.js          ← 300 lines, basic rendering
```

### What's missing from the ES modules (~3,500 lines)

| Category | Approx lines | Target module |
|----------|-------------|---------------|
| AI scoring (`aiScorePlacement` + helpers) | ~1,500 | `ai.js` |
| AI turn orchestration (step functions) | ~400 | `main.js` |
| AI explanation + banter | ~280 | `aiExplanation.js` (new) |
| Animation system | ~150 | `animation.js` (new) |
| Full rendering (cards, scorecard, piles) | ~200 | `ui.js` |
| Game flow handlers (with logging, animation) | ~300 | `gameState.js` + `main.js` |
| Logging + game history | ~100 | `logging.js` (new) |
| Modal system (power card, KAPOW choices) | ~150 | `modals.js` (new) |
| Index.html inline JS (leaderboard, share, etc.) | ~300 | `shell.js` (new) |
| Utility functions | ~50 | Various |

---

## Phase 1: Port missing game logic to ES modules

> kapow.js still runs the game during this phase. We're building the replacement alongside it.

### Task 1.1: Port AI evaluation functions to ai.js

**Files:**
- Modify: `js/ai.js`
- Reference: `js/kapow.js` (lines 1971-3858)
- Test: `tests/ai.test.js`

These functions exist only in kapow.js and must be ported to ai.js:

- `aiScorePlacement()` (~964 lines) — the core AI brain
- `aiAnalyzeTriad()` — triad completion path analysis
- `aiEvaluateHand()` — full hand evaluation
- `aiEstimateOpponentScore()` — opponent score estimation
- `aiGetGameContext()` — game phase context
- `aiAssessOpponentThreat()` — opponent threat modeling
- `aiCountFutureCompletions()` — forward-looking triad analysis
- `aiCountPowerModifierPaths()` — power card modifier analysis
- `getTestRange()` — helper for run detection range
- `aiEvaluateCardSynergy()` — card synergy evaluation
- `aiGetOpponentNeeds()` — what opponent triads need
- `aiGetTopDiscardValue()` — discard pile analysis
- `aiFindPowersetOpportunity()` — power card stacking opportunity
- `aiFindModifierOpportunity()` — modifier card analysis
- `aiFindBeneficialSwap()` — KAPOW swap analysis

**Step 1:** Copy each function from kapow.js into ai.js, converting from IIFE-internal to exported ES module functions. Preserve exact logic — no refactoring.

**Step 2:** Add `export` to each new function.

**Step 3:** Write tests for the major functions (aiScorePlacement, aiAnalyzeTriad, aiAssessOpponentThreat). Test against known game states to verify identical behavior to kapow.js.

**Step 4:** Run `npm test`, verify all tests pass (existing 169 + new).

**Step 5:** Commit: `feat(ai): port evaluation functions from kapow.js to ES module`

---

### Task 1.2: Create aiExplanation.js — banter + move explanation

**Files:**
- Create: `js/aiExplanation.js`
- Reference: `js/kapow.js` (lines 12-147, 1413-1690)

Port these functions:
- `AI_BANTER` constant (dialogue strings, ~125 lines)
- `generateAIBanter(state, scenario)` — contextual move descriptions
- `clearAIBanter()` — reset banter state
- `buildAiExplanation(state, moveData)` (~226 lines) — "Understand Kai's Move" modal content
- `generateTakeawayTip(state)` (~46 lines) — game tips

**Step 1:** Create `js/aiExplanation.js` with all functions as named exports.

**Step 2:** Create `tests/aiExplanation.test.js` with basic tests (banter generation returns strings, explanation builds valid HTML).

**Step 3:** Run tests, verify pass.

**Step 4:** Commit: `feat(ai): add explanation and banter module`

---

### Task 1.3: Create animation.js

**Files:**
- Create: `js/animation.js`
- Reference: `js/kapow.js` (lines 3972-4083)

Port these functions:
- `animateTriadDiscard(triadEl)` — flip + shrink animation on triad completion
- `animateNewlyDiscardedTriads(hand, containerId, previousTriads)` — detects which triads just completed
- `runWithTriadAnimation(callback, beforeState, afterState)` — orchestrates: run callback, then animate changes

**Step 1:** Create module with exports.

**Step 2:** Write tests for detection logic (which triads changed). Animation timing is not unit-testable but detection logic is.

**Step 3:** Commit: `feat(ui): add animation module`

---

### Task 1.4: Create logging.js

**Files:**
- Create: `js/logging.js`
- Reference: `js/kapow.js` (lines 626-680, 5324-5350)

Port:
- `logAction(state, player, action, details)` — appends to action log array
- `logSystem(state, message)` — system event log
- `logHandState(state, playerIndex)` — snapshots triad state
- `exportLog(state)` — returns formatted text log
- `saveGameToHistory(state)` — persists completed game to localStorage
- `getGameHistory()` — retrieves saved games array

**Step 1:** Create module with exports.

**Step 2:** Write tests for log formatting and history save/load (mock localStorage).

**Step 3:** Commit: `feat: add logging and game history module`

---

### Task 1.5: Create modals.js

**Files:**
- Create: `js/modals.js`
- Reference: `js/kapow.js` (lines 4847+, power card modal creation)

Port:
- `showPowerCardModal(card, hand, onChoice)` — modal for choosing which modifier to apply
- `showKapowPlacementModal(hand, onChoice)` — modal for KAPOW card assignment
- Any helper functions for modal creation/destruction

**Step 1:** Create module with exports.

**Step 2:** Tests are DOM-dependent; write smoke tests that verify modal element creation.

**Step 3:** Commit: `feat(ui): add modal system module`

---

### Task 1.6: Enhance ui.js with full rendering

**Files:**
- Modify: `js/ui.js`
- Reference: `js/kapow.js` (lines 4123-4374)

The current ui.js has basic rendering. Enhance with kapow.js's full versions:
- `renderCardHTML()` — full card rendering with power stacks, frozen state, drawn-from indicator
- `renderPowersetInfo()` — powerset tooltip/display
- `renderHand()` — full version with clickable positions, animation classes, completion glow
- `renderDiscardPile()` — with drawn-from state tracking
- `renderScorecard()` — sidebar with round-by-round breakdown
- `renderDrawPile()` — draw pile count + state

**Step 1:** Compare kapow.js rendering functions with ui.js versions. Identify every difference.

**Step 2:** Update ui.js functions to match kapow.js behavior exactly. Add missing functions.

**Step 3:** Update any existing ui.js tests if signatures changed.

**Step 4:** Commit: `feat(ui): enhance rendering to match full kapow.js implementation`

---

### Task 1.7: Enhance main.js with full game loop

**Files:**
- Modify: `js/main.js`
- Reference: `js/kapow.js` (lines 4380-5360, 5396-5853)

This is the biggest integration task. main.js needs to become the full game controller:

- `init()` — full initialization (name screen, tutorial detection, telemetry consent)
- `startGameWithName(name)` — name entry handler
- `bindGameEvents()` — all event listeners (cards, buttons, keyboard)
- `refreshUI()` — full version with animation state, AI banter, hint availability
- `getClickablePositions()` — full version with KAPOW swap, powerset, within-triad swap
- `playAITurn()` — full step-by-step orchestration (aiStepReveal, aiStepDraw, aiStepPlace, aiStepWithinTriadSwap, aiStepCheckSwap) with delays between steps
- `onEndTurn()` — with go-out logic
- `onHint()` / `generateHint()` — hint system
- `onUnderstandMove()` / `onCloseExplain()` — AI explanation modal
- `resetTutorial()` — tutorial reset
- `showRoundEnd()` / `showGameOver()` — full versions with stats, sharing, leaderboard prompt

Import from the new modules: `aiExplanation.js`, `animation.js`, `logging.js`, `modals.js`.

**Step 1:** Map every function in kapow.js's game loop (lines 4380-5853) to its main.js equivalent. Note differences.

**Step 2:** Incrementally enhance main.js. Keep the module's export surface small — most functions are internal.

**Step 3:** No new tests for DOM event handlers (not unit-testable), but verify existing gameState/AI tests still pass.

**Step 4:** Commit: `feat: enhance main.js to full game controller`

---

### Task 1.8: Enhance gameState.js with logging + animation hooks

**Files:**
- Modify: `js/gameState.js`
- Reference: `js/kapow.js` (lines 708-1305)

The kapow.js game flow handlers have logging and animation calls that gameState.js lacks. Add optional callback hooks:

- `checkAndDiscardTriads()` — needs animation trigger
- `advanceToNextPlayer()` — needs banter trigger
- `endRound()` — needs logging
- `handlePlaceCard()` — needs powerset/KAPOW modal integration

**Important:** Keep gameState.js functions pure where possible. Use return values or callback parameters rather than importing UI modules directly.

**Step 1:** Add return values that indicate "triads were discarded" or "powerset choice needed" so main.js can trigger animations/modals.

**Step 2:** Run existing gameState tests — they must pass unchanged.

**Step 3:** Commit: `feat(gameState): add hooks for animation and logging`

---

## Phase 2: Convert IIFEs to ES modules

### Task 2.1: Convert sound.js

**Files:**
- Modify: `js/sound.js`

**Step 1:** Convert from IIFE to named exports:
```js
// Before: var KapowSounds = (function() { ... })();
// After:  export const KapowSounds = { init, toggleMute, cardFlip, ... };
```

Keep the lazy AudioContext initialization pattern (browser requirement).

**Step 2:** In main.js, import and assign to window for HTML onclick handlers:
```js
import { KapowSounds } from './sound.js';
window.KapowSounds = KapowSounds;
```

**Step 3:** Commit: `refactor(sound): convert IIFE to ES module`

---

### Task 2.2: Convert telemetry.js

**Files:**
- Modify: `js/telemetry.js`

**Step 1:** Convert IIFE to named exports. Also convert the 3 standalone functions (`prepareFeedback`, `showFeedbackModal`, `hideFeedbackModal`).

**Step 2:** In main.js, import and assign to window for HTML onclick/onsubmit handlers.

**Step 3:** Commit: `refactor(telemetry): convert IIFE to ES module`

---

## Phase 3: Extract index.html inline JavaScript

### Task 3.1: Create shell.js

**Files:**
- Create: `js/shell.js`
- Modify: `index.html`

Move all inline `<script>` functions from index.html into `js/shell.js`:

**From Block 1 (GA4):**
- `trackEvent(name, params)`

**From Block 2 (Help):**
- `showHelpTab(tabName, btn)`

**From Block 3 (Game UI, ~300 lines):**
- `showBuyModal()`, `hideBuyModal()`
- `showLeaderboard()`, `hideLeaderboard()`, `hideLeaderboardSubmit()`
- `fetchLeaderboard()`, `renderLeaderboardRows(entries)`, `escapeHtml(str)`
- `promptLeaderboardSubmit()`, `confirmLeaderboardSubmit()`
- `addGameNote()`, `saveNote(input, wrap)`, `renderGameNotes()`
- `shareGameResults()`, `fallbackCopy(text)`, `showToast(msg)`
- `togglePrivacy(btn)`
- `closeSidebar(e)`

**Step 1:** Create `js/shell.js` as ES module. Export all functions.

**Step 2:** In main.js (or shell.js itself), assign all functions to `window.*` so existing HTML onclick handlers continue to work.

**Step 3:** Replace all `<script>` blocks in index.html with a single:
```html
<script type="module" src="js/main.js"></script>
```

**Step 4:** Verify index.html drops from ~812 lines to ~500 lines (pure markup + GA4 snippet).

**Step 5:** Commit: `refactor(html): extract inline JS to shell.js module`

---

## Phase 4: The Switch

### Task 4.1: Wire index.html to ES modules

**Files:**
- Modify: `index.html`

**Step 1:** Replace:
```html
<script src="js/sound.js"></script>
<script src="js/telemetry.js"></script>
<script src="js/kapow.js"></script>
```
With:
```html
<script type="module" src="js/main.js"></script>
```

main.js imports everything: sound, telemetry, shell, game logic.

**Step 2:** Ensure main.js assigns all needed globals to `window.*`:
- `window.KapowSounds` — for mute button onclick
- `window.KapowTelemetry` — for privacy toggle onclick
- All shell.js functions — for HTML onclick handlers
- `window.gameState` — for telemetry and shell.js access
- `window.resetTutorial` — for help modal button

**Step 3:** Run `python3 -m http.server 8000` and test in browser:
- [ ] Game loads without console errors
- [ ] Name screen works
- [ ] Cards render correctly
- [ ] Player can draw, place, discard
- [ ] AI takes turns with delays
- [ ] Triad completion animates
- [ ] Sound effects play
- [ ] "Understand Kai's Move" shows explanation
- [ ] Hint button works
- [ ] Round end screen shows scores
- [ ] Game over screen shows full scorecard
- [ ] Leaderboard loads
- [ ] Share button works
- [ ] Mute button works
- [ ] Tutorial triggers on first game
- [ ] PWA service worker still registers

**Step 4:** Run `npm test` — all 169+ tests pass.

**Step 5:** Commit: `feat: wire index.html to ES modules, kapow.js no longer loaded`

---

## Phase 5: Cleanup

### Task 5.1: Delete kapow.js

**Files:**
- Delete: `js/kapow.js`

**Step 1:** `git rm js/kapow.js`

**Step 2:** Run tests.

**Step 3:** Commit: `chore: remove kapow.js IIFE (fully replaced by ES modules)`

---

### Task 5.2: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

Update the architecture section to reflect the new module structure. Remove "update both kapow.js and the corresponding modular file" guidance. Update the architecture table to show what each module does. Remove Common Mistake #2 (dual maintenance).

**Step 1:** Rewrite Architecture section.

**Step 2:** Commit: `docs: update CLAUDE.md for ES module architecture`

---

### Task 5.3: Add JSDoc types to core modules

**Files:**
- Modify: `js/deck.js`, `js/hand.js`, `js/triad.js`, `js/scoring.js`, `js/rules.js`, `js/gameState.js`

Add `@typedef` for core types and `@param`/`@returns` for exported functions:

```js
/**
 * @typedef {Object} Card
 * @property {'fixed'|'power'|'kapow'} type
 * @property {number} faceValue
 * @property {boolean} isRevealed
 * @property {boolean} isFrozen
 * @property {number|null} assignedValue
 * @property {number[]|undefined} modifiers - Only on power cards
 */

/**
 * @typedef {Object} Triad
 * @property {Card[][]} top
 * @property {Card[][]} middle
 * @property {Card[][]} bottom
 * @property {boolean} isDiscarded
 */
```

**Step 1:** Add typedefs to `deck.js` (Card, Deck types used everywhere).

**Step 2:** Add `@param`/`@returns` to all exported functions in core modules.

**Step 3:** Run tests — types are comments, nothing breaks.

**Step 4:** Commit: `docs: add JSDoc types to core game modules`

---

## Execution Notes

### For each task:
1. Read the referenced kapow.js lines carefully before porting
2. Copy logic exactly — zero refactoring during migration
3. Run `npm test` after every change
4. Keep CHANGELOG.md updated (hook enforces this)
5. One commit per task

### After completing all tasks:
1. Verify branch deploys correctly (GitHub Pages builds branch previews)
2. Test on mobile (iPhone Safari, add to home screen)
3. Create PR: `es-module-migration` → `beta` for review
4. After merge to beta, test at playkapow.com/beta

### New file structure after migration:
```
js/
├── main.js            ← Entry point (game loop, events, AI orchestration)
├── gameState.js       ← State machine (pure logic + hooks)
├── ai.js              ← All AI decisions + evaluation (~2,500 lines)
├── aiExplanation.js   ← Banter + "Understand Kai's Move"
├── deck.js            ← Card/deck operations
├── hand.js            ← Hand operations
├── triad.js           ← Completion detection
├── scoring.js         ← Score calculation
├── rules.js           ← Move validation
├── ui.js              ← DOM rendering
├── animation.js       ← Visual feedback (flip, shake, glow)
├── modals.js          ← Power card/KAPOW choice modals
├── logging.js         ← Action log + game history
├── sound.js           ← Web Audio synthesis (ES module)
├── telemetry.js       ← Analytics + consent (ES module)
└── shell.js           ← Leaderboard, share, buy funnel, notes
```

### What this enables (future):
- **No more dual maintenance** — one source of truth
- **Stripe integration** — shell.js is the natural home for payment flow
- **Product page** — buy/index.html can import shared modules
- **New game features** — each module is independently testable
- **Multiplayer (someday)** — game engine (gameState, deck, hand, triad, scoring, rules) has zero DOM deps
