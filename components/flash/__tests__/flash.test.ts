import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Flash from '../flash';

describe('Flash', () => {
  let el: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    el = document.createElement('div');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the element shown when start follows stop within 200ms', () => {
    const flash = new Flash(el);
    flash.start();
    flash.stop();
    flash.start();
    vi.advanceTimersByTime(200);
    expect(el.style.display).toBe('block');
  });

  it('keeps the element shown after start, stop, stop, start', () => {
    const flash = new Flash(el);
    flash.start();
    flash.stop();
    flash.stop();
    flash.start();
    vi.advanceTimersByTime(200);
    expect(el.style.display).toBe('block');
  });

  it('runs one color interval after start, stop, start', () => {
    const flash = new Flash(el);
    const update = vi.spyOn(flash, 'update');
    flash.start();
    flash.stop();
    flash.start();
    vi.advanceTimersByTime(100);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('hides the element 200ms after stop', () => {
    const flash = new Flash(el);
    flash.start();
    flash.stop();
    vi.advanceTimersByTime(199);
    expect(el.style.display).toBe('block');
    vi.advanceTimersByTime(1);
    expect(el.style.display).toBe('none');
  });
});
