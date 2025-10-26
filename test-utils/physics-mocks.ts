import { vi } from "vitest";

/**
 * Mock implementation of Rapier Vector3
 */
export class MockRapierVector3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

/**
 * Creates a mock rigid body with common physics properties
 *
 * @returns A mock rigid body with common Rapier physics methods
 */
export function createMockRigidBody() {
  return {
    setTranslation: vi.fn(),
    setLinvel: vi.fn(),
    applyImpulse: vi.fn(),
    linvel: vi.fn().mockReturnValue({ x: 0, y: 0, z: 0 }),
  };
}

/**
 * Mock implementation of PhysicsManager
 *
 * This provides a mock for the Rapier physics engine manager
 * used in the crane game.
 */
export class MockPhysicsManager {
  createStaticBox = vi.fn();
  createDynamicSphere = vi.fn().mockReturnValue(createMockRigidBody());
  step = vi.fn();
  syncMeshWithBody = vi.fn();
  removeBody = vi.fn();
}
