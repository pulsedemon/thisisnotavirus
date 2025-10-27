import { vi } from "vitest";

/**
 * Mock implementation of the Cabinet class
 *
 * This provides a mock for the arcade cabinet that houses the crane game,
 * including gears, LED strips, and floor textures.
 */
export class MockCabinet {
  cabinet: Record<string, unknown> = {};
  mainGear = {
    rotation: { z: 0 },
  };
  smallGears: { rotation: { z: number } }[] = [{ rotation: { z: 0 } }];
  ledStrips: {
    material: {
      emissiveIntensity: number;
      emissive: Record<string, unknown>;
      color: Record<string, unknown>;
    };
  }[] = [
    {
      material: {
        emissiveIntensity: 0,
        emissive: {},
        color: {},
      },
    },
  ];
  floorCanvas = {
    getContext: vi.fn(() => ({
      fillStyle: "",
      fillRect: vi.fn(),
      strokeStyle: "",
      lineWidth: 0,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    })),
    width: 256,
    height: 256,
  };
  floorTexture = {};
  controlPanel = {
    setCamera: vi.fn(),
  };
  updateJoystickFromKeyboard = vi.fn();
}

/**
 * Mock implementation of the ClawManager class
 *
 * This manages the claw's state and movement in the crane game.
 */
export class MockClawManager {
  claw = {};
  clawProng1 = {};
  clawProng2 = {};
  clawProng3 = {};
  craneRope = {};
  dropClaw = vi.fn().mockReturnValue(true);
  update = vi.fn();
  updateClaw = vi.fn();
  setupDependencies = vi.fn();
  isDescending = false;
  isAscending = false;
  isMovingToBin = false;
  isReturning = false;
  isGrabbing = false;
  clawPosition = { x: 0, y: 0, z: 0 };
}

/**
 * Mock implementation of the CraneRope class
 */
export class MockCraneRope {}

/**
 * Mock implementation of the ClawPhysics class
 */
export class MockClawPhysics {}

/**
 * Mock implementation of the AudioManager class
 */
export class MockAudioManager {
  playSound = vi.fn();
}

/**
 * Mock implementation of the AtmosphericEffects class
 */
export class MockAtmosphericEffects {
  animate = vi.fn();
}

/**
 * Creates a mock game configuration for testing
 *
 * @returns A mock GAME_CONFIG object with all necessary properties
 */
export function createMockGameConfig() {
  return {
    physics: {
      binPosition: {
        x: 8,
        y: -5,
        z: 8,
        clone: vi.fn(() => ({ x: 8, y: -5, z: 8 })),
      },
      floorY: -10,
      binWidth: 4,
      binDepth: 4,
      binHeight: 5,
      binDistanceThreshold: 4,
    },
    cabinet: {
      width: 10,
      depth: 10,
      prizeSize: 1,
      baseHeight: 12,
      marqueeHeight: 3,
      panelWidth: 8,
      panelHeight: 4,
      panelDepth: 1,
      glassThickness: 0.15,
      framePostSize: 0.4,
    },
    prizes: {
      gridPadding: 1,
      numFillerPrizes: 5,
      dropHeightRange: [2, 8],
      sphereSegments: { width: 16, height: 12 },
      radiusMultiplier: 0.6,
      brightnessRange: [0.05, 0.15],
      roughnessRange: [0.6, 0.9],
      weightRange: [0.8, 1.2],
      bouncinessRange: [0.1, 0.3],
      friction: 0.8,
    },
    claw: {
      restingHeight: 5,
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
    startingCredits: 10,
  };
}
