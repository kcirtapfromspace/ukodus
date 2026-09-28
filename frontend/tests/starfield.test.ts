import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import Starfield from '../src/lib/galaxy/Starfield.svelte';

function setupCanvas() {
 let width = 800, height = 600;
 const context = {
  fillStyle: '' as unknown,
  setTransform: vi.fn(), clearRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), fill: vi.fn(), fillRect: vi.fn(),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  createImageData: vi.fn((w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) })),
  putImageData: vi.fn()
 };
 vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
 vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width, height } as DOMRect));
 vi.stubGlobal('devicePixelRatio', 3);
 let resize!: () => void;
 const disconnect = vi.fn();
 vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resize = callback; } observe() {} disconnect = disconnect; });
 return { context, disconnect, resize: () => resize(), size: (w: number, h: number) => { width = w; height = h; } };
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('bounds canvas memory, skips unchanged dimensions, and cleans up resize work', () => {
 const { context, size, resize, disconnect } = setupCanvas();
 const remove = vi.spyOn(window, 'removeEventListener');
 const view = render(Starfield, { mode: 'infrared' });
 const [nebula, stars] = view.container.querySelectorAll('canvas');
 expect(nebula.width).toBeLessThanOrEqual(560); expect(nebula.height).toBeLessThanOrEqual(420);
 expect(stars.width).toBe(1600); expect(stars.height).toBe(1200);
 const pixels = context.putImageData.mock.calls[0][0] as { data: Uint8ClampedArray };
 const alpha = pixels.data.filter((_, i) => i % 4 === 3);
 expect(alpha.some(value => value > 0)).toBe(true); expect(alpha.some(value => value === 0)).toBe(true);
 const first = context.arc.mock.calls.map(args => [...args]);
 expect(first.length).toBeGreaterThan(100);
 expect(first.every(([x, y, radius]) => x >= 0 && x <= 800 && y >= 0 && y <= 600 && radius > 0)).toBe(true);
 resize(); window.dispatchEvent(new Event('resize'));
 expect(context.putImageData).toHaveBeenCalledTimes(1);
 expect(context.arc.mock.calls).toEqual(first);
 size(320, 650); resize();
 expect(stars.width).toBe(640); expect(stars.height).toBe(1300);
 expect(context.putImageData).toHaveBeenCalledTimes(2);
 view.unmount(); expect(disconnect).toHaveBeenCalledOnce();
 expect(remove).toHaveBeenCalledWith('resize', expect.any(Function));
 const draws = context.clearRect.mock.calls.length;
 window.dispatchEvent(new Event('resize'));
 expect(context.clearRect).toHaveBeenCalledTimes(draws);
});

it('keeps stars fixed when appearance changes and does not repaint on pause', async () => {
 const { context } = setupCanvas();
 const view = render(Starfield, { mode: 'visible' });
 const visiblePositions = context.arc.mock.calls.map(([x,y]) => `${x}:${y}`);
 context.arc.mockClear();
 await view.rerender({ mode: 'infrared' });
 const infraredPositions = context.arc.mock.calls.map(([x,y]) => `${x}:${y}`);
 expect(visiblePositions.every(position => infraredPositions.includes(position))).toBe(true);
 expect(infraredPositions.length).toBeGreaterThan(visiblePositions.length);
 expect(context.putImageData).toHaveBeenCalledTimes(1);
 context.arc.mockClear();
 await view.rerender({ paused: true });
 expect(view.container.querySelector('.starfield')).toHaveClass('paused');
 expect(context.arc).not.toHaveBeenCalled();
});

it('defers a hidden canvas until it gains dimensions and works without ResizeObserver', () => {
 const { context, size } = setupCanvas();
 size(0, 0); vi.stubGlobal('ResizeObserver', undefined); vi.stubGlobal('devicePixelRatio', 0);
 const view = render(Starfield);
 expect(context.putImageData).not.toHaveBeenCalled();
 size(320, 200); window.dispatchEvent(new Event('resize'));
 expect(context.putImageData).toHaveBeenCalledOnce();
 expect(view.container.querySelectorAll('canvas')[1].width).toBe(320);
});
