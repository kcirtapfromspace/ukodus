/**
 * GameBridge - WASM-to-API bridge
 *
 * Watches the existing WASM game and reports results to the Galaxy API.
 * Does NOT modify the WASM binary. Polls game state and intercepts key
 * events to collect move timing data.
 */

const POLL_INTERVAL_MS = 2000;
const PLAYER_ID_KEY = 'ukodus_player_id';
const PLAYER_TAG_KEY = 'ukodus_player_tag';

function generateUUID() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getPlayerId() {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

function hashPuzzle(puzzleString) {
  let hash = 0;
  for (let i = 0; i < puzzleString.length; i++) {
    const ch = puzzleString.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sqDiffs = values.map(v => (v - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

export class GameBridge {
  /**
   * @param {object} game - SudokuGame WASM instance
   * @param {string} apiBase - API base URL, defaults to '' (same origin)
   */
  constructor(game, apiBase = '') {
    this.game = game;
    this.apiBase = apiBase.replace(/\/$/, '');
    this.playerId = getPlayerId();
    this.pollTimer = null;
    this.reported = false;
    this.moveTimes = [];
    this.lastMoveTimestamp = null;
    this._keyHandler = null;
  }

  start() {
    this.reported = false;
    this.moveTimes = [];
    this.lastMoveTimestamp = null;

    // Intercept keydown to record move timing for digit presses
    this._keyHandler = (e) => {
      if (e.key >= '1' && e.key <= '9') {
        const now = performance.now();
        if (this.lastMoveTimestamp !== null) {
          this.moveTimes.push(now - this.lastMoveTimestamp);
        }
        this.lastMoveTimestamp = now;
      }
    };
    // Add before WASM's handler by using capture phase
    document.addEventListener('keydown', this._keyHandler, true);

    // Start polling
    this.pollTimer = setInterval(() => this._poll(), POLL_INTERVAL_MS);
    console.log('[GameBridge] started, polling every', POLL_INTERVAL_MS, 'ms, player:', this.playerId);
  }

  stop() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler, true);
      this._keyHandler = null;
    }
  }

  _poll() {
    try {
      const complete = this.game.is_complete();
      const gameOver = this.game.is_game_over();

      if (complete || gameOver) {
        if (!this.reported) {
          console.log('[GameBridge] game ended — complete:', complete, 'gameOver:', gameOver);
          this.reported = true;
          this._submitResult(complete);
        }
      } else if (this.reported) {
        // Game transitioned from terminal state back to playing (new game)
        console.log('[GameBridge] new game detected, resetting');
        this.reported = false;
        this.moveTimes = [];
        this.lastMoveTimestamp = null;
      }
    } catch (err) {
      console.warn('[GameBridge] poll error:', err);
    }
  }

  async _submitResult(won) {
    try {
      const puzzleString = this.game.get_puzzle_string();
      const shortCode = this.game.get_short_code();
      const difficulty = this.game.difficulty();
      const seRating = this.game.se_rating();
      const elapsedSecs = this.game.elapsed_secs();
      const mistakes = this.game.mistakes();
      const hintsUsed = this.game.hints_used();

      const movesCount = this.moveTimes.length + 1; // +1 for first move (no interval)
      const avgMoveTimeMs = this.moveTimes.length > 0
        ? Math.round(this.moveTimes.reduce((a, b) => a + b, 0) / this.moveTimes.length)
        : 0;
      const minMoveTimeMs = this.moveTimes.length > 0
        ? Math.round(Math.min(...this.moveTimes))
        : 0;
      const moveTimeStdDev = Math.round(stdDev(this.moveTimes));

      // Retrieve move log from WASM (gracefully handle old binaries without get_move_log)
      let moveLog = null;
      try {
        const logJson = this.game.get_move_log();
        if (logJson && logJson !== '[]') moveLog = JSON.parse(logJson);
      } catch { /* old WASM binary without get_move_log */ }

      const payload = {
        player_id: this.playerId,
        player_tag: localStorage.getItem(PLAYER_TAG_KEY) || null,
        puzzle_hash: hashPuzzle(puzzleString),
        puzzle_string: puzzleString,
        short_code: shortCode || null,
        difficulty,
        se_rating: seRating,
        result: won ? 'Win' : 'Loss',
        time_secs: elapsedSecs,
        mistakes,
        hints_used: hintsUsed,
        moves_count: movesCount,
        avg_move_time_ms: avgMoveTimeMs,
        min_move_time_ms: minMoveTimeMs,
        move_time_std_dev: moveTimeStdDev,
        move_log: moveLog,
      };

      const resp = await fetch(`${this.apiBase}/api/v1/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        console.warn('[GameBridge] result submit failed:', resp.status, text);
      } else {
        console.log('[GameBridge] result submitted successfully:', payload.difficulty, payload.result, payload.puzzle_hash);
      }
    } catch (err) {
      console.warn('[GameBridge] result submit error:', err);
    }
  }
}
