/**
 * Playwright: test the replay system with the lockup game log.
 * Loads the game, injects the log, calls _replayFromLog, watches for lockup.
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const URL = 'http://localhost:8000';
const LOG_PATH = '/Users/elp/Library/Containers/com.apple.mail/Data/Library/Mail Downloads/87E96ECB-55DE-4686-9547-878BD325BF0A/kapow-log (78).txt';

async function main() {
  const logText = readFileSync(LOG_PATH, 'utf-8');
  console.log('Game log loaded (' + logText.split('\n').length + ' lines)');

  const browser = await chromium.launch({ headless: false }); // visible for debugging
  const page = await browser.newPage();

  // Collect console messages
  const logs = [];
  page.on('console', msg => {
    const text = msg.text();
    logs.push(text);
    if (text.startsWith('[Replay]')) console.log(text);
  });

  page.on('pageerror', e => console.log('PAGE ERROR:', e.message));

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 8000 });
  await page.waitForTimeout(500);

  // Check that replay API is available
  const hasReplay = await page.evaluate(() => typeof window._replayFromLog === 'function');
  if (!hasReplay) {
    console.error('ERROR: window._replayFromLog not found — is the ES module build loaded?');
    await browser.close();
    return;
  }
  console.log('Replay API available');

  // Start the replay — stop at turn 18 (the lockup turn), speed 10x
  console.log('Starting replay to T18 at 10x speed...');
  await page.evaluate((log) => {
    window._replayFromLog(log, 18, 10);
  }, logText);

  // Wait for replay to complete (poll for turn 18 or timeout)
  const startTime = Date.now();
  let finalState = null;
  let lockup = false;

  for (let i = 0; i < 300; i++) { // max 60 seconds
    await page.waitForTimeout(200);

    const state = await page.evaluate(() => {
      var s = window._getReplayState ? window._getReplayState() : null;
      var msg = (document.getElementById('game-message') || {}).textContent || '';
      return s ? { ...s, message: msg } : null;
    });

    if (!state) continue;

    // Check if we've reached turn 18
    if (state.turnNumber >= 18) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\nReached turn ${state.turnNumber} in ${elapsed}s`);
      console.log(`  Phase: ${state.phase}`);
      console.log(`  Current player: ${state.currentPlayer} (isHuman: ${state.isHumanTurn})`);
      console.log(`  AI turn in progress: ${state.aiTurnInProgress}`);
      console.log(`  Triad animation in progress: ${state.triadAnimationInProgress}`);
      console.log(`  Message: "${state.message}"`);

      // Wait a few seconds to see if AI acts
      console.log('\nWaiting 8s to see if AI turn fires...');
      await page.waitForTimeout(8000);

      finalState = await page.evaluate(() => {
        var s = window._getReplayState();
        var msg = (document.getElementById('game-message') || {}).textContent || '';
        return s ? { ...s, message: msg } : null;
      });

      console.log(`\nAfter waiting:`);
      console.log(`  Turn: ${finalState.turnNumber}`);
      console.log(`  Phase: ${finalState.phase}`);
      console.log(`  Current player: ${finalState.currentPlayer} (isHuman: ${finalState.isHumanTurn})`);
      console.log(`  AI turn in progress: ${finalState.aiTurnInProgress}`);
      console.log(`  Message: "${finalState.message}"`);

      if (finalState.turnNumber === 18 && !finalState.isHumanTurn && !finalState.aiTurnInProgress) {
        lockup = true;
        console.log('\n*** LOCKUP CONFIRMED: AI turn never started at T18 ***');
      } else if (finalState.turnNumber > 18) {
        console.log('\n*** NO LOCKUP: Game progressed past T18 ***');
      } else if (finalState.aiTurnInProgress) {
        console.log('\n*** AI turn IS in progress (might just be slow) ***');
      }
      break;
    }

    // Progress indicator every 5 seconds
    if (i > 0 && i % 25 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`  ... T${state.turnNumber} (${elapsed}s) msg="${state.message.substring(0, 50)}"`);
    }
  }

  if (!finalState) {
    console.log('TIMEOUT: Never reached T18');
  }

  // Print replay console logs
  const replayLogs = logs.filter(l => l.startsWith('[Replay]'));
  if (replayLogs.length > 0) {
    console.log('\n--- Replay logs ---');
    replayLogs.forEach(l => console.log(l));
  }

  // Keep browser open for manual inspection
  console.log('\nBrowser left open for inspection. Press Ctrl+C to close.');
  await new Promise(() => {}); // hang forever
}

main().catch(e => { console.error(e); process.exit(1); });
