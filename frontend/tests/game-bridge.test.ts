import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SudokuGame } from '../src/lib/wasm/loader';
import { GameBridge } from '../src/lib/game/GameBridge';
import { apiClient } from '../src/lib/api/client';
import { puzzlePrefetch } from '../src/lib/wasm/puzzle-prefetch';
import { playerStore } from '../src/lib/stores/player.svelte';

vi.mock('../src/lib/api/client', () => ({ apiClient: { submitResult: vi.fn() } }));
vi.mock('../src/lib/wasm/puzzle-prefetch', () => ({ puzzlePrefetch: { warmup: vi.fn() } }));

const bridges: GameBridge[] = [];
function fixture() {
 const game = {
  is_complete: vi.fn(() => false), is_game_over: vi.fn(() => false),
  get_puzzle_string: vi.fn(() => '123'), get_short_code: vi.fn(() => 'ABCD1234'),
  difficulty: vi.fn(() => 'Hard'), se_rating: vi.fn(() => 4.2), elapsed_secs: vi.fn(() => 123),
  mistakes: vi.fn(() => 1), hints_used: vi.fn(() => 2), get_move_log: vi.fn(() => '[{"seq":1}]')
 };
 const bridge = new GameBridge(game as unknown as SudokuGame);
 bridges.push(bridge);
 bridge.start();
 return { game, bridge };
}
beforeEach(() => { vi.useFakeTimers(); vi.mocked(apiClient.submitResult).mockResolvedValue(true); playerStore.id = 'player-id'; playerStore.tag = 'Ada'; });
afterEach(() => { bridges.splice(0).forEach(b => b.stop()); vi.restoreAllMocks(); vi.useRealTimers(); });

it('submits a completed game once with player identity, move timing, and replay data', async () => {
 const { game } = fixture();
 for (const [time, key] of [[100, '1'], [200, '2'], [500, '3'], [600, 'x']] as const) {
  vi.spyOn(performance, 'now').mockReturnValue(time);
  document.dispatchEvent(new KeyboardEvent('keydown', { key }));
 }
 await vi.advanceTimersByTimeAsync(2000);
 expect(apiClient.submitResult).not.toHaveBeenCalled();
 game.is_complete.mockReturnValue(true);
 await vi.advanceTimersByTimeAsync(6000);
 expect(apiClient.submitResult).toHaveBeenCalledTimes(1);
 expect(apiClient.submitResult).toHaveBeenCalledWith({
  player_id: 'player-id', player_tag: 'Ada', puzzle_hash: '0000be32', puzzle_string: '123', short_code: 'ABCD1234',
  difficulty: 'Hard', se_rating: 4.2, result: 'Win', time_secs: 123, mistakes: 1, hints_used: 2,
  moves_count: 3, avg_move_time_ms: 200, min_move_time_ms: 100, move_time_std_dev: 141, move_log: [{ seq: 1 }]
 });
 expect(puzzlePrefetch.warmup).toHaveBeenCalledWith('hard');
});

it('records a loss without inventing a move and tolerates legacy WASM data', async () => {
 const { game } = fixture();
 playerStore.tag = '';
 game.get_short_code.mockReturnValue(''); game.get_move_log.mockReturnValue('invalid'); game.difficulty.mockReturnValue('');
 game.is_game_over.mockReturnValue(true);
 await vi.advanceTimersByTimeAsync(2000);
 expect(apiClient.submitResult).toHaveBeenCalledWith(expect.objectContaining({ result: 'Loss', player_tag: null,
  short_code: null, moves_count: 0, avg_move_time_ms: 0, min_move_time_ms: 0, move_time_std_dev: 0, move_log: null }));
 expect(puzzlePrefetch.warmup).toHaveBeenCalledWith('medium');
});

it.each(['[]', '{}', ''])('ignores absent or non-array replay payload %s', async (log) => {
 const { game } = fixture(); game.is_complete.mockReturnValue(true); game.get_move_log.mockReturnValue(log);
 document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
 await vi.advanceTimersByTimeAsync(2000);
 expect(apiClient.submitResult).toHaveBeenCalledWith(expect.objectContaining({ moves_count: 1, move_log: null }));
});

it('does not duplicate submissions while an API request is pending or after failure', async () => {
 const { game, bridge } = fixture();
 let finish!: (value: boolean) => void;
 vi.mocked(apiClient.submitResult).mockReturnValue(new Promise(resolve => { finish = resolve; }));
 game.is_complete.mockReturnValue(true);
 await vi.advanceTimersByTimeAsync(6000);
 expect(apiClient.submitResult).toHaveBeenCalledTimes(1);
 finish(false); await vi.advanceTimersByTimeAsync(6000);
 expect(apiClient.submitResult).toHaveBeenCalledTimes(1);
 bridge.reset();
 vi.mocked(apiClient.submitResult).mockRejectedValue(new Error('offline'));
 await vi.advanceTimersByTimeAsync(4000);
 expect(apiClient.submitResult).toHaveBeenCalledTimes(2);
});

it('resets timing on a new game and avoids duplicate listeners when started again', async () => {
 const { game, bridge } = fixture(); bridge.start();
 document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
 game.is_complete.mockReturnValue(true); await vi.advanceTimersByTimeAsync(2000);
 expect(apiClient.submitResult).toHaveBeenLastCalledWith(expect.objectContaining({ moves_count: 1 }));
 game.is_complete.mockReturnValue(false); await vi.advanceTimersByTimeAsync(2000);
 game.is_complete.mockReturnValue(true); await vi.advanceTimersByTimeAsync(2000);
 expect(apiClient.submitResult).toHaveBeenLastCalledWith(expect.objectContaining({ moves_count: 0 }));
 bridge.stop(); bridge.stop();
 await vi.advanceTimersByTimeAsync(4000);
 expect(apiClient.submitResult).toHaveBeenCalledTimes(2);
});

it('keeps polling after unavailable WASM state and ignores best-effort prefetch errors', async () => {
 const { game, bridge } = fixture();
 game.is_complete.mockImplementationOnce(() => { throw new Error('unavailable'); });
 await vi.advanceTimersByTimeAsync(2000);
 game.is_complete.mockReturnValue(true);
 vi.mocked(puzzlePrefetch.warmup).mockImplementationOnce(() => { throw new Error('no Worker'); });
 await vi.advanceTimersByTimeAsync(2000);
 expect(apiClient.submitResult).toHaveBeenCalledTimes(1);
 bridge.reset(); game.get_puzzle_string.mockImplementation(() => { throw new Error('freed'); });
 await vi.advanceTimersByTimeAsync(2000);
 expect(apiClient.submitResult).toHaveBeenCalledTimes(1);
});
