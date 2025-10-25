import "./crane-game.scss";
import * as THREE from "three";
import Random from "../../utils/random";
import RAPIER from "@dimforge/rapier3d-compat";
import { PhysicsManager } from "./PhysicsManager";
import { CraneRope } from "./CraneRope";
import { ClawPhysics } from "./ClawPhysics";
import { AudioManager } from "./AudioManager";
import { AtmosphericEffects } from "./AtmosphericEffects";
import { Cabinet } from "./Cabinet";
import { GAME_CONFIG } from "./config";

interface Prize {
  mesh: THREE.Mesh;
  rigidBody: RAPIER.RigidBody; // Rapier physics body
  grabbed: boolean;
  settled: boolean; // True when prize has come to rest
  imageUrl: string;
  weight: number;
  deformability: number;
  bounciness: number;
  materialType: "plush" | "ball" | "box" | "cylinder";
  gripStrength: number; // How securely the claw holds this prize (0-1)
  dropChance: number; // Base chance to drop during transport
}

interface ImagesResponse {
  images: string[];
}

class CraneGame {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;

  // Game objects
  claw: THREE.Group;
  clawArm: THREE.Mesh;
  clawProng1: THREE.Group;
  clawProng2: THREE.Group;
  clawProng3: THREE.Group;
  craneRope: CraneRope;
  prizes: Prize[] = [];
  cabinet: THREE.Group;

  // Game state
  clawRestingHeight = GAME_CONFIG.claw.restingHeight;
  clawPosition: THREE.Vector3 = new THREE.Vector3(
    0,
    GAME_CONFIG.claw.restingHeight,
    0,
  );
  targetPosition: THREE.Vector2 = new THREE.Vector2(0, 0);
  binPosition: THREE.Vector3 = GAME_CONFIG.physics.binPosition.clone();
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
  credits = GAME_CONFIG.startingCredits;

  // Images
  images: string[] = [];
  textureLoader = new THREE.TextureLoader();
  textureCache = new Map<string, THREE.Texture>();

  // UI
  uiElement: HTMLDivElement;

  // Enhanced features
  audioManager: AudioManager;
  atmosphericEffects: AtmosphericEffects;
  physicsManager: PhysicsManager;
  clawPhysics?: ClawPhysics;

  // Control properties
  keys: Record<string, boolean> = {};
  moveSpeed = 0.3;

  // Crane mechanism components
  mainGear?: THREE.Mesh;
  smallGears: THREE.Mesh[] = [];

  // Floor animation elements
  floorCanvas?: HTMLCanvasElement;
  floorTexture?: THREE.CanvasTexture;

  // LED strips for animation
  ledStrips: THREE.Mesh[] = [];

  prizeSize = GAME_CONFIG.cabinet.prizeSize;

  constructor() {
    void this.init();
  }

  async init() {
    // Initialize Rapier WASM module first
    await RAPIER.init();

    // Now create physics manager after WASM is loaded
    this.physicsManager = new PhysicsManager();

    // Initialize claw physics
    this.clawPhysics = new ClawPhysics(
      this.physicsManager,
      RAPIER,
      this.clawPosition,
    );

    // Create physics boundaries (floor and walls)
    this.createPhysicsBoundaries();

    this.setupScene();
    this.setupLights();

    // Create cabinet and store animated components
    const cabinet = new Cabinet(this.scene, this.physicsManager, GAME_CONFIG);
    this.cabinet = cabinet.cabinet;
    this.mainGear = cabinet.mainGear;
    this.smallGears = cabinet.smallGears;
    this.ledStrips = cabinet.ledStrips;
    this.floorCanvas = cabinet.floorCanvas;
    this.floorTexture = cabinet.floorTexture;

    this.createClaw();
    await this.loadImages();
    this.setupUI();
    this.setupControls();
    this.initializeEnhancedFeatures();
    this.animate();

    window.addEventListener("resize", () => this.onWindowResize());
  }

