import { describe, it, expect, vi } from "vitest";

// Mock Three.js for config tests
vi.mock("three", () => ({
  Vector3: vi.fn().mockImplementation(function (x = 0, y = 0, z = 0) {
    return {
      x,
      y,
      z,
      clone: vi.fn().mockReturnValue({ x, y, z }),
    };
  }),
}));

import { GAME_CONFIG } from "../config";

describe("GAME_CONFIG", () => {
  describe("physics configuration", () => {
    it("should have valid bin position", () => {
      expect(GAME_CONFIG.physics.binPosition).toBeDefined();
      expect(typeof GAME_CONFIG.physics.binPosition.x).toBe("number");
      expect(typeof GAME_CONFIG.physics.binPosition.y).toBe("number");
      expect(typeof GAME_CONFIG.physics.binPosition.z).toBe("number");
    });

    it("should have valid floor Y position", () => {
      expect(typeof GAME_CONFIG.physics.floorY).toBe("number");
      expect(GAME_CONFIG.physics.floorY).toBeLessThan(0); // Should be below ground level
    });
  });

  describe("cabinet configuration", () => {
    it("should have valid cabinet dimensions", () => {
      expect(GAME_CONFIG.cabinet.width).toBeGreaterThan(0);
      expect(GAME_CONFIG.cabinet.depth).toBeGreaterThan(0);
    });

    it("should have valid prize size", () => {
      expect(GAME_CONFIG.cabinet.prizeSize).toBeGreaterThan(0);
    });
  });

  describe("prizes configuration", () => {
    it("should have valid grid padding", () => {
      expect(GAME_CONFIG.prizes.gridPadding).toBeGreaterThanOrEqual(0);
    });

    it("should have valid drop height range", () => {
      expect(GAME_CONFIG.prizes.dropHeightRange).toHaveLength(2);
      expect(GAME_CONFIG.prizes.dropHeightRange[0]).toBeLessThan(
        GAME_CONFIG.prizes.dropHeightRange[1],
      );
    });

    it("should have valid number of filler prizes", () => {
      expect(GAME_CONFIG.prizes.numFillerPrizes).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(GAME_CONFIG.prizes.numFillerPrizes)).toBe(true);
    });
  });

  describe("claw configuration", () => {
    it("should have valid resting height", () => {
      expect(GAME_CONFIG.claw.restingHeight).toBeGreaterThan(0);
    });
  });

  describe("game configuration", () => {
    it("should have valid starting credits", () => {
      expect(GAME_CONFIG.startingCredits).toBeGreaterThan(0);
      expect(Number.isInteger(GAME_CONFIG.startingCredits)).toBe(true);
    });
  });
});
