import * as THREE from "three";
import { GAME_CONFIG } from "./config";

export class CraneRope {
  segments: THREE.Mesh[] = [];
  joints: THREE.Vector3[] = [];
  segmentLength: number;
  segmentCount: number;
  damping: number;
  stiffness: number;

  constructor(startPos: THREE.Vector3, endPos: THREE.Vector3) {
    this.segmentLength = GAME_CONFIG.animation.ropeSegmentLength;
    this.segmentCount = GAME_CONFIG.animation.ropeSegmentCount;
    this.damping = GAME_CONFIG.animation.ropeDamping;
    this.stiffness = GAME_CONFIG.animation.ropeStiffness;
    this.createRope(startPos, endPos);
  }

  createRope(start: THREE.Vector3, end: THREE.Vector3) {
    // Create rope segments with physics
    for (let i = 0; i <= this.segmentCount; i++) {
      const geometry = new THREE.CylinderGeometry(
        0.02,
        0.02,
        this.segmentLength,
      );
      const material = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.8,
        roughness: 0.2,
      });
      const segment = new THREE.Mesh(geometry, material);

      // Position segments along rope
      const t = i / this.segmentCount;
      segment.position.lerpVectors(start, end, t);
      this.segments.push(segment);

      this.joints.push(segment.position.clone());
    }
  }

  updatePhysics(gravity = 0.02, wind = 0.01) {
    // Apply gravity and wind to all joints except fixed ends
    for (let i = 1; i < this.joints.length - 1; i++) {
      const joint = this.joints[i];

      // Apply gravity
      joint.y -= gravity;

      // Add slight wind effect for more realism
      joint.x += (Math.random() - 0.5) * wind;
      joint.z += (Math.random() - 0.5) * wind;
    }

    // Multiple constraint iterations for stability
    for (let iteration = 0; iteration < 3; iteration++) {
      for (let i = 1; i < this.joints.length - 1; i++) {
        // Maintain distance constraints
        this.constrainDistance(i - 1, i, this.segmentLength);
        this.constrainDistance(i, i + 1, this.segmentLength);
      }
    }

    // Update mesh positions and orientations
    this.segments.forEach((segment, i) => {
      if (i < this.joints.length - 1) {
        segment.position.copy(this.joints[i]);
        segment.lookAt(this.joints[i + 1]);
      }
    });
  }

  private constrainDistance(
    index1: number,
    index2: number,
    targetDistance: number,
  ) {
    const joint1 = this.joints[index1];
    const joint2 = this.joints[index2];

    const delta = joint2.clone().sub(joint1);
    const distance = delta.length();

    if (distance > 0) {
      const difference = (distance - targetDistance) / distance;
      const offset = delta.multiplyScalar(difference * this.stiffness);

      // Don't move the first joint (fixed point)
      if (index1 > 0) {
        joint1.add(offset.multiplyScalar(0.5));
      }
      if (index2 < this.joints.length - 1) {
        joint2.sub(offset.multiplyScalar(0.5));
      }
    }
  }

  updateEndPosition(endPos: THREE.Vector3) {
    // Update the last joint position (claw attachment point)
    this.joints[this.joints.length - 1].copy(endPos);
  }
}