  createPhysicsBoundaries() {
    // Create static floor collider
    const floorY = GAME_CONFIG.physics.floorY;
    this.physicsManager.createStaticBox(
      new THREE.Vector3(0, floorY, 0),
      new THREE.Vector3(10, 0.25, 10), // Half extents
    );

    // Create static wall colliders
    const wallHeight = 12.5;
    const wallY = GAME_CONFIG.physics.floorY + wallHeight;

    // Left wall
    this.physicsManager.createStaticBox(
      new THREE.Vector3(-10, wallY, 0),
      new THREE.Vector3(0.1, wallHeight, 10),
    );

    // Right wall
    this.physicsManager.createStaticBox(
      new THREE.Vector3(10, wallY, 0),
      new THREE.Vector3(0.1, wallHeight, 10),
    );

    // Back wall
    this.physicsManager.createStaticBox(
      new THREE.Vector3(0, wallY, -10),
      new THREE.Vector3(10, wallHeight, 0.1),
    );

    // Front wall
    this.physicsManager.createStaticBox(
      new THREE.Vector3(0, wallY, 10),
      new THREE.Vector3(10, wallHeight, 0.1),
    );
  }

  setupScene() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(0, 5, 40);
    this.camera.lookAt(0, 5, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    document.getElementById("container")!.appendChild(this.renderer.domElement);
  }

  setupLights() {
    // Enhanced ambient lighting with subtle color temperature
    const ambient = new THREE.AmbientLight(0xfff8e1, 0.6); // Warm ambient light
    this.scene.add(ambient);

    // Main spotlight from above (arcade lighting) - more realistic
    const spotLight = new THREE.SpotLight(0xffffff, 2.5);
    spotLight.position.set(0, 25, 0);
    spotLight.castShadow = true;
    spotLight.angle = Math.PI / 3.5;
    spotLight.penumbra = 0.4;
    spotLight.shadow.mapSize.width = 2048;
    spotLight.shadow.mapSize.height = 2048;
    spotLight.shadow.camera.near = 0.5;
    spotLight.shadow.camera.far = 50;
    spotLight.shadow.camera.fov = 60;
    this.scene.add(spotLight);

    // Vibrant colored accent lights for arcade feel
    const light1 = new THREE.PointLight(0xff00ff, 1.8, 40);
    light1.position.set(-12, 8, 12);
    light1.castShadow = true;
    this.scene.add(light1);

    const light2 = new THREE.PointLight(0x00ffff, 1.8, 40);
    light2.position.set(12, 8, 12);
    light2.castShadow = true;
    this.scene.add(light2);

    const light3 = new THREE.PointLight(0xffff00, 1.5, 40);
    light3.position.set(0, 8, -12);
    light3.castShadow = true;
    this.scene.add(light3);

    const light4 = new THREE.PointLight(0xff1493, 1.5, 35);
    light4.position.set(8, 4, 8);
    light4.castShadow = true;
    this.scene.add(light4);

    // Additional rim lighting for dramatic effect
    const rimLight = new THREE.DirectionalLight(0x88ccff, 0.8);
    rimLight.position.set(-20, 15, -20);
    rimLight.castShadow = true;
    this.scene.add(rimLight);

    // Subtle fill light from below
    const fillLight = new THREE.PointLight(0x442244, 0.3, 30);
    fillLight.position.set(0, -5, 0);
    this.scene.add(fillLight);
  }

