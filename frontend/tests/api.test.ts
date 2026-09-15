import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apiClient } from '../src/lib/api/client';
import type { ResultPayload, SharePayload, MinedPuzzleInput } from '../src/lib/api/types';
const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal('fetch', fetchMock); vi.useFakeTimers(); vi.spyOn(console, 'warn').mockImplementation(() => {}); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });

it('serializes result/share/mining submissions and sends mining authentication only to internal endpoints', async () => {
 fetchMock.mockResolvedValue(response({ accepted: true }));
 const result = { player_id: 'p', result: 'Win' } as ResultPayload;
 expect(await apiClient.submitResult(result)).toBe(true);
 expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/results', expect.objectContaining({ method: 'POST', body: JSON.stringify(result) }));
 const share = { short_code: 'abcdefgh' } as SharePayload;
 await apiClient.registerShare(share);
 expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/share', expect.objectContaining({ body: JSON.stringify(share) }));
 const mined = { puzzle_hash: 'hash' } as MinedPuzzleInput;
 expect(await apiClient.submitMinedPuzzle(mined, 'test-key')).toBe(true);
 expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/internal/puzzles/mine', expect.objectContaining({ headers: { 'Content-Type': 'application/json', 'X-API-Key': 'test-key' }, body: JSON.stringify(mined) }));
});

it('returns failure for rejected result and mining submissions without retrying a POST', async () => {
 fetchMock.mockResolvedValue(response({}, 400));
 expect(await apiClient.submitResult({} as ResultPayload)).toBe(false);
 expect(await apiClient.submitMinedPuzzle({} as MinedPuzzleInput, 'key')).toBe(false);
 fetchMock.mockRejectedValue(new Error('offline'));
 expect(await apiClient.submitResult({} as ResultPayload)).toBe(false);
 expect(await apiClient.submitMinedPuzzle({} as MinedPuzzleInput, 'key')).toBe(false);
 await expect(apiClient.registerShare({} as SharePayload)).resolves.toBeUndefined();
 fetchMock.mockResolvedValue({ ok: false, status: 500, text: () => Promise.reject(new Error('broken body')) });
 expect(await apiClient.submitResult({} as ResultPayload)).toBe(false);
});

it('encodes leaderboard filters and retries transient HTTP and JSON errors', async () => {
 const entries = [{ player_id: 'p', time_secs: 60 }];
 fetchMock.mockResolvedValueOnce(response({}, 503)).mockResolvedValueOnce({ ok: true, json: () => Promise.reject(new Error('bad json')) }).mockResolvedValueOnce(response(entries));
 const pending = apiClient.fetchLeaderboard({ difficulty: 'Hard', puzzle_hash: 'a & b', limit: 5 });
 await vi.advanceTimersByTimeAsync(1500);
 expect(await pending).toEqual(entries);
 expect(fetchMock).toHaveBeenCalledTimes(3);
 expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/results/leaderboard?difficulty=Hard&puzzle_hash=a+%26+b&limit=5');
});

it('bounds retry timeouts and returns safe empty/null data after three failures', async () => {
 fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => {
  options.signal.addEventListener('abort', () => reject(new Error('timeout')));
 }));
 const pending = apiClient.fetchLeaderboard({});
 await vi.advanceTimersByTimeAsync(31500);
 expect(await pending).toEqual([]);
 expect(fetchMock).toHaveBeenCalledTimes(3);
 expect(vi.getTimerCount()).toBe(0);
 fetchMock.mockRejectedValue(new Error('offline'));
 const overview = apiClient.fetchGalaxyOverview(); await vi.runAllTimersAsync(); expect(await overview).toBeNull();
});

it('fetches galaxy data, normalized random puzzles, and authenticated pool counts', async () => {
 fetchMock.mockResolvedValueOnce(response({ nodes: [], edges: [] })).mockResolvedValueOnce(response({ total_puzzles: 5, total_plays: 7 }))
  .mockResolvedValueOnce(response({ puzzle_string: '123' })).mockResolvedValueOnce(response({ counts: [{ difficulty: 'Hard', count: 3 }] }));
 expect(await apiClient.fetchGalaxyOverview()).toEqual({ nodes: [], edges: [] });
 expect(await apiClient.fetchGalaxyStats()).toEqual({ total_puzzles: 5, total_plays: 7 });
 expect(await apiClient.fetchRandomPuzzle('hARD')).toEqual({ puzzle_string: '123' });
 expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/puzzles/random?difficulty=Hard', expect.anything());
 expect(await apiClient.fetchPoolInventory('test-key')).toEqual({ counts: [{ difficulty: 'Hard', count: 3 }] });
 expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/internal/puzzles/pool', expect.objectContaining({ headers: { 'X-API-Key': 'test-key' } }));
});
