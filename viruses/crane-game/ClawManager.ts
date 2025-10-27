import * as THREE from "three";
import { PhysicsManager } from "./PhysicsManager";
import { CraneRope } from "./CraneRope";
import { ClawPhysics } from "./ClawPhysics";
import { AudioManager } from "./AudioManager";
import { GAME_CONFIG } from "./config";
import { Prize } from "./types";

export class ClawManager {
  // Public interface for CraneGame
  claw: THREE.Group;
  clawProng1: THREE.Group;
  clawProng2: THREE.Group;
  clawProng3: THREE.Group;
  craneRope: CraneRope;

  // Claw state (moved from CraneGame)
  clawRestingHeight = GAME_CONFIG.claw.restingHeight;
  clawPosition: THREE.Vector3 = new THREE.Vector3(
    0,
    GAME_CONFIG.claw.restingHeight,
    0,
  );
  targetPosition: THREE.Vector2 = new THREE.Vector2(0, 0);
  isDescending = false;
  isGrabbing = false;
  isAscending = false;
  isMovingToBin = false;
  isReturning = false;
  clawOpenAngle = Math.PI / 6;
  clawClosedAngle = Math.PI / 3;
  currentClawAngle = Math.PI / 6;
  grabbedPrizes: Prize[] = [];
  wonPrizes: Prize[] = [];

  // Dependencies (will be set by CraneGame)
  private clawPhysics?: ClawPhysics;
  private keys: Record<string, boolean> = {};
  private joystickInput: { x: number; y: number } = { x: 0, y: 0 };
  private prizes: Prize[] = [];
  private prizeSize: number = GAME_CONFIG.cabinet.prizeSize;
  private binPosition: THREE.Vector3 = GAME_CONFIG.physics.binPosition.clone();
  private audioManager?: AudioManager;
  private physicsManager?: PhysicsManager;
  private scene: THREE.Scene;

  // Callbacks to CraneGame (for accessing external state)
  private onPrizeGrabbed?: (prizes: Prize[]) => void;
  private onPrizeDropped?: (prize: Prize) => void;
  private onPrizeWon?: (prize: Prize) => void;
  private onLose?: () => void;

  constructor(
    scene: THREE.Scene,
    physicsManager: PhysicsManager,
    binPosition: THREE.Vector3,
    prizeSize: number,
  ) {
    this.scene = scene;
    this.physicsManager = physicsManager;
    this.binPosition = binPosition;
    this.prizeSize = prizeSize;

    this.createClaw();
  }

  // Setup dependencies and callbacks
  setupDependencies(
    clawPhysics: ClawPhysics,
    keys: Record<string, boolean>,
    joystickInput: { x: number; y: number },
    prizes: Prize[],
    audioManager: AudioManager,
    callbacks: {
      onPrizeGrabbed: (prizes: Prize[]) => void;
      onPrizeDropped: (prize: Prize) => void;
      onPrizeWon: (prize: Prize) => void;
      onLose: () => void;
    },
  ) {
    this.clawPhysics = clawPhysics;
    this.keys = keys;
    this.joystickInput = joystickInput;
    this.prizes = prizes;
    this.audioManager = audioManager;
    this.onPrizeGrabbed = callbacks.onPrizeGrabbed;
    this.onPrizeDropped = callbacks.onPrizeDropped;
    this.onPrizeWon = callbacks.onPrizeWon;
    this.onLose = callbacks.onLose;

    // Sync clawPhysics position with our initial clawPosition
    if (this.clawPhysics) {
      this.clawPhysics.position.copy(this.clawPosition);
      this.clawPhysics.rigidBody.setTranslation(
        {
          x: this.clawPosition.x,
          y: this.clawPosition.y,
          z: this.clawPosition.z,
        },
        true,
      );
    }
  }

  // Update joystick input (called from CraneGame)
  updateJoystickInput(joystickInput: { x: number; y: number }): void {
    this.joystickInput = joystickInput;
  }

  // Public methods for CraneGame to call
  updateMovement() {
    this.updateClawMovement();
  }

  update() {
    this.updateClaw();
  }