  createClaw() {
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

  async loadImages() {
    try {
      const response = await fetch("/viruses/buttons/images.json");
      if (response.ok) {
        const data = (await response.json()) as ImagesResponse;
        this.images = data.images;
        this.createPrizes();
      }
    } catch (error) {
      console.error("Failed to load images:", error);
    }
  }

  getOrLoadTexture(imageUrl: string): THREE.Texture {
    // Check if texture is already in cache
    if (this.textureCache.has(imageUrl)) {
      return this.textureCache.get(imageUrl)!;
    }

    // Load texture and add to cache
    const texture = this.textureLoader.load(imageUrl);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    this.textureCache.set(imageUrl, texture);
    return texture;
  }

  createPrizes() {
    const floorY = GAME_CONFIG.physics.floorY + 0.5;

    // Calculate grid dimensions based on cabinet and prize size
    const usableWidth =
      GAME_CONFIG.cabinet.width - GAME_CONFIG.prizes.gridPadding;
    const usableDepth =
      GAME_CONFIG.cabinet.depth - GAME_CONFIG.prizes.gridPadding;

    const cols = Math.floor(usableWidth / this.prizeSize);
    const rows = Math.floor(usableDepth / this.prizeSize);

    // Calculate spacing to center the grid
    const spacingX = usableWidth / cols;
    const spacingZ = usableDepth / rows;
    const offsetX = -(usableWidth / 2) + spacingX / 2;
    const offsetZ = -(usableDepth / 2) + spacingZ / 2;

    // Create prizes in a grid with some randomness
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const imageUrl =
          this.images[Math.floor(Math.random() * this.images.length)];

        // Create uniform sphere geometry
        const geometry = new THREE.SphereGeometry(this.prizeSize * 0.6, 16, 12);

        // Load texture from cache
        const texture = this.getOrLoadTexture(imageUrl);

        // Randomly vary material properties for variety
        const brightness = Random.floatBetween(0.05, 0.15);
        const roughness = Random.floatBetween(0.6, 0.9);

        // Single material that wraps around the geometry
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          emissive: 0x111111,
          emissiveIntensity: brightness,
          roughness: roughness,
          metalness: 0.1,
          transparent: false, // Ensure prizes are not transparent
          opacity: 1.0, // Ensure full opacity
        });

        // Store original emissive properties for later reset
        material.userData = material.userData || {};
        material.userData.originalEmissiveIntensity = brightness;
        material.userData.originalEmissiveColor = new THREE.Color("#222222");

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false; // Ensure prizes are always rendered

        // Position in grid with slight randomness
        const x = offsetX + col * spacingX + Random.floatBetween(-0.15, 0.15);
        const z = offsetZ + row * spacingZ + Random.floatBetween(-0.15, 0.15);

        // Skip prizes that would spawn in the bin area (front-right corner)
        const distanceToBin = Math.sqrt(
          Math.pow(x - this.binPosition.x, 2) +
            Math.pow(z - this.binPosition.z, 2),
        );
        if (distanceToBin < 4) {
          // Too close to bin, skip this prize
          continue;
        }

        // Drop prizes from random heights to let physics stack them naturally
        const dropHeight = Random.floatBetween(
          GAME_CONFIG.prizes.dropHeightRange[0],
          GAME_CONFIG.prizes.dropHeightRange[1],
        );

        const y = floorY + dropHeight;

        mesh.position.set(x, y, z);
        mesh.rotation.y = Random.floatBetween(0, Math.PI * 2);

        // No longer need to store radius in userData

        this.scene.add(mesh);

        // Create Rapier physics body for the prize
        const prizeRadius = this.prizeSize * 0.6;
        const weight = Random.floatBetween(0.8, 1.2);
        const bounciness = Random.floatBetween(0.1, 0.3);

        const rigidBody = this.physicsManager.createDynamicSphere(
          mesh.position,
          prizeRadius,
          weight,
          bounciness,
          0.8, // friction
        );

        const prize: Prize = {
          mesh,
          rigidBody,
          grabbed: false,
          settled: false, // Starts unsettled so it can fall
          imageUrl,
          weight,
          deformability: Random.floatBetween(0.1, 0.8),
          bounciness,
          materialType: Random.itemInArray([
            "plush",
            "ball",
            "box",
            "cylinder",
          ]),
          gripStrength: 0, // Will be set when grabbed
          dropChance: 0, // Will be set when grabbed
        };

