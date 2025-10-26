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
import { ClawManager } from "./ClawManager";
import { GAME_CONFIG } from "./config";
import { Prize, ImagesResponse } from "./types";

class CraneGame {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;

  // Game objects
  claw: THREE.Group;
  clawProng1: THREE.Group;
  clawProng2: THREE.Group;
  clawProng3: THREE.Group;
  craneRope: CraneRope;
  prizes: Prize[] = [];
  cabinet: THREE.Group;

  // Game state
  binPosition: THREE.Vector3 = GAME_CONFIG.physics.binPosition.clone();
  credits = GAME_CONFIG.startingCredits;
  wonPrizes: Prize[] = [];

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
  clawManager: ClawManager;

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
      new THREE.Vector3(0, GAME_CONFIG.claw.restingHeight, 0), // Start at center above cabinet
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

    // Create claw manager
    this.clawManager = new ClawManager(
      this.scene,
      this.physicsManager,
      this.binPosition,
      this.prizeSize,
    );

    // Setup controls FIRST so this.keys is initialized
    this.setupControls();

    // Initialize enhanced features (audioManager, atmosphericEffects) BEFORE setupDependencies
    this.initializeEnhancedFeatures();

    // Setup claw manager dependencies and callbacks
    this.clawManager.setupDependencies(
      this.clawPhysics,
      this.keys,
      this.prizes,
      this.audioManager,
      {
        onPrizeGrabbed: (prizes) => {
          // Prizes were grabbed - this could update UI or play sounds
          // Could show "GRABBED!" message or play grab sound
          console.log(`Grabbed ${prizes.length} prize(s)`);
        },
        onPrizeDropped: (prize) => {
          // Prize was dropped - this could play sound or show effect
          // Could play a drop sound or show particles
          console.log(
            `Prize dropped: ${prize.mesh.position.x.toFixed(2)}, ${prize.mesh.position.y.toFixed(2)}, ${prize.mesh.position.z.toFixed(2)}`,
          );
        },
        onPrizeWon: (prize) => {
          // Prize reached the bin - add to won prizes
          this.wonPrizes.push(prize);
          this.showMessage("YOU WIN!");
          this.audioManager.playSound("win", 0.6, 1.0);
          this.updateUI();
        },
        onLose: () => {
          // No prizes grabbed - show lose message and play lose sound
          this.showMessage("TRY AGAIN!");
          this.audioManager.playSound("lose", 0.7, 0.6);
          this.updateUI();
        },
      },
    );

    // Get claw components from ClawManager
    this.claw = this.clawManager.claw;
    this.clawProng1 = this.clawManager.clawProng1;
    this.clawProng2 = this.clawManager.clawProng2;
    this.clawProng3 = this.clawManager.clawProng3;
    this.craneRope = this.clawManager.craneRope;
    await this.loadImages();
    this.setupUI();
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

    // Get claw state from ClawManager
    if (
      this.clawManager.isDescending ||
      this.clawManager.isAscending ||
      this.clawManager.isMovingToBin
    ) {
      instruction = "Grabbing...";
    } else if (this.clawManager.isReturning) {
      instruction = "Returning...";
    } else if (this.clawManager.isGrabbing) {
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
        !this.clawManager.isDescending &&
        !this.clawManager.isAscending &&
        !this.clawManager.isMovingToBin &&
        !this.clawManager.isReturning &&
        !this.clawManager.isGrabbing
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

  dropClaw() {
    if (this.credits <= 0) {
      this.showMessage("OUT OF CREDITS!");
      return;
    }

    this.credits--;

    // Use ClawManager to handle the drop
    const success = this.clawManager.dropClaw();

    if (success) {
      this.updateUI();
    }
  }

  updateClaw() {
    this.clawManager.update();
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
        const targetX = this.clawManager.clawPosition.x;
        const targetY = this.clawManager.clawPosition.y - 1.5; // Hang below claw
        const targetZ = this.clawManager.clawPosition.z;

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

        // Check if prize has entered the bin (more precise detection)
        const inBinX =
          Math.abs(prize.mesh.position.x - this.binPosition.x) < 1.5;
        const inBinZ =
          Math.abs(prize.mesh.position.z - this.binPosition.z) < 1.5;
        const inBinY = prize.mesh.position.y < -8; // Deeper into the bin for more reliable detection

        if (
          inBinX &&
          inBinZ &&
          inBinY &&
          !this.wonPrizes.some((wonPrize) => wonPrize.mesh.id === prize.mesh.id)
        ) {
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