  dropClaw() {
    // Check if claw is available to drop (not in motion)
    if (
      this.isDescending ||
      this.isAscending ||
      this.isMovingToBin ||
      this.isReturning ||
      this.isGrabbing
    ) {
      return false; // Failed - claw not available
    }

    this.isDescending = true;
    this.isGrabbing = false;
    this.grabbedPrizes = [];
    this.audioManager?.playSound("clawDescend", 0.7, 0.9);
    return true; // Success - drop initiated
  }

  // Private methods (moved from CraneGame)

  /**
   * Sync claw physics position with visual position and stop velocity
   */
  private syncClawPhysics(): void {
    if (!this.clawPhysics) return;

    this.clawPhysics.position.copy(this.clawPosition);
    this.clawPhysics.rigidBody.setTranslation(
      {
        x: this.clawPosition.x,
        y: this.clawPosition.y,
        z: this.clawPosition.z,
      },
      true,
    );
    this.clawPhysics.stop();
  }

  private createClaw() {
    this.claw = new THREE.Group();

    // Create rope physics system
    const topPosition = new THREE.Vector3(0, 15, 0);
    this.craneRope = new CraneRope(topPosition, this.clawPosition);

    // Add rope segments to scene
    this.craneRope.segments.forEach((segment) => {
      this.scene.add(segment);
    });

    // Claw base (connector) - bright and glowing
    const baseGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 8);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      metalness: 0.6,
      emissive: 0xffff00,
      emissiveIntensity: 0.3,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0;
    base.renderOrder = 999;
    this.claw.add(base);