        this.prizes.push(prize);
      }
    }

    // Add extra "filler" prizes in random positions to make it look full
    const numFillerPrizes = GAME_CONFIG.prizes.numFillerPrizes;

    for (let i = 0; i < numFillerPrizes; i++) {
      const imageUrl = Random.itemInArray(this.images);

      // Random position within cabinet bounds, avoiding bin
      let x, z, distanceToBin;
      let attempts = 0;
      do {
        x = Random.floatBetween(-8, 8);
        z = Random.floatBetween(-8, 8);
        distanceToBin = Math.sqrt(
          Math.pow(x - this.binPosition.x, 2) +
            Math.pow(z - this.binPosition.z, 2),
        );
        attempts++;
      } while (distanceToBin < 4 && attempts < 20); // Avoid bin area

      if (attempts >= 20) continue; // Skip if can't find good spot

      // Create uniform sphere geometry
      const geometry = new THREE.SphereGeometry(this.prizeSize * 0.6, 16, 12);

      // Load texture from cache
      const texture = this.getOrLoadTexture(imageUrl);

      const brightness = Random.floatBetween(0.05, 0.15);
      const roughness = Random.floatBetween(0.6, 0.9);

      const material = new THREE.MeshStandardMaterial({
        map: texture,
        emissive: 0x111111,
        emissiveIntensity: brightness,
        roughness: roughness,
        metalness: 0.1,
      });

      // Store original emissive properties for later reset
      material.userData = material.userData || {};
      material.userData.originalEmissiveIntensity = brightness;
      material.userData.originalEmissiveColor = new THREE.Color("#222222");

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false; // Ensure prizes are always rendered

      // Drop from random height to let physics handle stacking
      const dropHeight = Random.floatBetween(2, 15);
      const y = floorY + dropHeight;

      mesh.position.set(x, y, z);
      mesh.rotation.y = Random.floatBetween(0, Math.PI * 2);

      // No longer need to store radius in userData

      this.scene.add(mesh);

      // Create Rapier physics body for the filler prize
      const prizeRadius = this.prizeSize * 0.6;
      const weight = Random.floatBetween(0.8, 1.2);
      const bounciness = Random.floatBetween(0.1, 0.3);

      const rigidBody = this.physicsManager.createDynamicSphere(
        mesh.position,
        prizeRadius,
        weight,
        bounciness,
        0.8, // friction
      );

      const prize: Prize = {
        mesh,
        rigidBody,
        grabbed: false,
        settled: false, // Starts unsettled so it can fall
        imageUrl,
        weight,
        deformability: Random.floatBetween(0.1, 0.8),
        bounciness,
        materialType: Random.itemInArray(["plush", "ball", "box", "cylinder"]),
        gripStrength: 0, // Will be set when grabbed
        dropChance: 0, // Will be set when grabbed
      };

      this.prizes.push(prize);
    }
  }

  setupUI() {
    this.uiElement = document.createElement("div");
    this.uiElement.className = "ui-overlay";
    this.updateUI();
    document.body.appendChild(this.uiElement);
  }

  updateUI() {
    let instruction = "WASD or Arrow Keys: Move | SPACE: Drop Claw";

    if (this.isDescending || this.isAscending || this.isMovingToBin) {
      instruction = "Grabbing...";
    } else if (this.isReturning) {
      instruction = "Returning...";
    } else if (this.isGrabbing) {
      instruction = "Opening claw...";
    }

    this.uiElement.innerHTML = `
      <div class="instruction">${instruction}</div>
      <div class="coins">Credits: ${this.credits} | Won: ${this.wonPrizes.length}</div>
    `;
  }

  setupControls() {
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false, // WASD keys
      ArrowUp: false,
      ArrowLeft: false,
      ArrowDown: false,
      ArrowRight: false, // Arrow keys
      space: false,
    };

    window.addEventListener("keydown", (e) => {
      // Handle both regular keys (lowercase) and arrow keys (as-is)
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key in this.keys) this.keys[key] = true;

      if (
        (e.key === " " || e.key === " ") &&
        !this.isDescending &&
        !this.isAscending &&
        !this.isMovingToBin &&
        !this.isReturning &&
        !this.isGrabbing
      ) {
        this.dropClaw();
      }
    });

    window.addEventListener("keyup", (e) => {
      // Handle both regular keys (lowercase) and arrow keys (as-is)
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (key in this.keys) this.keys[key] = false;
    });
  }

  updateClawMovement() {
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

    // Update physics-based movement
    this.clawPhysics.updateMovement(this.keys);

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
      this.audioManager.playSound("clawBounce", 0.6, 1.0); // Boundary collision sound
    }
  }

  dropClaw() {
    if (this.credits <= 0) {
      this.showMessage("OUT OF CREDITS!");
      return;
    }

    this.credits--;
    this.isDescending = true;
    this.isGrabbing = false; // Make sure claw is open when descending

    // Clear any previously grabbed prizes to start fresh
    this.grabbedPrizes = [];

    console.log("Starting new claw drop, cleared grabbedPrizes array");

    // Play claw descend sound
    this.audioManager.playSound("clawDescend", 0.7, 0.9); // Increased volume for better audibility

    this.updateUI();
  }

  updateClaw() {
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
      if (this.clawPhysics) {
        this.clawPhysics.position.x = this.clawPosition.x;
        this.clawPhysics.position.z = this.clawPosition.z;
        this.clawPhysics.rigidBody.setTranslation(
          {
            x: this.clawPosition.x,
            y: this.clawPosition.y,
            z: this.clawPosition.z,
          },
          true,
        );
        this.clawPhysics.stop(); // Stop any velocity
      }

      // Check for prize drops during transport
      this.checkForPrizeDrops();

      const distanceToBin = Math.sqrt(
        Math.pow(this.binPosition.x - this.clawPosition.x, 2) +
          Math.pow(this.binPosition.z - this.clawPosition.z, 2),
      );

      if (distanceToBin < 0.05) {
        this.isMovingToBin = false;

        // Immediately release prizes when we reach the bin
        console.log("Reached bin, releasing prizes now");
        console.log(
          `grabbedPrizes count before release: ${this.grabbedPrizes.length}`,
        );
        console.log(
          `grabbedPrizes before release:`,
          this.grabbedPrizes.map((p) => ({
            id: p.mesh.id,
            grabbed: p.grabbed,
            position: p.mesh.position.toArray(),
          })),
        );
        this.releasePrizesPhysics();

        // Play prize drop sound only if prizes were actually grabbed
        console.log(
          `grabbedPrizes count after release: ${this.grabbedPrizes.length}`,
        );

        // Open the claw
        setTimeout(() => {
          this.isGrabbing = false;
        }, 300);

        // Wait for prizes to fall, then return
        setTimeout(() => {
          console.log("Starting return to center");
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
        this.clawPhysics.stop(); // Stop any velocity
      }

      // When very close, snap to final position to avoid endless interpolation
      if (distanceToCenter < 0.01) {
        this.clawPosition.x = 0;
        this.clawPosition.z = 0;
        this.clawPosition.y = this.clawRestingHeight;
        this.targetPosition.set(0, 0);

        // Sync final position with physics
        if (this.clawPhysics) {
          this.clawPhysics.position.copy(this.clawPosition);
          this.clawPhysics.targetPosition.set(0, 0);
          this.clawPhysics.rigidBody.setTranslation(
            {
              x: this.clawPosition.x,
              y: this.clawPosition.y,
              z: this.clawPosition.z,
            },
            true,
          );
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
    this.updateUI();
  }

  updateClawProng(prong: THREE.Group, baseAngle: number) {
    const radius = 0.8;
    const x = Math.cos(baseAngle) * radius * Math.sin(this.currentClawAngle);
    const z = Math.sin(baseAngle) * radius * Math.sin(this.currentClawAngle);

    prong.position.set(x, 0, z);
    prong.rotation.z = this.currentClawAngle - Math.PI / 2;
    prong.rotation.y = baseAngle;
  }

  startGrabbing() {
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

  checkGrabbedPrizes() {
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

    console.log(
      `Found ${prizesInRange.length} prizes in range, will attempt to grab closest 1`,
    );

    if (prizesInRange.length > 0) {
      console.log(
        `Closest prize distance: ${prizesInRange[0].distance.toFixed(2)}`,
      );
    }

    // Only try to grab the closest prize (max 1)
    let grabbedCount = 0;
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
        grabbedCount++;

        console.log(
          `Grabbed prize ${grabbedCount}! Distance: ${distance.toFixed(2)}, Grip: ${prize.gripStrength.toFixed(2)}`,
        );

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
      }
    }

    console.log(
      `Total prizes grabbed: ${grabbedCount} out of ${prizesInRange.length} in range`,
    );
  }

  releasePrizesPhysics() {
    console.log(`Releasing prizes. Count: ${this.grabbedPrizes.length}`);
    console.log(
      `grabbedPrizes array:`,
      this.grabbedPrizes.map((p) => ({
        id: p.mesh.id,
        grabbed: p.grabbed,
        position: p.mesh.position.toArray(),
      })),
    );

    if (this.grabbedPrizes.length > 0) {
      console.log(`About to release ${this.grabbedPrizes.length} prizes`);

      // Store the prizes we're releasing in a local variable
      const prizesToRelease = [...this.grabbedPrizes];
      console.log(`Stored ${prizesToRelease.length} prizes to release`);
      console.log(
        `Prizes to release:`,
        prizesToRelease.map((p) => ({
          id: p.mesh?.id || "NO_ID",
          grabbed: p.grabbed,
          position: p.mesh?.position?.toArray() || "NO_POSITION",
          meshValid: !!p.mesh,
          meshInScene: p.mesh ? this.scene.children.includes(p.mesh) : false,
        })),
      );

      // Clear the grabbed prizes array immediately
      this.grabbedPrizes = [];

      // Validate and release prizes
      const validPrizesToRelease = prizesToRelease.filter((prize) => {
        const isValid = prize && prize.mesh && prize.grabbed;
        if (!isValid) {
          console.log(`Invalid prize filtered out:`, {
            prize,
            hasMesh: !!prize?.mesh,
            grabbed: prize?.grabbed,
          });
        }
        return isValid;
      });

      console.log(`Valid prizes to release: ${validPrizesToRelease.length}`);

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
          this.physicsManager.removeBody(prize.rigidBody);

          // Remove from prizes array
          const index = this.prizes.indexOf(prize);
          if (index > -1) this.prizes.splice(index, 1);
        });
      }, 5000); // Give them 5 seconds to fall into the bin and settle
    } else {
      console.log(`No prizes to release! grabbedPrizes array is empty`);
      console.log(`Current grabbedPrizes state:`, this.grabbedPrizes);

      // Debug: Check if any prizes have grabbed=true but aren't in the array
      const orphanedPrizes = this.prizes.filter(
        (p) => p.grabbed && !this.grabbedPrizes.includes(p),
      );
      console.log(
        `Orphaned grabbed prizes:`,
        orphanedPrizes.map((p) => ({
          id: p.mesh.id,
          grabbed: p.grabbed,
          position: p.mesh.position.toArray(),
        })),
      );

      // No prizes grabbed - show "TRY AGAIN" message and play lose sound
      setTimeout(() => {
        this.showMessage("TRY AGAIN!");
        // Play depressing lose sound (lower pitch, minor key feel)
        this.audioManager.playSound("lose", 0.4, 0.6);
      }, 500);
    }

    this.updateUI();
  }

  showMessage(text: string) {
    const messageEl = document.createElement("div");
    messageEl.className = "win-message";
    messageEl.textContent = text;
    document.body.appendChild(messageEl);

    setTimeout(() => {
      messageEl.remove();
    }, 2000);
  }

  updatePhysics() {
    // Step the Rapier physics world
    this.physicsManager.step();

    // Update prizes
    this.prizes.forEach((prize) => {
      if (prize.grabbed) {
        // Mark as unsettled when grabbed
        prize.settled = false;

        // Follow claw whenever grabbed (holding, ascending, moving to bin, or returning)
        const targetX = this.clawPosition.x;
        const targetY = this.clawPosition.y - 1.5; // Hang below claw
        const targetZ = this.clawPosition.z;

        // Use faster interpolation for more responsive following
        prize.mesh.position.x += (targetX - prize.mesh.position.x) * 0.3;
        prize.mesh.position.y += (targetY - prize.mesh.position.y) * 0.3;
        prize.mesh.position.z += (targetZ - prize.mesh.position.z) * 0.3;

        // Update Rapier body to match the grabbed position (kinematic control)
        prize.rigidBody.setTranslation(
          {
            x: prize.mesh.position.x,
            y: prize.mesh.position.y,
            z: prize.mesh.position.z,
          },
          true,
        );
        prize.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);

        // Make grabbed prizes extremely visible with intense glow and color tint
        const material = prize.mesh.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 1.5; // Very strong glow to make grabbed prizes obvious
        material.emissive = new THREE.Color(0x00ffff); // Bright cyan glow for grabbed prizes

        // Debug: log grabbed prize position and array membership (reduced frequency)
        if (Math.random() < 0.01) {
          const inArray = this.grabbedPrizes.includes(prize);
          console.log(
            `Grabbed prize ${prize.mesh.id}: position: ${prize.mesh.position.x.toFixed(2)}, ${prize.mesh.position.y.toFixed(2)}, ${prize.mesh.position.z.toFixed(2)}, inArray: ${inArray}`,
          );
        }
      } else {
        // Sync Three.js mesh with Rapier physics body
        this.physicsManager.syncMeshWithBody(prize.mesh, prize.rigidBody);

        // Check if prize has settled (very low velocity)
        const linvel = prize.rigidBody.linvel();
        const speed = Math.sqrt(
          linvel.x * linvel.x + linvel.y * linvel.y + linvel.z * linvel.z,
        );

        if (speed < 0.05 && prize.mesh.position.y < -8) {
          prize.settled = true;
        } else {
          prize.settled = false;
        }

        // Reset visual effects for non-grabbed prizes
        const material = prize.mesh.material as THREE.MeshStandardMaterial;
        if (material.emissiveIntensity > 0.2) {
          material.emissiveIntensity =
            (material.userData?.originalEmissiveIntensity as number) || 0.05;
          material.emissive =
            (material.userData?.originalEmissiveColor as THREE.Color) ||
            new THREE.Color("#222222");
        }

        // Check if prize has entered the bin
        const inBinX = Math.abs(prize.mesh.position.x - this.binPosition.x) < 2;
        const inBinZ = Math.abs(prize.mesh.position.z - this.binPosition.z) < 2;
        const inBinY = prize.mesh.position.y < -7; // Below bin opening

        if (inBinX && inBinZ && inBinY && !this.wonPrizes.includes(prize)) {
          // Prize has entered the bin! Mark as won
          this.wonPrizes.push(prize);
          this.showMessage("YOU WIN!");
          this.audioManager.playSound("win", 0.6, 1.0);
          this.updateUI();
        }
      }
    });
  }

  initializeEnhancedFeatures() {
    // Initialize audio system
    this.audioManager = new AudioManager();

    // Initialize atmospheric effects
    this.atmosphericEffects = new AtmosphericEffects(this.scene);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate = () => {
    requestAnimationFrame(this.animate);

    this.updateClaw();
    this.updatePhysics();
    this.updateArcadeEffects();

    // Update atmospheric effects (dust, background, floating particles)
    this.atmosphericEffects.animate(0.01);

    this.renderer.render(this.scene, this.camera);
  };

  animateCraneMechanism() {
    // Animate main gear
    const mainGear = this.mainGear;
    if (mainGear) {
      mainGear.rotation.z += 0.02; // Slow rotation
    }

    // Animate small gears (counter-rotating)
    const smallGears = this.smallGears;
    if (smallGears) {
      smallGears.forEach((gear: THREE.Mesh) => {
        gear.rotation.z -= 0.04; // Faster counter-rotation
      });
    }
  }

  checkForPrizeDrops() {
    console.log(
      `Checking for prize drops. grabbedPrizes count: ${this.grabbedPrizes.length}`,
    );
    console.log(
      `Current grabbedPrizes:`,
      this.grabbedPrizes.map((p) => ({
        id: p.mesh.id,
        grabbed: p.grabbed,
        position: p.mesh.position.toArray(),
        grip: p.gripStrength.toFixed(2),
      })),
    );

    // Check each grabbed prize to see if it should drop
    for (let i = this.grabbedPrizes.length - 1; i >= 0; i--) {
      const prize = this.grabbedPrizes[i];

      // Calculate drop probability based on multiple factors
      const distanceFromClaw = prize.mesh.position.distanceTo(
        this.clawPosition,
      );
      const movementSpeed = this.clawPhysics?.getSpeed() || 0;
      const heightFactor = Math.max(0, (prize.mesh.position.y + 5) / 15); // Higher = more likely to drop

      // Base drop chance plus movement and height factors (reduced for better balance)
      const totalDropChance =
        prize.dropChance + movementSpeed * 0.05 + heightFactor * 0.002;

      console.log(
        `Prize ${prize.mesh.id}: distance=${distanceFromClaw.toFixed(2)}, speed=${movementSpeed.toFixed(2)}, height=${prize.mesh.position.y.toFixed(2)}, dropChance=${totalDropChance.toFixed(4)}, random=${Math.random().toFixed(4)}`,
      );

      if (Math.random() < totalDropChance) {
        // Prize drops!
        console.log(
          `Prize dropped! Grip: ${prize.gripStrength.toFixed(2)}, Distance: ${distanceFromClaw.toFixed(2)}`,
        );

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
      }
    }

    console.log(
      `After drop check, grabbedPrizes count: ${this.grabbedPrizes.length}`,
    );
  }

  showPrizeDropEffect(position: THREE.Vector3) {
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

  updateArcadeEffects() {
    // Animate crane mechanism gears
    this.animateCraneMechanism();

    // Animate LED light strips (chase effect)
    if (this.ledStrips) {
      const time = Date.now() * 0.001;
      this.ledStrips.forEach((led: THREE.Mesh, i: number) => {
        const mat = led.material as THREE.MeshStandardMaterial;
        // Chase effect
        const phase = (time * 2 + i * 0.3) % (Math.PI * 2);
        const intensity = Math.sin(phase) * 1 + 2;
        mat.emissiveIntensity = Math.max(0.5, intensity);

        // Color cycling
        const hue = (time * 30 + i * 10) % 360;
        const color = new THREE.Color().setHSL(hue / 360, 1, 0.5);
        mat.emissive = color;
        mat.color = color;
      });
    }

    // Animate floor grid pattern
    const floorCanvas = this.floorCanvas;
    const floorTexture = this.floorTexture;
    if (floorCanvas && floorTexture) {
      const ctx = floorCanvas.getContext("2d")!;
      const time = Date.now() * 0.001;

      // Clear with base color
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, floorCanvas.width, floorCanvas.height);

      // Draw pulsing grid lines
      const gridSize = 32;
      const pulseIntensity = Math.sin(time * 2) * 0.3 + 0.7;
      const hue = (time * 30) % 360;

      ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${pulseIntensity * 0.4})`;
      ctx.lineWidth = 2;

      // Vertical lines
      for (let x = 0; x <= floorCanvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, floorCanvas.height);
        ctx.stroke();
      }

      // Horizontal lines
      for (let y = 0; y <= floorCanvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(floorCanvas.width, y);
        ctx.stroke();
      }

      floorTexture.needsUpdate = true;
    }
  }
}

new CraneGame();
