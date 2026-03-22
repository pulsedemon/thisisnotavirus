import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadSavedMixes, saveMixes } from '../savedMixes';

describe('savedMixes', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadSavedMixes', () => {
    it('returns an empty array when no data is stored', () => {
      expect(loadSavedMixes()).toEqual([]);
    });

    it('returns parsed mixes from localStorage', () => {
      const mixes = [
        { primary: 'sphere', secondary: 'uzumaki', mixRatio: 0.5, id: 123 },
      ];
      localStorage.setItem('savedVirusMixes', JSON.stringify(mixes));
      expect(loadSavedMixes()).toEqual(mixes);
    });

    it('returns an empty array for invalid JSON', () => {
      localStorage.setItem('savedVirusMixes', 'not valid json');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        /* suppress */
      });
      expect(loadSavedMixes()).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('returns an empty array for empty string', () => {
      localStorage.setItem('savedVirusMixes', '');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        /* suppress */
      });
      expect(loadSavedMixes()).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('saveMixes', () => {
    it('saves mixes to localStorage and returns true', () => {
      const mixes = [
        { primary: 'sphere', secondary: 'uzumaki', mixRatio: 0.5, id: 123 },
      ];
      expect(saveMixes(mixes)).toBe(true);
      expect(localStorage.getItem('savedVirusMixes')).toBe(
        JSON.stringify(mixes)
      );
    });

    it('returns false when localStorage.setItem throws', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        /* suppress */
      });

      expect(saveMixes([])).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      vi.restoreAllMocks();
    });

    it('saves an empty array', () => {
      expect(saveMixes([])).toBe(true);
      expect(localStorage.getItem('savedVirusMixes')).toBe('[]');
    });
  });
});
