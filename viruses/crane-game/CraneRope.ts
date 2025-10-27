import * as THREE from "three";
import { GAME_CONFIG } from "./config";

export class CraneRope {
  segments: THREE.Mesh[] = [];
  joints: THREE.Vector3[] = [];
  segmentLength: number;
  segmentCount: number;
  damping: number;
  stiffness: number;

  // Shared geometry and material for all segments
  private sharedGeometry: THREE.CylinderGeometry;
  private sharedMaterial: THREE.MeshStandardMaterial;

  // Object pool for temporary vectors to avoid allocations
  private tempVector1 = new THREE.Vector3();
  private tempVector2 = new THREE.Vector3();
  private tempVector3 = new THREE.Vector3();

  // Pre-calculated wind values to avoid Math.random() calls
  private windValues: number[] = [];
  private windIndex = 0;

  // Cached calculations for better performance
  private readonly jointCountMinus1: number;
  private readonly jointCountMinus2: number;

  // Small epsilon value to prevent division by zero
  private static readonly EPSILON = GAME_CONFIG.animation.ropePhysics.epsilon;

  constructor(startPos: THREE.Vector3, endPos: THREE.Vector3) {
    this.segmentLength = GAME_CONFIG.animation.ropeSegmentLength;
    this.segmentCount = GAME_CONFIG.animation.ropeSegmentCount;
    this.damping = GAME_CONFIG.animation.ropeDamping;
    this.stiffness = GAME_CONFIG.animation.ropeStiffness;

    // Cache frequently used calculations
    this.jointCountMinus1 = this.segmentCount;
    this.jointCountMinus2 = this.segmentCount - 1;

    // Create shared geometry and material once
    this.sharedGeometry = new THREE.CylinderGeometry(
      GAME_CONFIG.animation.ropeGeometry.radius,
      GAME_CONFIG.animation.ropeGeometry.radius,
      this.segmentLength,
    );
    this.sharedMaterial = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.animation.ropeGeometry.color,
      metalness: GAME_CONFIG.animation.ropeGeometry.metalness,
      roughness: GAME_CONFIG.animation.ropeGeometry.roughness,
    });

    // Pre-generate wind values for better performance
    this.preGenerateWindValues();

    this.createRope(startPos, endPos);
  }

  private preGenerateWindValues() {
    // Pre-generate wind values to avoid Math.random() calls during physics
    const windCount = GAME_CONFIG.animation.ropePhysics.windValueCount;
    this.windValues = new Array<number>(windCount);
    for (let i = 0; i < windCount; i++) {
      this.windValues[i] = Math.random() - 0.5;
    }
  }

  createRope(start: THREE.Vector3, end: THREE.Vector3) {
    // Create rope segments with physics using shared geometry and material
    for (let i = 0; i <= this.segmentCount; i++) {
      const segment = new THREE.Mesh(this.sharedGeometry, this.sharedMaterial);

      // Position segments along rope
      const t = i / this.segmentCount;
      segment.position.lerpVectors(start, end, t);
      this.segments.push(segment);

      this.joints.push(segment.position.clone());
    }
  }

  updatePhysics(gravity = 0.02, wind = 0.01) {
    // Apply gravity and wind to all joints except fixed ends
    for (let i = 1; i < this.jointCountMinus1; i++) {
      const joint = this.joints[i];

      // Apply gravity
      joint.y -= gravity;

      // Add wind effect using pre-generated values for better performance
      const windX = this.getNextWindValue() * wind;
      const windZ = this.getNextWindValue() * wind;
      joint.x += windX;
      joint.z += windZ;
    }

    // Multiple constraint iterations for stability with early exit optimization
    let maxConstraintError = 0;
    const maxIterations = GAME_CONFIG.animation.ropePhysics.maxIterations;
    const constraintThreshold =
      GAME_CONFIG.animation.ropePhysics.constraintThreshold;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      maxConstraintError = 0;
      for (let i = 1; i < this.jointCountMinus1; i++) {
        // Maintain distance constraints and track error
        const error1 = this.constrainDistance(i - 1, i, this.segmentLength);
        const error2 = this.constrainDistance(i, i + 1, this.segmentLength);
        maxConstraintError = Math.max(maxConstraintError, error1, error2);
      }

      // Early exit if constraints are satisfied
      if (maxConstraintError < constraintThreshold) {
        break;
      }
    }

    // Update mesh positions and orientations
    this.segments.forEach((segment, i) => {
      if (i < this.jointCountMinus1) {
        segment.position.copy(this.joints[i]);
        segment.lookAt(this.joints[i + 1]);
      }
    });
  }

  private getNextWindValue(): number {
    const value = this.windValues[this.windIndex];
    this.windIndex = (this.windIndex + 1) % this.windValues.length;
    return value;
  }

  private constrainDistance(
    index1: number,
    index2: number,
    targetDistance: number,
  ): number {
    const joint1 = this.joints[index1];
    const joint2 = this.joints[index2];

    // Use object pool to avoid allocations
    const delta = this.tempVector1.copy(joint2).sub(joint1);
    const distance = delta.length();
    const constraintError = Math.abs(distance - targetDistance);

    // Use epsilon check to prevent division by zero and numerical instability
    if (distance > CraneRope.EPSILON) {
      const difference = (distance - targetDistance) / distance;
      const offset = this.tempVector2
        .copy(delta)
        .multiplyScalar(difference * this.stiffness);

      // Don't move the first joint (fixed point)
      if (index1 > 0) {
        joint1.add(this.tempVector3.copy(offset).multiplyScalar(0.5));
      }
      if (index2 < this.jointCountMinus1) {
        joint2.sub(this.tempVector3.copy(offset).multiplyScalar(0.5));
      }
    }

    return constraintError;
  }

  updateEndPosition(endPos: THREE.Vector3) {
    // Update the last joint position (claw attachment point)
    this.joints[this.joints.length - 1].copy(endPos);
  }

  // Cleanup method to dispose of resources
  dispose() {
    this.sharedGeometry.dispose();
    this.sharedMaterial.dispose();
    this.segments.forEach((segment) => {
      segment.geometry.dispose();
      if (segment.material instanceof THREE.Material) {
        segment.material.dispose();
      }
    });
  }
}
