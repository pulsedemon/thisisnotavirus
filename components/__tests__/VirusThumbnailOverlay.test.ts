import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VirusLoaderInterface } from '../../types/VirusLoaderInterface';

vi.mock('../../utils/gtag', () => ({
  safeGtag: vi.fn(),
}));

vi.mock('../../utils/savedMixes', () => ({
  loadSavedMixes: vi.fn(() => []),
  saveMixes: vi.fn(() => true),
}));

vi.mock('../../utils/misc', () => ({
  shuffle: vi.fn((arr: string[]) => arr),
  formatVirusName: vi.fn((name: string) =>
    name.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
  ),
  isMobile: vi.fn(() => false),
}));

import {
  VirusThumbnailOverlay,
  showVirusThumbnailOverlay,
} from '../VirusThumbnailOverlay';

let onSelectSpy: ReturnType<typeof vi.fn>;
let onCloseSpy: ReturnType<typeof vi.fn>;
let mockVirusLoader: VirusLoaderInterface;

beforeEach(() => {
  // jsdom doesn't implement scrollIntoView
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  Element.prototype.scrollIntoView = () => {};

  onSelectSpy = vi.fn();
  onCloseSpy = vi.fn();
  mockVirusLoader = {
    get isLabOpen() {
      return false;
    },
    loadVirus: vi.fn(),
    toggleLab: vi.fn(),
    pauseRandomization: vi.fn(),
  };
});

afterEach(() => {
  document.getElementById('virus-thumbnail-overlay')?.remove();
  document.body.style.overflow = '';
  vi.clearAllMocks();
});

function createOverlay(
  virusLoader?: VirusLoaderInterface
): VirusThumbnailOverlay {
  return new VirusThumbnailOverlay({
    onSelect: onSelectSpy,
    onClose: onCloseSpy,
    virusLoader,
  });
}

function getOverlayEl(): HTMLElement | null {
  return document.getElementById('virus-thumbnail-overlay');
}

function getSearchInput(): HTMLInputElement {
  const el = getOverlayEl()?.querySelector('.virus-search');
  if (!(el instanceof HTMLInputElement)) {
    throw new Error('Search input not found');
  }
  return el;
}

function getThumbnailItems(): HTMLElement[] {
  const overlay = getOverlayEl();
  if (!overlay) return [];
  return Array.from(
    overlay.querySelectorAll<HTMLElement>('.virus-thumbnail-item')
  );
}

function typeInSearch(value: string): void {
  const input = getSearchInput();
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function pressKey(
  key: string,
  target?: HTMLElement,
  extras?: KeyboardEventInit
): void {
  const el = target ?? getOverlayEl();
  if (!el) throw new Error('No element to dispatch key event on');
  el.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, ...extras })
  );
}

