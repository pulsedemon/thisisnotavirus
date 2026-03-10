import type { MockInstance } from 'vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Playlist from '../Playlist';

// Mock the shuffle function to return a predictable order
vi.mock('../../utils/misc', () => ({
  shuffle: vi.fn((arr: string[]) => arr),
}));

describe('Playlist', () => {
  let getItemSpy: MockInstance<(key: string) => string | null>;
  let _setItemSpy: MockInstance<(key: string, value: string) => void>;

  beforeEach(() => {
    getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    _setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
  });

  describe('constructor', () => {
    it('should generate a playlist', () => {
      const playlist = new Playlist();
      expect(playlist.playlist.length).toBeGreaterThan(0);
    });

    it('should load saved mixes from localStorage', () => {
      new Playlist();
      expect(getItemSpy).toHaveBeenCalledWith('savedVirusMixes');
    });

    it('should start at index 0', () => {
      const playlist = new Playlist();
      expect(playlist.currentIndex).toBe(0);
    });

    it('should include saved mixes in the playlist when present', () => {
      const savedMixes = [
        { primary: 'sphere', secondary: 'cubes', mixRatio: 0.5, id: 123 },
      ];
      getItemSpy.mockReturnValue(JSON.stringify(savedMixes));

      const playlist = new Playlist();
      expect(playlist.savedMixes).toEqual(savedMixes);
      expect(playlist.playlist).toContain('mixed:123');
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      getItemSpy.mockReturnValue('not valid json{{{');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        /* suppress */
      });
      const playlist = new Playlist();
      expect(playlist.savedMixes).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('current', () => {
    it('should return the current virus name', () => {
      const playlist = new Playlist();
      const current = playlist.current();
      expect(typeof current).toBe('string');
      expect(current.length).toBeGreaterThan(0);
    });

    it('should return the first item when at index 0', () => {
      const playlist = new Playlist();
      const current = playlist.current();
      expect(current).toBe(playlist.playlist[0]);
    });

    it('should reset index if it is out of bounds', () => {
      const playlist = new Playlist();
      playlist.currentIndex = 999999;
      const current = playlist.current();
      expect(playlist.currentIndex).toBe(0);
      expect(current).toBe(playlist.playlist[0]);
    });
  });

  describe('next', () => {
    it('should advance to the next virus', () => {
      const playlist = new Playlist();
      playlist.current();
      const next = playlist.next();
      expect(next).toBe(playlist.playlist[1]);
    });

    it('should wrap around to the beginning when at the end', () => {
      const playlist = new Playlist();
      playlist.currentIndex = playlist.playlist.length - 1;
      const next = playlist.next();
      expect(playlist.currentIndex).toBe(0);
      expect(next).toBe(playlist.playlist[0]);
    });

    it('should return a string', () => {
      const playlist = new Playlist();
      expect(typeof playlist.next()).toBe('string');
    });
  });

  describe('prev', () => {
    it('should go back to the previous virus', () => {
      const playlist = new Playlist();
      playlist.currentIndex = 2;
      const prev = playlist.prev();
      expect(prev).toBe(playlist.playlist[1]);
    });

    it('should wrap to the end when at the beginning', () => {
      const playlist = new Playlist();
      playlist.currentIndex = 0;
      const prev = playlist.prev();
      expect(prev).toBe(playlist.playlist[playlist.playlist.length - 1]);
    });

    it('should return a string', () => {
      const playlist = new Playlist();
      expect(typeof playlist.prev()).toBe('string');
    });
  });

  describe('isMixedVirus', () => {
    it('should return true for a mixed virus identifier', () => {
      const playlist = new Playlist();
      expect(playlist.isMixedVirus('mixed:123')).toBe(true);
    });

    it('should return true for any string starting with mixed:', () => {
      const playlist = new Playlist();
      expect(playlist.isMixedVirus('mixed:456')).toBe(true);
      expect(playlist.isMixedVirus('mixed:0')).toBe(true);
    });

    it('should return true for default mix identifiers', () => {
      const playlist = new Playlist();
      expect(playlist.isMixedVirus('defaultMix:sphere-uzumaki')).toBe(true);
    });

    it('should return false for a regular virus name', () => {
      const playlist = new Playlist();
      expect(playlist.isMixedVirus('sphere')).toBe(false);
    });

    it("should return false for strings that contain but don't start with mixed:", () => {
      const playlist = new Playlist();
      expect(playlist.isMixedVirus('notmixed:123')).toBe(false);
    });
  });

  describe('getMixById', () => {
    it('should return the mix object for a valid id', () => {
      const savedMixes = [
        { primary: 'sphere', secondary: 'cubes', mixRatio: 0.5, id: 42 },
        { primary: 'doors', secondary: 'emoji', mixRatio: 0.7, id: 99 },
      ];
      getItemSpy.mockReturnValue(JSON.stringify(savedMixes));

      const playlist = new Playlist();
      const mix = playlist.getMixById('mixed:42');
      expect(mix).toEqual(savedMixes[0]);
    });

    it('should return undefined for a non-existent id', () => {
      getItemSpy.mockReturnValue('[]');
      const playlist = new Playlist();
      const mix = playlist.getMixById('mixed:999');
      expect(mix).toBeUndefined();
    });

    it('should parse the numeric id correctly from the mixed: prefix', () => {
      const savedMixes = [
        { primary: 'sphere', secondary: 'cubes', mixRatio: 0.5, id: 7 },
      ];
      getItemSpy.mockReturnValue(JSON.stringify(savedMixes));

      const playlist = new Playlist();
      const mix = playlist.getMixById('mixed:7');
      expect(mix).toBeDefined();
      expect(mix!.id).toBe(7);
    });
  });

  describe('defaultMixes', () => {
    it('should include default mixes in the generated playlist', () => {
      const playlist = new Playlist();
      expect(playlist.playlist).toContain('defaultMix:sphere-uzumaki');
    });

    it('should have the uzumaki-sphere default mix', () => {
      const playlist = new Playlist();
      expect(playlist.defaultMixes).toContainEqual({
        primary: 'sphere',
        secondary: 'uzumaki',
        mixRatio: 0.5,
        name: 'sphere-uzumaki',
      });
    });
  });

  describe('getDefaultMixByName', () => {
    it('should return the default mix for a valid name', () => {
      const playlist = new Playlist();
      const mix = playlist.getDefaultMixByName('defaultMix:sphere-uzumaki');
      expect(mix).toEqual({
        primary: 'sphere',
        secondary: 'uzumaki',
        mixRatio: 0.5,
        name: 'sphere-uzumaki',
      });
    });

    it('should return undefined for a non-existent name', () => {
      const playlist = new Playlist();
      const mix = playlist.getDefaultMixByName('defaultMix:nonexistent');
      expect(mix).toBeUndefined();
    });
  });

  describe('setCurrentVirus', () => {
    it('should set the current index to the virus if it exists in the playlist', () => {
      const playlist = new Playlist();
      const targetVirus = playlist.playlist[5];
      playlist.setCurrentVirus(targetVirus);
      expect(playlist.currentIndex).toBe(5);
      expect(playlist.current()).toBe(targetVirus);
    });

    it('should insert the virus into the playlist if not found', () => {
      const playlist = new Playlist();
      const originalLength = playlist.playlist.length;
      playlist.setCurrentVirus('mixed:9999');
      expect(playlist.playlist).toContain('mixed:9999');
      expect(playlist.playlist.length).toBe(originalLength + 1);
    });

    it('should make the inserted virus the current one', () => {
      const playlist = new Playlist();
      playlist.setCurrentVirus('mixed:9999');
      expect(playlist.current()).toBe('mixed:9999');
    });
  });
});
