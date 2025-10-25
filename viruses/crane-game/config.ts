import * as THREE from "three";

/**
 * Game configuration constants
 * Centralized settings for easy maintenance and balance adjustments
 *
 * Usage:
 * - Modify these values to adjust game balance, physics, and visual settings
 * - All values are used throughout the game code via the GAME_CONFIG import
 * - Changes here will affect the entire game behavior
 */
export const GAME_CONFIG = {
  cabinet: {
    width: 20,
    height: 25,
    depth: 20,
    prizeSize: 1.3,
  },
  claw: {
    restingHeight: 10,
    descendSpeed: 0.2,
    ascendSpeed: 0.15,
    grabRadius: 1.8,
    maxGrabCount: 1,
    grabSuccessRate: 0.75,
  },
  physics: {
    gravity: { x: 0.0, y: -100.0, z: 0.0 },
    floorY: -10,
    binPosition: new THREE.Vector3(8, -5, 8),
  },
  prizes: {
    gridPadding: 2,
    dropHeightRange: [2, 15],
    numFillerPrizes: 200,
  },
  animation: {
    ropeSegmentLength: 0.5,
    ropeSegmentCount: 20,
    ropeDamping: 0.98,
    ropeStiffness: 0.95,
  },
  startingCredits: 15,
} as const;

/**
 * Type definitions for better type safety
 */
export type GameConfig = typeof GAME_CONFIG;