    // Three prongs - bright yellow with glow
    const prongMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      metalness: 0.7,
      roughness: 0.3,
      emissive: 0xffaa00,
      emissiveIntensity: 0.4,
    });

    const createProng = () => {
      const prong = new THREE.Group();

      const prongGeometry = new THREE.CylinderGeometry(0.15, 0.1, 2, 8);
      const prongMesh = new THREE.Mesh(prongGeometry, prongMaterial);
      prongMesh.position.y = -1;
      prongMesh.castShadow = true;
      prongMesh.renderOrder = 999;

      // Claw tip
      const tipGeometry = new THREE.ConeGeometry(0.15, 0.5, 8);
      const tip = new THREE.Mesh(tipGeometry, prongMaterial);
      tip.position.y = -2.25;
      tip.castShadow = true;
      tip.renderOrder = 999;

      prong.add(prongMesh);
      prong.add(tip);

      return prong;
    };

    this.clawProng1 = createProng();
    this.clawProng2 = createProng();
    this.clawProng3 = createProng();

    this.claw.add(this.clawProng1);
    this.claw.add(this.clawProng2);
    this.claw.add(this.clawProng3);

    this.claw.position.copy(this.clawPosition);
    this.scene.add(this.claw);
  }

  private updateClawMovement() {
    if (
      this.isDescending ||
      this.isAscending ||
      this.isMovingToBin ||
      this.isReturning ||
      !this.clawPhysics
    )
      return;

    // Store old position for bounce detection
    const oldX = this.clawPhysics.position.x;
    const oldZ = this.clawPhysics.position.z;

    // Combine keyboard and joystick input
    const combinedInput = { ...this.keys };

    // Add joystick input to combined input
    if (
      Math.abs(this.joystickInput.x) > 0.1 ||
      Math.abs(this.joystickInput.y) > 0.1
    ) {
      // Joystick input takes precedence over keyboard
      combinedInput.a = this.joystickInput.x < -0.1;
      combinedInput.d = this.joystickInput.x > 0.1;
      combinedInput.w = this.joystickInput.y > 0.1; // Up joystick (positive Y) = W key
      combinedInput.s = this.joystickInput.y < -0.1; // Down joystick (negative Y) = S key

      // Also set arrow keys for compatibility
      combinedInput.ArrowLeft = this.joystickInput.x < -0.1;
      combinedInput.ArrowRight = this.joystickInput.x > 0.1;
      combinedInput.ArrowUp = this.joystickInput.y > 0.1; // Up joystick (positive Y) = ArrowUp
      combinedInput.ArrowDown = this.joystickInput.y < -0.1; // Down joystick (negative Y) = ArrowDown
    }

    // Update physics-based movement
    this.clawPhysics.updateMovement(combinedInput);

    // Sync clawPosition with physics
    this.clawPosition.copy(this.clawPhysics.position);
    this.targetPosition.copy(this.clawPhysics.targetPosition);

    // Apply swing rotation to visual
    this.claw.rotation.z = this.clawPhysics.getSwingRotation();

    // Play sound on boundary bounce (only when very close to actual boundary)
    if (
      (Math.abs(this.clawPhysics.position.x) >= 7.9 && Math.abs(oldX) < 7.9) ||
      (Math.abs(this.clawPhysics.position.z) >= 7.9 && Math.abs(oldZ) < 7.9)
    ) {
      this.audioManager?.playSound("clawBounce", 0.6, 1.0); // Boundary collision sound
    }
  }

  private updateClaw() {
    this.updateClawMovement();

    // Descending
    if (this.isDescending) {
      this.clawPosition.y -= GAME_CONFIG.claw.descendSpeed;
      if (this.clawPosition.y <= -7) {
        this.clawPosition.y = -7;
        this.isDescending = false;
        this.isGrabbing = true;
        this.startGrabbing();
      }
      // Sync Y position with physics
      if (this.clawPhysics) {
        this.clawPhysics.setY(this.clawPosition.y);
      }
    }

    // Ascending
    if (this.isAscending) {
      this.clawPosition.y += GAME_CONFIG.claw.ascendSpeed;

      // Check for prize drops during ascent
      this.checkForPrizeDrops();

      if (this.clawPosition.y >= this.clawRestingHeight) {
        this.clawPosition.y = this.clawRestingHeight;
        this.isAscending = false;
        this.isMovingToBin = true;
      }
      // Sync Y position with physics
      if (this.clawPhysics) {
        this.clawPhysics.setY(this.clawPosition.y);
      }
    }

    // Moving to bin
    if (this.isMovingToBin) {
      this.clawPosition.x += (this.binPosition.x - this.clawPosition.x) * 0.08;
      this.clawPosition.z += (this.binPosition.z - this.clawPosition.z) * 0.08;

      // Sync physics position during bin movement
      this.syncClawPhysics();

      // Check for prize drops during transport
      this.checkForPrizeDrops();

      const distanceToBin = Math.sqrt(
        Math.pow(this.binPosition.x - this.clawPosition.x, 2) +
          Math.pow(this.binPosition.z - this.clawPosition.z, 2),
      );

      if (distanceToBin < 0.05) {
        this.isMovingToBin = false;

        // Immediately release prizes when we reach the bin
        this.releasePrizesPhysics();

        // Open the claw
        setTimeout(() => {
          this.isGrabbing = false;
        }, 300);

        // Wait for prizes to fall, then return
        setTimeout(() => {
          this.isReturning = true;
        }, 1500);
      }
    }

    // Returning to center
    if (this.isReturning) {
      // Calculate distance to target
      const distanceToCenter = Math.sqrt(
        this.clawPosition.x * this.clawPosition.x +
          this.clawPosition.z * this.clawPosition.z +
          Math.pow(this.clawPosition.y - this.clawRestingHeight, 2),
      );

      // Use faster interpolation when far, slower when close
      const speed = distanceToCenter > 1 ? 0.08 : 0.15;

      // Smoother movement back to center
      this.clawPosition.x += (0 - this.clawPosition.x) * speed;
      this.clawPosition.z += (0 - this.clawPosition.z) * speed;
      this.clawPosition.y +=
        (this.clawRestingHeight - this.clawPosition.y) * speed;

      // Sync physics position with the return movement
      this.syncClawPhysics();

      // When very close, snap to final position to avoid endless interpolation
      if (distanceToCenter < 0.01) {
        this.clawPosition.x = 0;
        this.clawPosition.z = 0;
        this.clawPosition.y = this.clawRestingHeight;
        this.targetPosition.set(0, 0);

        // Sync final position with physics
        this.syncClawPhysics();
        if (this.clawPhysics) {
          this.clawPhysics.targetPosition.set(0, 0);
        }

        this.isReturning = false;
      }
    }

    // Update rope physics
    this.craneRope.updateEndPosition(this.clawPosition);
    this.craneRope.updatePhysics(0.02, 0.01);

    // Update claw prongs (opening/closing animation)
    if (this.isGrabbing) {
      // Close slowly
      this.currentClawAngle +=
        (this.clawClosedAngle - this.currentClawAngle) * 0.1;
    } else {
      // Open more gradually for smooth release
      this.currentClawAngle +=
        (this.clawOpenAngle - this.currentClawAngle) * 0.08;
    }

    this.updateClawProng(this.clawProng1, 0);
    this.updateClawProng(this.clawProng2, (Math.PI * 2) / 3);
    this.updateClawProng(this.clawProng3, (Math.PI * 4) / 3);

    this.claw.position.copy(this.clawPosition);
  }

  private updateClawProng(prong: THREE.Group, baseAngle: number) {
    const radius = 0.8;
    const x = Math.cos(baseAngle) * radius * Math.sin(this.currentClawAngle);
    const z = Math.sin(baseAngle) * radius * Math.sin(this.currentClawAngle);

    prong.position.set(x, 0, z);
    prong.rotation.z = this.currentClawAngle - Math.PI / 2;
    prong.rotation.y = baseAngle;
  }

  private startGrabbing() {
    // First close the claw
    this.isGrabbing = true;

    // Wait for claw to close, then check what we grabbed
    setTimeout(() => {
      this.checkGrabbedPrizes();

      // Then start ascending
      setTimeout(() => {
        this.isAscending = true;
      }, 300);
    }, 500);
  }

  private checkGrabbedPrizes() {
    const grabRadius = GAME_CONFIG.claw.grabRadius;
    const maxPrizesToGrab = GAME_CONFIG.claw.maxGrabCount;

    // Find all prizes within grab range and calculate distances
    const prizesInRange: { prize: Prize; distance: number }[] = [];

    this.prizes.forEach((prize) => {
      if (prize.grabbed) return;

      // Check distance from claw to prize
      const distance = prize.mesh.position.distanceTo(this.clawPosition);

      // All prizes now have the same fixed radius
      const prizeRadius = this.prizeSize * 0.6;
      const effectiveGrabDistance = grabRadius + prizeRadius;

      if (distance < effectiveGrabDistance) {
        prizesInRange.push({ prize, distance });
      }
    });

    // Sort by distance (closest first)
    prizesInRange.sort((a, b) => a.distance - b.distance);

    // Only try to grab the closest prize (max 1)
    for (let i = 0; i < Math.min(prizesInRange.length, maxPrizesToGrab); i++) {
      const { prize, distance } = prizesInRange[i];

      // Grab success rate based on configuration
      if (Math.random() < GAME_CONFIG.claw.grabSuccessRate) {
        prize.grabbed = true;
        prize.settled = false;

        // Set grip strength based on prize properties and grab quality
        const baseGrip = 0.8 + Math.random() * 0.15; // 80-95% base grip (more reliable)
        const distancePenalty = Math.max(0, (distance - 0.3) * 0.2); // Reduced penalty for distance
        const weightPenalty = prize.weight * 0.05; // Reduced weight penalty

        prize.gripStrength = Math.max(
          0.5,
          baseGrip - distancePenalty - weightPenalty,
        );
        prize.dropChance = (1 - prize.gripStrength) * 0.008; // Much lower base drop chance

        this.grabbedPrizes.push(prize);

        // Unsettle nearby prizes for realistic disturbance
        this.prizes.forEach((otherPrize) => {
          if (otherPrize === prize || otherPrize.grabbed) return;
          const distToOther = prize.mesh.position.distanceTo(
            otherPrize.mesh.position,
          );
          if (distToOther < 2) {
            otherPrize.settled = false;
            // Apply impulse to nearby prizes using Rapier
            const pushDir = new THREE.Vector3()
              .subVectors(otherPrize.mesh.position, prize.mesh.position)
              .normalize()
              .multiplyScalar(0.03);
            otherPrize.rigidBody.applyImpulse(
              { x: pushDir.x, y: pushDir.y, z: pushDir.z },
              true,
            );
          }
        });

        // Notify CraneGame that prizes were grabbed
        if (this.onPrizeGrabbed) {
          this.onPrizeGrabbed(this.grabbedPrizes);
        }
      }
    }
  }

  private releasePrizesPhysics() {
    if (this.grabbedPrizes.length > 0) {
      // Store the prizes we're releasing in a local variable
      const prizesToRelease = [...this.grabbedPrizes];

      // Clear the grabbed prizes array immediately
      this.grabbedPrizes = [];

      // Validate and release prizes
      const validPrizesToRelease = prizesToRelease.filter((prize) => {
        return prize && prize.mesh && prize.grabbed;
      });

      // Release prizes and let them fall with Rapier physics
      validPrizesToRelease.forEach((prize) => {
        prize.grabbed = false;
        prize.settled = false; // Mark as unsettled so it can fall

        // Give them a strong downward velocity to start falling fast (using Rapier)
        prize.rigidBody.setLinvel({ x: 0, y: -5.0, z: 0 }, true);

        // Reset visual effects when prize is released
        const material = prize.mesh.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity =
          (material.userData?.originalEmissiveIntensity as number) || 0.05;
        material.emissive =
          (material.userData?.originalEmissiveColor as THREE.Color) ||
          new THREE.Color("#222222");

        // Don't add to wonPrizes here - let the bin detection handle it
      });

      // Remove won prizes from scene after they've fallen and settled
      setTimeout(() => {
        validPrizesToRelease.forEach((prize) => {
          // Remove from Three.js scene
          this.scene.remove(prize.mesh);

          // Remove from Rapier physics world
          this.physicsManager?.removeBody(prize.rigidBody);

          // Remove from prizes array
          const index = this.prizes.indexOf(prize);
          if (index > -1) this.prizes.splice(index, 1);
        });
      }, 5000); // Give them 5 seconds to fall into the bin and settle
    } else {
      // No prizes grabbed - trigger lose callback (original behavior)
      setTimeout(() => {
        // Notify CraneGame that the player lost (no prizes grabbed)
        if (this.onLose) {
          this.onLose();
        }
      }, 500);
    }
  }

  private checkForPrizeDrops() {
    // Check each grabbed prize to see if it should drop
    for (let i = this.grabbedPrizes.length - 1; i >= 0; i--) {
      const prize = this.grabbedPrizes[i];

      // Calculate drop probability based on multiple factors
      const movementSpeed = this.clawPhysics?.getSpeed() || 0;
      const heightFactor = Math.max(0, (prize.mesh.position.y + 5) / 15); // Higher = more likely to drop

      // Base drop chance plus movement and height factors (reduced for better balance)
      const totalDropChance =
        prize.dropChance + movementSpeed * 0.05 + heightFactor * 0.002;

      if (Math.random() < totalDropChance) {
        // Prize drops!

        // Remove from grabbed array
        this.grabbedPrizes.splice(i, 1);

        // Reset prize state
        prize.grabbed = false;
        prize.settled = false;

        // Give it a slight downward and outward velocity (using Rapier)
        prize.rigidBody.setLinvel(
          {
            x: (Math.random() - 0.5) * 0.1,
            y: -Math.random() * 0.05 - 0.02,
            z: (Math.random() - 0.5) * 0.1,
          },
          true,
        );

        // Show drop effect
        this.showPrizeDropEffect(prize.mesh.position);

        // Notify CraneGame that prize was dropped
        if (this.onPrizeDropped) {
          this.onPrizeDropped(prize);
        }
      }
    }
  }

  private showPrizeDropEffect(position: THREE.Vector3) {
    // Create a simple particle burst effect when prize drops
    const particleCount = 5;
    for (let i = 0; i < particleCount; i++) {
      setTimeout(() => {
        // Create a temporary visual indicator
        const indicator = document.createElement("div");
        indicator.style.position = "absolute";
        indicator.style.left = `${Math.random() * 20 + position.x * 10}px`;
        indicator.style.top = `${Math.random() * 20 + (15 - position.y) * 10}px`;
        indicator.style.width = "4px";
        indicator.style.height = "4px";
        indicator.style.backgroundColor = "#ffff00";
        indicator.style.borderRadius = "50%";
        indicator.style.opacity = "0.8";
        indicator.style.pointerEvents = "none";
        indicator.style.zIndex = "1000";

        document.body.appendChild(indicator);

        // Animate and remove
        setTimeout(() => {
          indicator.style.transform = "scale(0)";
          indicator.style.opacity = "0";
          setTimeout(() => indicator.remove(), 300);
        }, 100);
      }, i * 50);
    }
  }
}
