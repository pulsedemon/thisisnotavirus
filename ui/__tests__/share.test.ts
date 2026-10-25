import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createShareButton } from '../share';

describe('virus sharing', () => {
  let button: HTMLButtonElement;
  let status: HTMLElement;
  const share = vi.fn<(data: ShareData) => Promise<void>>();
  const writeText = vi.fn<(text: string) => Promise<void>>();

  beforeEach(() => {
    vi.useFakeTimers();
    share.mockReset().mockResolvedValue(undefined);
    writeText.mockReset().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, clipboard: { writeText } });
    vi.spyOn(window, 'prompt').mockReturnValue(null);
    window.history.replaceState({}, '', '/collection/?campaign=test#old');
    document.body.innerHTML =
      '<div id="menu"><div class="controls"><span id="info-btn"></span></div></div>';
    button = createShareButton()!;
    button.value = 'tick-tock';
    button.hidden = false;
    status = document.querySelector('[role="status"]')!;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.onkeydown = null;
    document.onkeyup = null;
    document.body.textContent = '';
    window.history.replaceState({}, '', '/');
  });

  it('shares the latest virus with its name and a clean link on the current site', async () => {
    button.click();
    await vi.advanceTimersByTimeAsync(0);
    button.value = 'doors';
    button.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(share.mock.calls).toEqual([
      [
        {
          title: 'Tick Tock | THISISNOTAVIRUS',
          url: `${window.location.origin}/collection/?virus=tick-tock`,
        },
      ],
      [
        {
          title: 'Doors | THISISNOTAVIRUS',
          url: `${window.location.origin}/collection/?virus=doors`,
        },
      ],
    ]);
    expect(writeText).not.toHaveBeenCalled();
    expect(status.textContent).toBe('');
    expect(button.disabled).toBe(false);
  });

  it('confirms copying only after the clipboard write completes', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const copy = Promise.withResolvers<void>();
    writeText.mockReturnValue(copy.promise);

    button.click();
    button.click();
    expect(writeText).toHaveBeenCalledExactlyOnceWith(
      `${window.location.origin}/collection/?virus=tick-tock`
    );
    expect(status.textContent).toBe('');
    expect(button.disabled).toBe(true);

    copy.resolve();
    await vi.advanceTimersByTimeAsync(0);
    expect(status.textContent).toBe('Link copied');
    expect(button.disabled).toBe(false);
    await vi.advanceTimersByTimeAsync(2000);
    expect(status.textContent).toBe('');
  });

  it('does not copy or report failure when native sharing is cancelled', async () => {
    share.mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
    button.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(writeText).not.toHaveBeenCalled();
    expect(window.prompt).not.toHaveBeenCalled();
    expect(status.textContent).toBe('');
    expect(button.disabled).toBe(false);
  });

  it('copies the clicked virus if sharing fails after the displayed virus changes', async () => {
    const pendingShare = Promise.withResolvers<void>();
    share.mockReturnValue(pendingShare.promise);
    button.click();
    button.value = 'doors';
    pendingShare.reject(new DOMException('Unavailable', 'DataError'));
    await vi.advanceTimersByTimeAsync(0);

    expect(writeText).toHaveBeenCalledExactlyOnceWith(
      `${window.location.origin}/collection/?virus=tick-tock`
    );
    expect(status.textContent).toBe('Link copied');
    expect(window.prompt).not.toHaveBeenCalled();
    expect(button.disabled).toBe(false);
  });

  it.each(['denied', 'unavailable'])(
    'exposes the link for manual copying when the clipboard is %s',
    async availability => {
      vi.stubGlobal('navigator', { clipboard: { writeText } });
      button.click();
      await vi.advanceTimersByTimeAsync(0);
      expect(status.textContent).toBe('Link copied');

      if (availability === 'denied') {
        writeText.mockRejectedValue(
          new DOMException('Denied', 'NotAllowedError')
        );
      } else {
        vi.stubGlobal('navigator', {});
      }
      button.value = 'doors';
      button.click();
      await vi.advanceTimersByTimeAsync(0);

      expect(window.prompt).toHaveBeenCalledExactlyOnceWith(
        'Copy this link:',
        `${window.location.origin}/collection/?virus=doors`
      );
      expect(status.textContent).toBe('');
      expect(button.disabled).toBe(false);
    }
  );

  it.each([' ', 'Enter'])(
    'keeps %j activation out of the global keyboard handlers',
    key => {
      const shortcut = vi.fn();
      document.onkeydown = shortcut;
      document.onkeyup = shortcut;

      button.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true })
      );
      button.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
      expect(shortcut).not.toHaveBeenCalled();

      button.dispatchEvent(
        new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true })
      );
      expect(shortcut).toHaveBeenCalledOnce();
    }
  );

  it('does not share while the loader hides the control or has no individual virus', () => {
    button.hidden = true;
    button.click();
    button.hidden = false;
    button.value = '';
    button.click();

    expect(share).not.toHaveBeenCalled();
    expect(writeText).not.toHaveBeenCalled();
  });
});
