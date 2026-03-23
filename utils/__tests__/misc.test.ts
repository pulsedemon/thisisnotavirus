import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isMobile,
  _resetIsMobileCache,
  shuffle,
  stripTags,
  formatVirusName,
  preloadImage,
} from '../misc';

// Mock ua-parser-js
vi.mock('ua-parser-js', () => {
  return {
    UAParser: class MockUAParser {
      getResult() {
        return {
          device: { type: undefined },
          browser: { name: 'Chrome' },
        };
      }
    },
  };
});

describe('Misc Utilities', () => {
  describe('isMobile', () => {
    let originalNavigator: Navigator;
    let originalInnerWidth: number;
    let hadOntouchstart: boolean;

    beforeEach(() => {
      _resetIsMobileCache();
      originalNavigator = window.navigator;
      originalInnerWidth = window.innerWidth;
      hadOntouchstart = 'ontouchstart' in window;
    });

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        value: originalInnerWidth,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'navigator', {
        value: originalNavigator,
        writable: true,
        configurable: true,
      });
      if (hadOntouchstart && !('ontouchstart' in window)) {
        (window as unknown as Record<string, unknown>).ontouchstart = null;
      } else if (!hadOntouchstart && 'ontouchstart' in window) {
        delete (window as unknown as Record<string, unknown>).ontouchstart;
      }
      vi.restoreAllMocks();
    });

    it('should return true when screen is small and has touch', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true,
        configurable: true,
      });
      (window as unknown as Record<string, unknown>).ontouchstart = null;
      expect(isMobile()).toBe(true);
    });

    it('should return false when screen is small but no touch', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'navigator', {
        value: {
          ...originalNavigator,
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          maxTouchPoints: 0,
        },
        writable: true,
        configurable: true,
      });
      const hadOntouchstart = 'ontouchstart' in window;
      if (hadOntouchstart) {
        delete (window as unknown as Record<string, unknown>).ontouchstart;
      }
      expect(isMobile()).toBe(false);
      if (hadOntouchstart) {
        (window as unknown as Record<string, unknown>).ontouchstart = null;
      }
    });

    it('should return false for touchscreen laptop with large screen', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 1920,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'navigator', {
        value: {
          ...originalNavigator,
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          maxTouchPoints: 5,
        },
        writable: true,
        configurable: true,
      });
      (window as unknown as Record<string, unknown>).ontouchstart = null;
      expect(isMobile()).toBe(false);
    });

    it('should return true when userAgent contains mobile identifier', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          ...originalNavigator,
          userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          maxTouchPoints: 0,
        },
        writable: true,
        configurable: true,
      });
      // Even with large screen, user agent match should return true
      Object.defineProperty(window, 'innerWidth', {
        value: 1920,
        writable: true,
        configurable: true,
      });
      expect(isMobile()).toBe(true);
    });

    it('should return false for desktop with large screen and no touch', () => {
      Object.defineProperty(window, 'navigator', {
        value: {
          ...originalNavigator,
          userAgent:
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          maxTouchPoints: 0,
        },
        writable: true,
        configurable: true,
      });
      Object.defineProperty(window, 'innerWidth', {
        value: 1920,
        writable: true,
        configurable: true,
      });
      // Remove ontouchstart to simulate a non-touch desktop environment
      // jsdom defines ontouchstart by default, but real desktops don't have it
      const hadOntouchstart = 'ontouchstart' in window;
      if (hadOntouchstart) {
        delete (window as unknown as Record<string, unknown>).ontouchstart;
      }
      expect(isMobile()).toBe(false);
      if (hadOntouchstart) {
        (window as unknown as Record<string, unknown>).ontouchstart = null;
      }
    });

    it('should return a boolean value', () => {
      const result = isMobile();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('shuffle', () => {
    it('should return the same array reference (mutates in place)', () => {
      const arr = ['a', 'b', 'c', 'd'];
      const result = shuffle(arr);
      expect(result).toBe(arr);
    });

    it('should return an array of the same length', () => {
      const arr = ['a', 'b', 'c', 'd', 'e'];
      const result = shuffle(arr);
      expect(result.length).toBe(5);
    });

    it('should contain the same elements', () => {
      const arr = ['a', 'b', 'c', 'd', 'e'];
      const original = [...arr];
      shuffle(arr);
      expect(arr.sort()).toEqual(original.sort());
    });

    it('should not crash on empty array', () => {
      const arr: string[] = [];
      expect(() => shuffle(arr)).not.toThrow();
      expect(shuffle(arr)).toEqual([]);
    });

    it('should handle single element array', () => {
      const arr = ['only'];
      const result = shuffle(arr);
      expect(result).toEqual(['only']);
    });
  });

  describe('stripTags', () => {
    it('should strip HTML tags from a string', () => {
      expect(stripTags('<p>Hello</p>')).toBe('Hello');
    });

    it('should handle nested tags', () => {
      expect(stripTags('<div><span>Text</span></div>')).toBe('Text');
    });

    it('should handle tags with attributes', () => {
      expect(stripTags('<a href="http://example.com">Link</a>')).toBe('Link');
    });

    it('should return empty string for tags with no content', () => {
      expect(stripTags('<br/><hr/>')).toBe('');
    });

    it('should return the same string if no tags present', () => {
      expect(stripTags('No tags here')).toBe('No tags here');
    });

    it('should handle empty string', () => {
      expect(stripTags('')).toBe('');
    });

    it('should strip multiple tags', () => {
      expect(stripTags('<b>Bold</b> and <i>Italic</i>')).toBe(
        'Bold and Italic'
      );
    });
  });

  describe('formatVirusName', () => {
    it('should replace dashes with spaces and capitalize words', () => {
      expect(formatVirusName('random-shapes')).toBe('Random Shapes');
    });

    it('should capitalize a single word', () => {
      expect(formatVirusName('sphere')).toBe('Sphere');
    });

    it('should handle multiple dashes', () => {
      expect(formatVirusName('a-b-c')).toBe('A B C');
    });

    it('should handle already capitalized words', () => {
      expect(formatVirusName('Already-Capitalized')).toBe(
        'Already Capitalized'
      );
    });

    it('should handle empty string', () => {
      expect(formatVirusName('')).toBe('');
    });

    it('should handle crane-game', () => {
      expect(formatVirusName('crane-game')).toBe('Crane Game');
    });
  });

  describe('preloadImage', () => {
    it('should not throw when called with a URL', () => {
      expect(() => preloadImage('https://example.com/image.png')).not.toThrow();
    });

    it('should not throw when called with an empty string', () => {
      expect(() => preloadImage('')).not.toThrow();
    });
  });
});
