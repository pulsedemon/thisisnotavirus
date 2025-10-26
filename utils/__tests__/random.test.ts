import { describe, it, expect } from "vitest";
import Random from "../random";

describe("Random Utility", () => {
  describe("bool", () => {
    it("should return a boolean value", () => {
      const result = Random.bool();
      expect(typeof result).toBe("boolean");
    });

    it("should return true or false randomly", () => {
      const results = Array.from({ length: 100 }, () => Random.bool());
      const hasTrue = results.includes(true);
      const hasFalse = results.includes(false);
      expect(hasTrue).toBe(true);
      expect(hasFalse).toBe(true);
    });
  });

  describe("int", () => {
    it("should return an integer between 0 and max (exclusive)", () => {
      const max = 10;
      const result = Random.int(max);
      expect(Number.isInteger(result)).toBe(true);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(max);
    });

    it("should return integer within bounds", () => {
      for (let i = 0; i < 50; i++) {
        const result = Random.int(5);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(5);
        expect(Number.isInteger(result)).toBe(true);
      }
    });
  });

  describe("floatBetween", () => {
    it("should return a number between min and max", () => {
      const min = 1;
      const max = 5;
      const result = Random.floatBetween(min, max);
      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThanOrEqual(max);
      expect(typeof result).toBe("number");
    });

    it("should work with negative numbers", () => {
      const min = -5;
      const max = -1;
      const result = Random.floatBetween(min, max);
      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThanOrEqual(max);
    });
  });

  describe("numberBetween", () => {
    it("should return a number between min and max", () => {
      const min = 2.5;
      const max = 7.5;
      const result = Random.numberBetween(min, max);
      expect(result).toBeGreaterThanOrEqual(min);
      expect(result).toBeLessThanOrEqual(max);
    });
  });

  describe("itemInArray", () => {
    it("should return an item from the array", () => {
      const array = ["a", "b", "c"];
      const result = Random.itemInArray(array);
      expect(array).toContain(result);
    });

    it("should return undefined for empty array", () => {
      const result = Random.itemInArray([]);
      expect(result).toBeUndefined();
    });
  });
});
