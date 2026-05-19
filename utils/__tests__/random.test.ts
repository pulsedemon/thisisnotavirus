import { describe, it, expect } from 'vitest';
import {
  randomBool,
  randomInt,
  randomFloat,
  randomIntBetween,
  randomItem,
} from '../random';

describe('Random Utility', () => {
  describe('randomBool', () => {
    it('should return a boolean value', () => {
      const result = randomBool();
      expect(typeof result).toBe('boolean');
    });

    it('should return true or false randomly', () => {
      const results = Array.from({ length: 100 }, () => randomBool());
      const hasTrue = results.includes(true);
      const hasFalse = results.includes(false);
      expect(hasTrue).toBe(true);
      expect(hasFalse).toBe(true);
    });
  });

  describe('randomInt', () => {
    it('should return an integer between 0 and max (exclusive)', () => {
      const max = 10;
      const result = randomInt(max);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(max);
    });

    it('should return integer within bounds', () => {
      for (let i = 0; i < 50; i++) {
        const result = randomInt(5);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(5);
        expect(Number.isInteger(result)).toBe(true);
      }
    });
  });

  describe('randomFloat', () => {
    it('should return a number between min and max', () => {
      const min = 1;
      const max = 5;
      const result = randomFloat(min, max);
      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThanOrEqual(max);
      expect(typeof result).toBe('number');
    });

    it('should work with negative numbers', () => {
      const min = -5;
      const max = -1;
      const result = randomFloat(min, max);
      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThanOrEqual(max);
    });
  });

  describe('randomIntBetween', () => {
    it('should return an integer between min and max', () => {
      const min = 2;
      const max = 7;
      const result = randomIntBetween(min, max);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThanOrEqual(max);
    });

    it('is inclusive of both bounds', () => {
      // Sample enough times that hitting both bounds is overwhelmingly likely
      const seen = new Set<number>();
      for (let i = 0; i < 1000; i++) {
        const v = randomIntBetween(2, 5);
        expect(v).toBeGreaterThanOrEqual(2);
        expect(v).toBeLessThanOrEqual(5);
        seen.add(v);
      }
      // With 1000 samples over 4 values, all four should appear
      expect(seen).toEqual(new Set([2, 3, 4, 5]));
    });

    it('handles min === max by returning min', () => {
      for (let i = 0; i < 10; i++) {
        expect(randomIntBetween(7, 7)).toBe(7);
      }
    });
  });

  describe('randomItem', () => {
    it('should return an item from the array', () => {
      const array = ['a', 'b', 'c'];
      const result = randomItem(array);
      expect(array).toContain(result);
    });

    it('should return undefined for empty array', () => {
      const result = randomItem([]);
      expect(result).toBeUndefined();
    });
  });
});
