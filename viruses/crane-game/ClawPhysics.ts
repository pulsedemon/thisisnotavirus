import * as THREE from "three";
import type RAPIER from "@dimforge/rapier3d-compat";
import type { PhysicsManager } from "./PhysicsManager";
import { GAME_CONFIG } from "./config";

export class ClawPhysics {
  rigidBody: RAPIER.RigidBody; // Public so game can sync position during special movements
  private physicsManager: PhysicsManager;
  private RAPIER: typeof RAPIER;

  // Claw properties
  position: THREE.Vector3 = new THREE.Vector3(0, 10, 0);
  targetPosition: THREE.Vector2 = new THREE.Vector2(0, 0);

  // Movement parameters
  moveSpeed = GAME_CONFIG.claw.moveSpeed;
  momentum = 0.1; // How much velocity accumulates
  damping = 0.92; // How quickly velocity decays
  boundaryBounce = 0.3; // Bounce factor when hitting walls

  // Boundaries
  minX = GAME_CONFIG.claw.boundaries.minX;
  maxX = GAME_CONFIG.claw.boundaries.maxX;
  minZ = GAME_CONFIG.claw.boundaries.minZ;
  maxZ = GAME_CONFIG.claw.boundaries.maxZ;

  // Swing effect
  swingIntensity = 0.05;
  swingRotation = 0;

  constructor(
    physicsManager: PhysicsManager,
    RapierModule: typeof RAPIER,
    startPosition: THREE.Vector3,
  ) {
    this.physicsManager = physicsManager;
    this.RAPIER = RapierModule;
    this.position.copy(startPosition);

    // Create kinematic rigid body for the claw
    const rigidBodyDesc =
      RapierModule.RigidBodyDesc.kinematicVelocityBased().setTranslation(
        startPosition.x,
        startPosition.y,
        startPosition.z,
      );

    this.rigidBody = physicsManager.world.createRigidBody(rigidBodyDesc);

    // Add a small collider for boundary detection
    const colliderDesc = RapierModule.ColliderDesc.ball(0.5).setSensor(true); // Sensor means it detects collisions but doesn't physically collide

    physicsManager.world.createCollider(colliderDesc, this.rigidBody);
  }

  /**
   * Update claw movement based on input
   */
  updateMovement(keys: Record<string, boolean>): void {
    const moveVector = new THREE.Vector3();

    // Gather input (keys are stored as lowercase, except arrow keys)
    if (keys["ArrowLeft"] || keys["a"]) {
      moveVector.x -= this.moveSpeed;
    }
    if (keys["ArrowRight"] || keys["d"]) {
      moveVector.x += this.moveSpeed;
    }
    if (keys["ArrowUp"] || keys["w"]) {
      moveVector.z -= this.moveSpeed;
    }
    if (keys["ArrowDown"] || keys["s"]) {
      moveVector.z += this.moveSpeed;
    }

    // Get current velocity
    const currentVel = this.rigidBody.linvel();
    const velocity = new THREE.Vector3(
      currentVel.x,
      currentVel.y,
      currentVel.z,
    );

    if (moveVector.length() > 0) {
      // Direct control - set velocity based on input (no momentum accumulation)
      velocity.x = moveVector.x;
      velocity.z = moveVector.z;

      // Calculate swing based on velocity
      const speed = Math.sqrt(
        velocity.x * velocity.x + velocity.z * velocity.z,
      );
      this.swingRotation =
        Math.sin(Date.now() * 0.01) * speed * this.swingIntensity;
    } else {
      // Stop immediately when no input
      velocity.x = 0;
      velocity.z = 0;

      // Reduce swing
      this.swingRotation *= 0.95;
    }

    // For kinematic bodies, we need to manually update position based on velocity
    // Apply velocity to position directly (kinematic bodies don't auto-integrate)
    this.position.x += velocity.x;
    this.position.z += velocity.z;

    // Update the rigid body's position
    this.rigidBody.setTranslation(
      { x: this.position.x, y: this.position.y, z: this.position.z },
      true,
    );

    // Also set velocity for consistency
    this.rigidBody.setLinvel({ x: velocity.x, y: 0, z: velocity.z }, true);

    // Apply boundary constraints with bounce
    this.applyBoundaries(velocity);

    // Update target position for smooth following
    this.targetPosition.x += (this.position.x - this.targetPosition.x) * 0.1;
    this.targetPosition.y += (this.position.z - this.targetPosition.y) * 0.1;
  }

  /**
   * Check and apply boundary constraint for a single axis
   */
  private applyAxisBoundary(
    axis: "x" | "z",
    min: number,
    max: number,
    velocity: THREE.Vector3,
  ): boolean {
    if (this.position[axis] < min) {
      this.position[axis] = min;
      velocity[axis] = Math.abs(velocity[axis]) * this.boundaryBounce;
      return true;
    } else if (this.position[axis] > max) {
      this.position[axis] = max;
      velocity[axis] = -Math.abs(velocity[axis]) * this.boundaryBounce;
      return true;
    }
    return false;
  }

  /**
   * Apply boundary constraints and bounce effect
   */
  private applyBoundaries(velocity: THREE.Vector3): void {
    const xBounced = this.applyAxisBoundary(
      "x",
      this.minX,
      this.maxX,
      velocity,
    );
    const zBounced = this.applyAxisBoundary(
      "z",
      this.minZ,
      this.maxZ,
      velocity,
    );

    // Update physics body if we bounced
    if (xBounced || zBounced) {
      this.rigidBody.setTranslation(
        { x: this.position.x, y: this.position.y, z: this.position.z },
        true,
      );
      this.rigidBody.setLinvel({ x: velocity.x, y: 0, z: velocity.z }, true);
    }
  }

  /**
   * Set the Y position (for descending/ascending)
   */
  setY(y: number): void {
    this.position.y = y;
    this.rigidBody.setTranslation(
      { x: this.position.x, y: this.position.y, z: this.position.z },
      true,
    );
  }

  /**
   * Get the current swing rotation for visual effect
   */
  getSwingRotation(): number {
    return this.swingRotation;
  }

  /**
   * Get current velocity magnitude (for sound effects, etc.)
   */
  getSpeed(): number {
    const vel = this.rigidBody.linvel();
    return Math.sqrt(vel.x * vel.x + vel.z * vel.z);
  }

  /**
   * Stop all movement
   */
  stop(): void {
    this.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  }

  /**
   * Clean up physics resources
   */
  destroy(): void {
    this.physicsManager.world.removeRigidBody(this.rigidBody);
  }
}
