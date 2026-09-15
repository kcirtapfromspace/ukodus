import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import { chromium } from 'playwright';
import { wasmAssetVersion } from './wasm-version.mjs';

// Exercise the production build and actual shipped WASM, including its module worker.
const root = fileURLToPath(new URL('../', import.meta.url));
const port = process.env.SMOKE_PORT || '4175';
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', port, '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let serverOutput = '';
let serverStdout = '';
server.stdout.on('data', chunk => { serverStdout += chunk; serverOutput += chunk; });
server.stderr.on('data', chunk => { serverOutput += chunk; });
/** @type {import('playwright').Browser | undefined} */
let browser;
try {
 for (let attempt = 0; ; attempt++) {
  if (server.exitCode !== null) throw new Error(`Preview exited: ${serverOutput}`);
  // An HTTP response alone could come from a different process using this port.
  // Wait for our strict-port preview process to announce its own listening URL.
  if (stripVTControlCharacters(serverStdout).includes(`${origin}/`)) {
   try { if ((await fetch(origin, { signal: AbortSignal.timeout(1000) })).ok) break; } catch { /* startup */ }
  }
  if (attempt >= 100) throw new Error(`Preview startup timed out: ${serverOutput}`);
  await new Promise(resolve => setTimeout(resolve, 100));
 }
 browser = await chromium.launch();
 const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
 /** @type {string[]} */
 const errors = [];
 /** @type {URL[]} */
 const wasmRequests = [];
 page.context().on('request', request => {
  const url = new URL(request.url());
  if (url.pathname.startsWith('/wasm/')) wasmRequests.push(url);
 });
 page.on('pageerror', error => errors.push(error.message));
 await page.addInitScript(() => {
  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
   /** @param {string | URL} url @param {WorkerOptions} [options] */
   constructor(url, options) {
    super(url, options);
    this.addEventListener('message', event => {
     if (event.data.type === 'generated' || event.data.type === 'error') {
      sessionStorage.setItem('smoke_worker_result', JSON.stringify(event.data));
     }
    });
    this.addEventListener('error', event => sessionStorage.setItem('smoke_worker_error', event.message));
   }
  };
 });
 const puzzle = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
 await page.goto(`${origin}/play/?p=${puzzle}`);
 await page.getByPlaceholder('ACE').fill('TESTER');
 await page.getByRole('button', { name: 'START', exact: true }).click();
 await page.locator('.loading').waitFor({ state: 'hidden' });
 await page.locator('#game-canvas').waitFor({ state: 'visible' });
 assert.equal(await page.title(), 'Ukodus — Play Sudoku');
 assert.equal(await page.evaluate(() => localStorage.getItem('ukodus_player_tag')), 'TESTER');
 const playerId = await page.evaluate(() => localStorage.getItem('ukodus_player_id'));
 assert.ok(playerId);
 // The actual worker must initialize the production WASM and return a usable puzzle.
 await page.waitForFunction(() => sessionStorage.getItem('smoke_worker_result') || sessionStorage.getItem('smoke_worker_error'), undefined, { timeout: 60000 });
 const workerError = await page.evaluate(() => sessionStorage.getItem('smoke_worker_error'));
 assert.equal(workerError, null);
 const generated = JSON.parse(await page.evaluate(() => sessionStorage.getItem('smoke_worker_result')) || '{}');
 assert.equal(generated.type, 'generated');
 assert.equal(generated.data.puzzle_string.length, 81);
 assert.equal(generated.data.solution_string.length, 81);
 for (const name of ['sudoku_wasm.js', 'sudoku_wasm_bg.wasm']) {
  const requests = wasmRequests.filter(url => url.pathname === `/wasm/${name}`);
  assert.ok(requests.length, `The game and worker must request ${name}`);
  assert.ok(requests.every(url => url.searchParams.get('v') === wasmAssetVersion),
   `${name} must use the current bundle's shared content hash`);
 }
 // Exercise version-two modular certificates in the actual shipped binary.
 // The fixture is the synthetic, satisfiable six-source research witness.
 const residueReplay = JSON.parse(await readFile(new URL('../tests/fixtures/arithmetic-residue-replay.json', import.meta.url), 'utf8'));
 const arithmetic = await page.evaluate(async ({ replay, version }) => {
  const wasm = await import(`/wasm/sudoku_wasm.js?v=${version}`);
  await wasm.default({ module_or_path: new URL(`/wasm/sudoku_wasm_bg.wasm?v=${version}`, location.origin) });
  const valid = wasm.verify_arithmetic_replay_json(JSON.stringify(replay));
  const changed = structuredClone(replay);
  changed.proof.terminal.Residue.modulus = 3;
  const tampered = wasm.verify_arithmetic_replay_json(JSON.stringify(changed));
  const exhausted = JSON.parse(wasm.search_arithmetic_json(JSON.stringify(replay.state),
   JSON.stringify({ max_sources: 6, max_weight: 2, beam_width: 64, max_combinations: 0 })));
  return { valid, tampered, exhausted };
 }, { replay: residueReplay, version: wasmAssetVersion });
 assert.equal(arithmetic.valid, true, 'Production WASM must replay the modulo-four certificate');
 assert.equal(arithmetic.tampered, false, 'Changing its modulus must invalidate the certificate');
 assert.equal(arithmetic.exhausted.budget_exhausted, true);
 assert.equal(arithmetic.exhausted.hint, null);
 await page.getByRole('button', { name: 'Toggle theme: light' }).click();
 await page.waitForFunction(() => document.body.style.background === 'rgb(24, 24, 42)');
 // Read a freshly emitted WASM state, never the save left by an earlier page.
 const captureGame = async () => {
  const serialized = await page.evaluate(() => {
   localStorage.removeItem('sudoku_save');
   window.dispatchEvent(new Event('beforeunload'));
   return localStorage.getItem('sudoku_save');
  });
  assert.ok(serialized, 'The live game must emit its current state');
  return JSON.parse(serialized);
 };
 const initialGame = await captureGame();
 const initialBoard = puzzle.replaceAll('0', '.');
 assert.equal(initialGame.puzzle, initialBoard);
 assert.equal(initialGame.current, initialBoard);
 // The engine starts with the center cell selected. Move to row 1, column 3,
 // an editable cell whose known solution is 4 (a given cell would ignore input).
 for (let row = initialGame.cursor_row; row > 0; row--) await page.keyboard.press('ArrowUp');
 for (let col = initialGame.cursor_col; col > 2; col--) await page.keyboard.press('ArrowLeft');
 for (let col = initialGame.cursor_col; col < 2; col++) await page.keyboard.press('ArrowRight');
 await page.keyboard.press('4');
 const playedGame = await captureGame();
 const playedBoard = `${initialBoard.slice(0, 2)}4${initialBoard.slice(3)}`;
 assert.equal(playedGame.current, playedBoard, 'Keyboard input must update the actual board');
 assert.equal(playedGame.mistakes, 0);
 // Reload invokes the real unload persistence handler and restores the same player/game.
 await page.evaluate(() => history.replaceState({}, '', '/play/'));
 await page.reload();
 await page.locator('.loading').waitFor({ state: 'hidden' });
 await page.locator('#game-canvas').waitFor({ state: 'visible' });
 const restoredGame = await captureGame();
 assert.equal(restoredGame.puzzle, playedGame.puzzle);
 assert.equal(restoredGame.current, playedBoard, 'Reload must restore the edited WASM board');
 assert.equal(restoredGame.cursor_row, 0);
 assert.equal(restoredGame.cursor_col, 2);
 // Make another move, then leave through SvelteKit navigation without manually
 // saving. This requires component teardown to persist the newly edited board.
 await page.keyboard.press('ArrowRight');
 await page.keyboard.press('6');
 const navigatedBoard = `${playedBoard.slice(0, 3)}6${playedBoard.slice(4)}`;
 await page.evaluate(() => { document.documentElement.dataset.smokeNavigation = 'same-document'; });
 await page.getByRole('link', { name: 'Home', exact: true }).click();
 await page.getByRole('heading', { name: 'Sudoku Galaxy', exact: true }).waitFor();
 assert.equal(await page.locator('html').getAttribute('data-smoke-navigation'), 'same-document');
 const navigationSave = JSON.parse(await page.evaluate(() => localStorage.getItem('sudoku_save')) || '{}');
 assert.equal(navigationSave.current, navigatedBoard, 'Leaving the game must save the last move');
 await page.getByRole('link', { name: 'Play', exact: true }).first().click();
 await page.locator('.loading').waitFor({ state: 'hidden' });
 await page.locator('#game-canvas').waitFor({ state: 'visible' });
 const returnedGame = await captureGame();
 assert.equal(returnedGame.puzzle, initialBoard);
 assert.equal(returnedGame.current, navigatedBoard, 'Returning to Play must restore the latest board');
 const saved = await page.evaluate(() => ({ game: localStorage.getItem('sudoku_save'), stats: localStorage.getItem('sudoku_stats'), id: localStorage.getItem('ukodus_player_id'), theme: localStorage.getItem('ukodus_theme') }));
 assert.equal(saved.id, playerId);
 assert.equal(saved.theme, 'dark');
 assert.ok(saved.game); assert.ok(saved.stats);
 assert.doesNotThrow(() => JSON.parse(saved.game || ''));
 assert.doesNotThrow(() => JSON.parse(saved.stats || ''));
 assert.equal(await page.getByPlaceholder('ACE').count(), 0);
 assert.deepEqual(errors, []);
 console.log('Browser smoke passed: production WASM canvas, worker generation, modular proof replay and tamper rejection, keyboard edits, theme, player tag, and board restoration after reload and navigation.');
} finally {
 await browser?.close();
 if (server.exitCode === null) {
  server.kill('SIGTERM');
  await once(server, 'exit');
 }
}
