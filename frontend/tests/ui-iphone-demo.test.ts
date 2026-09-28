import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import IPhoneDemo from '../src/lib/components/IPhoneDemo.svelte';

let reduceMotion = false;
let motionChanged: () => void;
const removeListener = vi.fn();

beforeEach(() => {
  reduceMotion = false;
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  vi.stubGlobal('matchMedia', () => ({
    get matches() { return reduceMotion; },
    addEventListener: (_: string, listener: () => void) => { motionChanged = listener; },
    removeEventListener: removeListener
  }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('allows a visitor to pause and resume the preview', async () => {
  render(IPhoneDemo);
  const video = screen.getByLabelText('Ukodus Sudoku gameplay on iPhone');
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce();
  await fireEvent.play(video);
  await fireEvent.click(screen.getByRole('button', { name: 'Pause iPhone preview' }));
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce();
  await fireEvent.pause(video);
  await fireEvent.click(screen.getByRole('button', { name: 'Play iPhone preview' }));
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
});

it('keeps the poster still for reduced motion and pauses when that preference changes', () => {
  reduceMotion = true;
  const view = render(IPhoneDemo);
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Play iPhone preview' })).toBeInTheDocument();
  motionChanged();
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce();
  view.unmount();
  expect(removeListener).toHaveBeenCalledWith('change', motionChanged);
});