describe('VirusThumbnailOverlay', () => {
  describe('constructor', () => {
    it('creates overlay element in DOM with id virus-thumbnail-overlay', () => {
      createOverlay();
      const overlay = getOverlayEl();
      expect(overlay).not.toBeNull();
      expect(overlay?.id).toBe('virus-thumbnail-overlay');
    });

    it('contains search input with class virus-search', () => {
      createOverlay();
      const input = getOverlayEl()?.querySelector('.virus-search');
      expect(input).not.toBeNull();
      expect(input).toBeInstanceOf(HTMLInputElement);
    });

    it('contains thumbnail items for viruses', () => {
      createOverlay();
      const items = getThumbnailItems();
      expect(items.length).toBeGreaterThan(0);
      // Each item should have a data-virus attribute
      items.forEach(item => {
        expect(item.getAttribute('data-virus')).toBeTruthy();
      });
    });

    it('sets document.body.style.overflow to hidden', () => {
      createOverlay();
      expect(document.body.style.overflow).toBe('hidden');
    });
  });

  describe('destroy', () => {
    it('removes overlay from DOM', () => {
      const overlay = createOverlay();
      expect(getOverlayEl()).not.toBeNull();
      overlay.destroy();
      expect(getOverlayEl()).toBeNull();
    });

    it('restores body.style.overflow to empty string', () => {
      const overlay = createOverlay();
      expect(document.body.style.overflow).toBe('hidden');
      overlay.destroy();
      expect(document.body.style.overflow).toBe('');
    });

    it('double-destroy is safe and does not throw', () => {
      const overlay = createOverlay();
      overlay.destroy();
      expect(() => overlay.destroy()).not.toThrow();
    });
  });

  describe('search/filter', () => {
    it('typing in search filters visible items', () => {
      createOverlay();
      const allItems = getThumbnailItems();
      expect(allItems.length).toBeGreaterThan(1);

      // Search for a specific virus name that should match only one builtin
      typeInSearch('sphere');

      const visible = allItems.filter(
        item => !item.classList.contains('filtered-out')
      );
      const hidden = allItems.filter(item =>
        item.classList.contains('filtered-out')
      );
      expect(visible.length).toBeGreaterThan(0);
      expect(hidden.length).toBeGreaterThan(0);

      // All visible items should have "sphere" in their data-virus or label
      visible.forEach(item => {
        const virus = item.getAttribute('data-virus') ?? '';
        const label = item.querySelector('.virus-label')?.textContent ?? '';
        const matchesVirus = virus.toLowerCase().includes('sphere');
        const matchesLabel = label.toLowerCase().includes('sphere');
        expect(matchesVirus || matchesLabel).toBe(true);
      });
    });

    it('empty search shows all items', () => {
      createOverlay();
      const allItems = getThumbnailItems();

      // First filter to hide some items
      typeInSearch('sphere');
      const hiddenAfterFilter = allItems.filter(item =>
        item.classList.contains('filtered-out')
      );
      expect(hiddenAfterFilter.length).toBeGreaterThan(0);

      // Clear search
      typeInSearch('');
      const hiddenAfterClear = allItems.filter(item =>
        item.classList.contains('filtered-out')
      );
      expect(hiddenAfterClear.length).toBe(0);
    });

    it('search is case-insensitive', () => {
      createOverlay();
      const allItems = getThumbnailItems();

      typeInSearch('SPHERE');
      const visibleUpper = allItems.filter(
        item => !item.classList.contains('filtered-out')
      );

      typeInSearch('sphere');
      const visibleLower = allItems.filter(
        item => !item.classList.contains('filtered-out')
      );

      expect(visibleUpper.length).toBe(visibleLower.length);
      expect(visibleUpper.length).toBeGreaterThan(0);
    });
  });

  describe('keyboard navigation', () => {
    it('ArrowDown moves focus to the next item', () => {
      createOverlay();
      const items = getThumbnailItems();
      expect(items.length).toBeGreaterThan(1);

      // Focus spy on first item
      const focusSpy = vi.spyOn(items[0], 'focus');

      pressKey('ArrowDown');
      expect(focusSpy).toHaveBeenCalled();
    });

    it('ArrowUp wraps around to the last item from the start', () => {
      createOverlay();
      const items = getThumbnailItems();
      const lastItem = items[items.length - 1];
      const focusSpy = vi.spyOn(lastItem, 'focus');

      // currentFocusIndex starts at -1, ArrowUp when at <=0 wraps to last
      pressKey('ArrowUp');
      expect(focusSpy).toHaveBeenCalled();
    });

    it('Enter on focused item selects it', () => {
      createOverlay();
      const items = getThumbnailItems();
      expect(items.length).toBeGreaterThan(0);

      // Move focus to first item
      pressKey('ArrowDown');
      // Now press Enter
      pressKey('Enter');

      expect(onSelectSpy).toHaveBeenCalledTimes(1);
      const selectedVirus = items[0].getAttribute('data-virus');
      expect(onSelectSpy).toHaveBeenCalledWith(selectedVirus);
    });

    it('Escape closes overlay and calls onClose', () => {
      createOverlay();
      expect(getOverlayEl()).not.toBeNull();

      pressKey('Escape');

      expect(getOverlayEl()).toBeNull();
      expect(onCloseSpy).toHaveBeenCalledTimes(1);
    });

    it('/ key focuses search input', () => {
      createOverlay();
      const searchInput = getSearchInput();

      // Blur the search input first so we can verify / focuses it
      searchInput.blur();

      // Dispatch / from the overlay itself (not from the search input)
      const overlay = getOverlayEl()!;
      overlay.dispatchEvent(
        new KeyboardEvent('keydown', { key: '/', bubbles: true })
      );

      expect(document.activeElement).toBe(searchInput);
    });
  });

  describe('virus selection', () => {
    it('click on thumbnail item calls onSelect with virus name', () => {
      createOverlay();
      const items = getThumbnailItems();
      expect(items.length).toBeGreaterThan(0);

      const firstItem = items[0];
      const virusName = firstItem.getAttribute('data-virus');

      firstItem.click();

      expect(onSelectSpy).toHaveBeenCalledTimes(1);
      expect(onSelectSpy).toHaveBeenCalledWith(virusName);
    });

    it('selection destroys the overlay', () => {
      createOverlay();
      expect(getOverlayEl()).not.toBeNull();

      const items = getThumbnailItems();
      items[0].click();

      expect(getOverlayEl()).toBeNull();
    });

    it('selection closes lab if virusLoader.isLabOpen is true', () => {
      let labOpen = true;
      let toggleLabCallCount = 0;
      const loader: VirusLoaderInterface = {
        get isLabOpen() {
          return labOpen;
        },
        loadVirus: vi.fn(),
        toggleLab: vi.fn(() => {
          toggleLabCallCount++;
          labOpen = false;
        }),
        pauseRandomization: vi.fn(),
      };

      createOverlay(loader);
      const items = getThumbnailItems();
      items[0].click();

      expect(toggleLabCallCount).toBe(1);
    });
  });

  describe('cleanup', () => {
    it('after destroy, events on overlay are no-ops (AbortController cancelled)', () => {
      const overlay = createOverlay();

      // Capture the overlay element before destroy removes it
      const overlayEl = getOverlayEl()!;
      expect(overlayEl).not.toBeNull();

      overlay.destroy();

      // Re-attach the element to DOM so we can dispatch events on it
      document.body.appendChild(overlayEl);

      // Dispatching keyboard events should not trigger callbacks
      overlayEl.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
      expect(onCloseSpy).not.toHaveBeenCalled();

      // Clicking a thumbnail item should not trigger onSelect
      const items = overlayEl.querySelectorAll('.virus-thumbnail-item');
      if (items.length > 0) {
        (items[0] as HTMLElement).click();
      }
      expect(onSelectSpy).not.toHaveBeenCalled();

      // Clean up
      overlayEl.remove();
    });

    it('showVirusThumbnailOverlay factory creates and returns the overlay instance', () => {
      const instance = showVirusThumbnailOverlay({
        onSelect: onSelectSpy,
        onClose: onCloseSpy,
        virusLoader: mockVirusLoader,
      });

      expect(instance).toBeInstanceOf(VirusThumbnailOverlay);
      expect(getOverlayEl()).not.toBeNull();

      instance.destroy();
    });
  });
});
