/**
 * Playwright: play automated games, detect AI lockup.
 * Lockup = "AI's turn. Draw a card." persists >5s (playAITurn never fires).
 */
import { chromium } from 'playwright';

const OLD_URL = 'http://localhost:8001';
const NEW_URL = 'http://localhost:8000';
const TICK_MS = 400;

async function playGame(label, url) {
  const t0 = Date.now();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 8000 });
  await page.waitForTimeout(300);
  await page.fill('#player-name-input', 'Mindy');
  await page.click('#btn-start-game');
  await page.waitForTimeout(1000);

  // Catch silent setTimeout errors
  await page.evaluate(() => {
    window._stErrors = [];
    const _st = window.setTimeout;
    window.setTimeout = function(fn, d) {
      if (typeof fn !== 'function') return _st.call(window, fn, d);
      return _st.call(window, function() {
        try { fn(); } catch(e) {
          window._stErrors.push(e.message + ' @ ' + (e.stack||'').split('\n').slice(0,2).join(' '));
          console.error('CAUGHT:', e);
        }
      }, d);
    };
  });

  const getMsg = () => page.evaluate(() =>
    (document.getElementById('game-message') || {}).textContent || ''
  );
  const getClickable = () => page.evaluate(() =>
    document.querySelectorAll('#player-hand [onclick]').length
  );
  const clickFirstClickable = () => page.evaluate(() => {
    const els = document.querySelectorAll('#player-hand [onclick]');
    if (els.length) { els[Math.floor(Math.random() * els.length)].click(); return true; }
    return false;
  });
  const dismissModal = () => page.evaluate(() => {
    const o = document.querySelector('.modal-overlay:not(.hidden)');
    if (!o) return false;
    const b = o.querySelectorAll('button');
    if (b.length) { b[b.length - 1].click(); return true; }
    return false;
  });
  const clickBtn = (text) => page.evaluate((t) => {
    for (const b of document.querySelectorAll('button')) {
      if (b.textContent.includes(t) && b.offsetParent !== null) { b.click(); return true; }
    }
    return false;
  }, text);

  let humanTurns = 0;
  let lockup = false;
  let aiStuckSince = 0; // timestamp when "AI's turn. Draw a card." first seen

  for (let tick = 0; tick < 500; tick++) {
    const msg = await getMsg();
    const elapsed = ((Date.now() - t0) / 1000).toFixed(0);

    // Game over
    if (msg.includes('wins') || msg.includes('Game Over')) {
      console.log(`  ${label}: DONE in ${elapsed}s, ${humanTurns} turns`);
      break;
    }

    // Round end screen
    const roundEnd = await page.evaluate(() => {
      const el = document.getElementById('round-end-screen');
      return el && !el.classList.contains('hidden');
    });
    if (roundEnd) {
      await clickBtn('Next') || await clickBtn('Continue') || await clickBtn('Play');
      await page.waitForTimeout(800);
      continue;
    }

    // LOCKUP CHECK: "AI's turn. Draw a card." stuck for >5s
    if (msg.includes("AI's turn") && msg.includes('Draw a card')) {
      if (!aiStuckSince) aiStuckSince = Date.now();
      if (Date.now() - aiStuckSince > 5000) {
        const stErrs = await page.evaluate(() => window._stErrors || []);
        lockup = true;
        console.log(`  ${label}: *** LOCKUP after ${elapsed}s, ${humanTurns} turns ***`);
        console.log(`    Stuck msg: "${msg}"`);
        if (stErrs.length) stErrs.forEach(e => console.log(`    setTimeout error: ${e}`));
        if (errors.length) errors.forEach(e => console.log(`    JS error: ${e.substring(0,100)}`));
        break;
      }
      await page.waitForTimeout(TICK_MS);
      continue;
    } else {
      aiStuckSince = 0;
    }

    // AI doing stuff — wait
    if (msg.includes('Kai')) {
      await page.waitForTimeout(TICK_MS);
      continue;
    }

    // Triad complete — click discard if button present
    if (msg.includes('Triad') && (msg.includes('complete') || msg.includes('Discard'))) {
      await clickBtn('Discard');
      await page.waitForTimeout(TICK_MS);
      continue;
    }

    // Human: reveal
    if (msg.includes('Reveal')) {
      const n = await getClickable();
      if (n > 0) await clickFirstClickable();
      await page.waitForTimeout(TICK_MS);
      continue;
    }

    // Human: draw
    if (msg.includes('Draw a card') && msg.includes('Mindy')) {
      await page.click('#draw-pile').catch(() => {});
      await page.waitForTimeout(TICK_MS);
      continue;
    }

    // Human: place or discard
    if (msg.includes('Place') || (msg.includes('discard') && msg.includes('Drew'))) {
      await dismissModal();
      const n = await getClickable();
      if (n > 0) {
        await clickFirstClickable();
        humanTurns++;
        await page.waitForTimeout(300);
        await dismissModal(); // power card modal
        await page.waitForTimeout(200);
      } else {
        await clickBtn('Discard');
        humanTurns++;
        await page.waitForTimeout(TICK_MS);
      }
      continue;
    }

    // Swap / End Turn
    if (msg.includes('Swap') || msg.includes('End Turn')) {
      await clickBtn('End Turn') || await clickBtn('Discard');
      humanTurns++;
      await page.waitForTimeout(TICK_MS);
      continue;
    }

    // Generic wait
    await page.waitForTimeout(TICK_MS);
  }

  const stErrs = await page.evaluate(() => window._stErrors || []).catch(() => []);
  await browser.close();

  return { lockup, humanTurns, jsErrors: errors.length, stErrors: stErrs.length,
           stErrorMsgs: stErrs, jsErrorMsgs: errors };
}

