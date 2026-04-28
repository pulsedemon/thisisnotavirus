import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('startUzumakiBackground', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    document.body.style.backgroundColor = '';
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('should set a single background color when randomBool returns false', async () => {
    vi.doMock('../random', () => ({
      randomBool: vi.fn(() => false),
      randomItem: vi.fn(() => '#00ffff'),
    }));

    const { startUzumakiBackground } = await import('../uzumaki-colors');
    startUzumakiBackground();

    expect(document.body.style.backgroundColor).toBe('rgb(0, 255, 255)');
  });

  it('should update the background on an interval when randomBool returns true', async () => {
    const randomItem = vi
      .fn()
      .mockReturnValueOnce('#ff0000')
      .mockReturnValueOnce('#00ff00');

    vi.doMock('../random', () => ({
      randomBool: vi.fn(() => true),
      randomItem,
    }));

    const { startUzumakiBackground } = await import('../uzumaki-colors');
    startUzumakiBackground();

    expect(document.body.style.backgroundColor).toBe('');

    vi.advanceTimersByTime(200);
    expect(document.body.style.backgroundColor).toBe('rgb(255, 0, 0)');

    vi.advanceTimersByTime(200);
    expect(document.body.style.backgroundColor).toBe('rgb(0, 255, 0)');
  });
});
