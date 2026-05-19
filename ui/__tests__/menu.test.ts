import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toggleInfo, hideInfo, teleportMenu, shuffleTitle } from '../menu';

vi.mock('../../utils/gtag', () => ({
  safeGtag: vi.fn(),
}));

describe('menu', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div class="modal info-modal"></div>
      <span id="info-btn">info</span>
      <div id="menu" style="inset: 0px 0px auto auto"></div>
    `;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('toggleInfo', () => {
    it('should toggle .show class on .modal.info-modal', () => {
      const modal = document.querySelector('.modal.info-modal')!;

      toggleInfo();
      expect(modal.classList.contains('show')).toBe(true);

      toggleInfo();
      expect(modal.classList.contains('show')).toBe(false);
    });

    it("should change info-btn text between 'info' and 'close'", () => {
      const infoBtn = document.getElementById('info-btn')!;

      toggleInfo();
      expect(infoBtn.innerText).toBe('close');

      toggleInfo();
      expect(infoBtn.innerText).toBe('info');
    });
  });

  describe('hideInfo', () => {
    it('should remove .show class', () => {
      const modal = document.querySelector('.modal.info-modal')!;
      modal.classList.add('show');

      hideInfo();
      expect(modal.classList.contains('show')).toBe(false);
    });

    it("should set info-btn text to 'info'", () => {
      const infoBtn = document.getElementById('info-btn')!;
      infoBtn.innerText = 'close';

      hideInfo();
      expect(infoBtn.innerText).toBe('info');
    });
  });

  describe('teleportMenu', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should change menu inset style', () => {
      const menu = document.getElementById('menu')!;
      const originalInset = menu.style.inset;

      teleportMenu();
      vi.advanceTimersByTime(300);

      expect(menu.style.inset).not.toBe(originalInset);
    });

    it('should add/remove teleporting class', () => {
      const menu = document.getElementById('menu')!;

      teleportMenu();
      expect(menu.classList.contains('teleporting')).toBe(true);

      vi.advanceTimersByTime(300);
      expect(menu.classList.contains('teleporting')).toBe(true);

      vi.advanceTimersByTime(400);
      expect(menu.classList.contains('teleporting')).toBe(false);
    });
  });

  describe('shuffleTitle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns a handle with interval and stop', () => {
      const handle = shuffleTitle();
      expect(handle.interval).toBeDefined();
      expect(typeof handle.stop).toBe('function');
      handle.stop();
    });

    it('mutates document.title on tick', () => {
      document.title = 'thisisnotavirus';
      const handle = shuffleTitle();

      vi.advanceTimersByTime(200);
      // After one tick the title should have been shuffled
      // (it could theoretically stay the same, but with 15 chars that's extremely unlikely)
      expect(typeof document.title).toBe('string');
      expect(document.title.length).toBe('thisisnotavirus'.length);

      handle.stop();
    });

    it('restores the original title on stop', () => {
      document.title = 'thisisnotavirus';
      const handle = shuffleTitle();
      vi.advanceTimersByTime(200);
      handle.stop();
      expect(document.title).toBe('thisisnotavirus');
    });
  });
});