async function main() {
  const RUNS = 5;
  const res = { old: [], new: [] };

  for (let i = 0; i < RUNS; i++) {
    console.log(`\n=== Run ${i+1}/${RUNS} ===`);
    try { res.old.push(await playGame(`OLD-${i+1}`, OLD_URL)); }
    catch(e) { console.log(`  OLD-${i+1} CRASHED: ${e.message.substring(0,80)}`); res.old.push({lockup:false,humanTurns:0,jsErrors:1,stErrors:0,stErrorMsgs:[],jsErrorMsgs:[e.message]}); }
    try { res.new.push(await playGame(`NEW-${i+1}`, NEW_URL)); }
    catch(e) { console.log(`  NEW-${i+1} CRASHED: ${e.message.substring(0,80)}`); res.new.push({lockup:false,humanTurns:0,jsErrors:1,stErrors:0,stErrorMsgs:[],jsErrorMsgs:[e.message]}); }
  }

  console.log('\n' + '='.repeat(50));
  console.log('RESULTS');
  console.log('='.repeat(50));
  for (const [label, arr] of [['OLD', res.old], ['NEW', res.new]]) {
    const lockups = arr.filter(r => r.lockup).length;
    const turns = arr.map(r => r.humanTurns);
    const je = arr.reduce((s, r) => s + r.jsErrors, 0);
    const se = arr.reduce((s, r) => s + r.stErrors, 0);
    console.log(`${label}: lockups=${lockups}/${RUNS}  turns=[${turns}]  jsErrors=${je}  stErrors=${se}`);
    // Show any errors
    arr.forEach((r, i) => {
      if (r.stErrorMsgs?.length) r.stErrorMsgs.forEach(e => console.log(`  ${label}-${i+1} setTimeout: ${e.substring(0,120)}`));
      if (r.jsErrorMsgs?.length) r.jsErrorMsgs.forEach(e => console.log(`  ${label}-${i+1} jsError: ${e.substring(0,120)}`));
    });
  }

  const oL = res.old.filter(r => r.lockup).length;
  const nL = res.new.filter(r => r.lockup).length;
  const oSE = res.old.reduce((s, r) => s + r.stErrors, 0);
  const nSE = res.new.reduce((s, r) => s + r.stErrors, 0);

  if (nL > 0 && oL === 0) console.log('\n*** REGRESSION: lockup only in NEW ***');
  else if (oL > 0 && nL > 0) console.log('\n*** BUG IN BOTH ***');
  else if (nSE > 0 && oSE === 0) console.log('\n*** NEW has silent setTimeout errors (potential regression) ***');
  else if (oSE > 0 && nSE === 0) console.log('\n*** OLD has errors that NEW fixed ***');
  else console.log('\n*** No lockup or errors detected in either version ***');
}

main().catch(console.error);
