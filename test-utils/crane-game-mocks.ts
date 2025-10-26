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
    },
    cabinet: {
      width: 10,
      depth: 10,
      prizeSize: 1,
    },
    prizes: {
      gridPadding: 1,
      numFillerPrizes: 5,
      dropHeightRange: [2, 8],
    },
    claw: {
      restingHeight: 5,
    },
    startingCredits: 10,
  };
}
