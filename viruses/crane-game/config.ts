import * as THREE from "three";

/**
 * Arcade color palette used throughout the game
 */
export const ARCADE_COLORS = {
  MAGENTA: 0xff00ff,
  CYAN: 0x00ffff,
  YELLOW: 0xffff00,
  PINK: 0xff1493,
  RED: 0xff0000,
  WHITE: 0xffffff,
  BLACK: 0x000000,
  GRAY: 0x888888,
  DARK_GRAY: 0x333333,
  LIGHT_GRAY: 0xf8f8f8,
  ORANGE: 0xff9900,
} as const;

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
    prizeSize: 1.9,
    baseHeight: 12,
    marqueeHeight: 3,
    panelWidth: 8,
    panelHeight: 4,
    panelDepth: 1,
    glassThickness: 0.15,
    framePostSize: 0.4,
  },
  claw: {
    restingHeight: 10,
    descendSpeed: 0.2,
    ascendSpeed: 0.15,
    grabRadius: 1.8,
    maxGrabCount: 1,
    grabSuccessRate: 0.75,
    boundaries: {
      minX: -8,
      maxX: 8,
      minZ: -8,
      maxZ: 8,
    },
    moveSpeed: 0.3,
  },
  physics: {
    gravity: { x: 0.0, y: -100.0, z: 0.0 },
    floorY: -10,
    binPosition: new THREE.Vector3(8, -5, 8),
    binWidth: 4,
    binDepth: 4,
    binHeight: 5,
    binDistanceThreshold: 4,
  },
  prizes: {
    gridPadding: 4,
    dropHeightRange: [2, 15],
    sphereSegments: { width: 16, height: 12 },
    radiusMultiplier: 0.6,
    brightnessRange: [0.05, 0.15],
    roughnessRange: [0.6, 0.9],
    weightRange: [0.8, 1.2],
    bouncinessRange: [0.1, 0.3],
    friction: 0.8,
  },
  animation: {
    ropeSegmentLength: 0.5,
    ropeSegmentCount: 20,
    ropeDamping: 0.98,
    ropeStiffness: 0.95,
  },
  ui: {
    joystickSize: 120,
    mobileControlsHeight: 200,
  },
  performance: {
    targetFPS: 30,
    frameInterval: 1000 / 30,
  },
  leds: {
    topCount: 20,
    sideCount: 10,
    size: 0.25,
    topRadius: 11,
  },
  startingCredits: 15,
} as const;

/**
 * Type definitions for better type safety
 */
export type GameConfig = typeof GAME_CONFIG;
