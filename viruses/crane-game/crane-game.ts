import "./crane-game.scss";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import Random from "../../utils/random";
import { isMobile } from "../../utils/misc";
import RAPIER from "@dimforge/rapier3d-compat";
import { PhysicsManager } from "./PhysicsManager";
import { CraneRope } from "./CraneRope";
import { ClawPhysics } from "./ClawPhysics";
import { AudioManager } from "./AudioManager";
import { AtmosphericEffects } from "./AtmosphericEffects";
import { Cabinet } from "./Cabinet";
import { ClawManager } from "./ClawManager";
import { GAME_CONFIG } from "./config";
import { Prize } from "./types";

export default class CraneGame {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  private cameraControlsEnabled = true;

  // Game objects
  claw: THREE.Group;
  clawProng1: THREE.Group;
  clawProng2: THREE.Group;
  clawProng3: THREE.Group;
  craneRope: CraneRope;
  prizes: Prize[] = [];
  cabinet: Cabinet;

  // Game state
  binPosition: THREE.Vector3 = GAME_CONFIG.physics.binPosition.clone();
  credits = GAME_CONFIG.startingCredits;
  wonPrizes: Prize[] = [];

  // 3D Models
  private gltfLoader = new GLTFLoader();
  private plushieTemplates: THREE.Group[] = [];

  // UI
  uiElement: HTMLDivElement;

  // Enhanced features
  audioManager: AudioManager;
  atmosphericEffects: AtmosphericEffects;
  physicsManager: PhysicsManager;
  clawPhysics?: ClawPhysics;
  clawManager!: ClawManager;

  // Control properties
  keys: Record<string, boolean> = {};
  joystickInput: { x: number; y: number } = { x: 0, y: 0 };
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

  // Frame rate limiting
  private targetFPS = GAME_CONFIG.performance.targetFPS;
  private frameInterval = GAME_CONFIG.performance.frameInterval;
  private lastFrameTime = 0;

  constructor() {
    void this.init();
  }

  async init() {
    // Initialize Rapier WASM module first
    await RAPIER.init();

    // Load the plushie model
    await this.loadPlushieModel();

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
    const cabinet = new Cabinet(
      this.scene,
      this.physicsManager,
      GAME_CONFIG,
      // Joystick callback
      (direction) => {
        this.joystickInput = direction;
        this.clawManager.updateJoystickInput(direction);
      },
      // Start button callback
      () => {
        this.dropClaw();
      },
      // Camera controls callback
      (enabled) => {
        this.controls.enabled = enabled;
      },
    );
    this.cabinet = cabinet;
    this.mainGear = cabinet.mainGear;
    this.smallGears = cabinet.smallGears;
    this.ledStrips = cabinet.ledStrips;
    this.floorCanvas = cabinet.floorCanvas;
    this.floorTexture = cabinet.floorTexture;

    // Pass camera to control panel for raycasting
    cabinet.controlPanel.setCamera(this.camera);

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
      this.joystickInput,
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
    this.createPrizes();
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

  async loadPlushieModel() {
    const models = [
      "/viruses/crane-game/models/rei-ayanami-plushie/scene.gltf",
      "/viruses/crane-game/models/makima-bean-plushie/scene.gltf",
    ];

    for (const modelPath of models) {
      try {
        const gltf = await this.gltfLoader.loadAsync(modelPath);
        const model = gltf.scene;

        // Setup shadows for all meshes in the model
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        this.plushieTemplates.push(model);
      } catch (error) {
        console.error(`Failed to load model ${modelPath}:`, error);
      }
    }
  }

  setupScene() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(0, 5, isMobile() ? 55 : 40); // Zoom out more on mobile
    this.camera.lookAt(0, 5, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    document.getElementById("container")!.appendChild(this.renderer.domElement);

    // Setup camera controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; // Smooth camera movement
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 5, 0); // Look at the center of the cabinet
    this.controls.minDistance = 15; // Minimum zoom distance
    this.controls.maxDistance = 80; // Maximum zoom distance
    this.controls.maxPolarAngle = Math.PI / 1.5; // Prevent camera from going below the floor
    this.controls.minPolarAngle = Math.PI / 8; // Prevent camera from going too high above
    this.controls.enablePan = true; // Allow panning
    this.controls.panSpeed = 0.5;
    this.controls.rotateSpeed = 0.5;

    // Disable camera controls on mobile
    if (isMobile()) {
      this.controls.enabled = false;
      this.renderer.domElement.style.touchAction = "none";
    } else {
      this.controls.enabled = true;
    }

    this.controls.update();
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

  /**
   * Create a single prize with physics body
   * @param x X position
   * @param y Y position (drop height)
   * @param z Z position
   * @returns Created Prize object
   */
  private createSinglePrize(x: number, y: number, z: number): Prize {
    // Evenly distribute models: use prize index to determine which model
    const modelIndex = this.prizes.length % this.plushieTemplates.length;
    const template = this.plushieTemplates[modelIndex];
    const prizeGroup = template.clone();

    // Scale the model to match prize size
    // Model is approximately 2.4 units tall, scale to match our prize size
    const targetSize = this.prizeSize * GAME_CONFIG.prizes.radiusMultiplier;
    const modelHeight = 2.4;
    const scale = (targetSize / modelHeight) * 2; // Double the size
    prizeGroup.scale.setScalar(scale);

    // Store original emissive properties for grabbed effect
    prizeGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        if (material.userData) {
          material.userData.originalEmissiveIntensity =
            material.emissiveIntensity || 0.0;
          material.userData.originalEmissiveColor =
            material.emissive?.clone() || new THREE.Color(0x000000);
        }
      }
    });

    // Position and rotate
    prizeGroup.position.set(x, y, z);
    prizeGroup.rotation.y = Random.floatBetween(0, Math.PI * 2);
    prizeGroup.frustumCulled = false;

    this.scene.add(prizeGroup);

    // Create Rapier physics body for the prize
    // Calculate radius from the actual scaled model to match visual size
    const scaledBox = new THREE.Box3().setFromObject(prizeGroup);
    const prizeRadius =
      Math.max(
        scaledBox.max.x - scaledBox.min.x,
        scaledBox.max.z - scaledBox.min.z,
      ) / 2;
    const weight = Random.floatBetween(
      GAME_CONFIG.prizes.weightRange[0],
      GAME_CONFIG.prizes.weightRange[1],
    );
    const bounciness = Random.floatBetween(
      GAME_CONFIG.prizes.bouncinessRange[0],
      GAME_CONFIG.prizes.bouncinessRange[1],
    );

    const rigidBody = this.physicsManager.createDynamicSphere(
      prizeGroup.position,
      prizeRadius,
      weight,
      bounciness,
      GAME_CONFIG.prizes.friction,
    );

    const prize: Prize = {
      mesh: prizeGroup,
      rigidBody,
      grabbed: false,
      settled: false,
      weight,
      deformability: Random.floatBetween(0.6, 0.9), // Plushies are soft
      bounciness,
      materialType: "plush",
      gripStrength: 0,
      dropChance: 0,
    };

    return prize;
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
        // Position in grid with slight randomness
        const x = offsetX + col * spacingX + Random.floatBetween(-0.15, 0.15);
        const z = offsetZ + row * spacingZ + Random.floatBetween(-0.15, 0.15);

        // Skip prizes that would spawn in the bin area (front-right corner)
        const distanceToBin = Math.sqrt(
          Math.pow(x - this.binPosition.x, 2) +
            Math.pow(z - this.binPosition.z, 2),
        );
        if (distanceToBin < GAME_CONFIG.physics.binDistanceThreshold) {
          // Too close to bin, skip this prize
          continue;
        }

        // Drop prizes from random heights to let physics stack them naturally
        const dropHeight = Random.floatBetween(
          GAME_CONFIG.prizes.dropHeightRange[0],
          GAME_CONFIG.prizes.dropHeightRange[1],
        );
        const y = floorY + dropHeight;

        // Create prize using helper method
        const prize = this.createSinglePrize(x, y, z);
        this.prizes.push(prize);
      }
    }
  }

  setupUI() {
    this.uiElement = document.createElement("div");
    this.uiElement.className = "ui-overlay";
    this.updateUI();
    document.body.appendChild(this.uiElement);
  }

  updateUI() {
    let instruction =
      "WASD or Arrow Keys: Move | SPACE: Drop Claw | Mouse: Rotate Camera";

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

      // Camera toggle (desktop only)
      if (key === "c" && !isMobile()) {
        this.toggleCameraControls();
        return;
      }

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
        // Handle both single mesh and group (plushie model)
        if (prize.mesh instanceof THREE.Group) {
          prize.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const material = child.material as THREE.MeshStandardMaterial;
              material.emissiveIntensity = 1.5;
              material.emissive = new THREE.Color(0x00ffff);
            }
          });
        } else {
          const material = prize.mesh.material as THREE.MeshStandardMaterial;
          material.emissiveIntensity = 1.5;
          material.emissive = new THREE.Color(0x00ffff);
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
        // Handle both single mesh and group (plushie model)
        if (prize.mesh instanceof THREE.Group) {
          prize.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const material = child.material as THREE.MeshStandardMaterial;
              if (material.emissiveIntensity > 0.2) {
                material.emissiveIntensity =
                  (material.userData?.originalEmissiveIntensity as number) ||
                  0.0;
                material.emissive =
                  (material.userData?.originalEmissiveColor as THREE.Color) ||
                  new THREE.Color(0x000000);
              }
            }
          });
        } else {
          const material = prize.mesh.material as THREE.MeshStandardMaterial;
          if (material.emissiveIntensity > 0.2) {
            material.emissiveIntensity =
              (material.userData?.originalEmissiveIntensity as number) || 0.05;
            material.emissive =
              (material.userData?.originalEmissiveColor as THREE.Color) ||
              new THREE.Color("#222222");
          }
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

  animate = (currentTime = 0) => {
    requestAnimationFrame(this.animate);

    // Throttle to 30fps for better performance
    const deltaTime = currentTime - this.lastFrameTime;
    if (deltaTime < this.frameInterval) {
      return; // Skip this frame
    }
    this.lastFrameTime = currentTime - (deltaTime % this.frameInterval);

    this.updateClaw();
    this.updatePhysics();
    this.updateArcadeEffects();

    // Update joystick visual based on keyboard input (desktop only)
    // On mobile, the virtual joystick handles its own visual updates
    if (!isMobile()) {
      this.cabinet.updateJoystickFromKeyboard({
        w: this.keys.w || false,
        s: this.keys.s || false,
        a: this.keys.a || false,
        d: this.keys.d || false,
        ArrowUp: this.keys.ArrowUp || false,
        ArrowDown: this.keys.ArrowDown || false,
        ArrowLeft: this.keys.ArrowLeft || false,
        ArrowRight: this.keys.ArrowRight || false,
      });
    }

    // Update atmospheric effects (dust, background, floating particles)
    this.atmosphericEffects.animate(0.01);

    // Update camera controls
    this.controls.update();

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

  private toggleCameraControls(): void {
    this.cameraControlsEnabled = !this.cameraControlsEnabled;
    this.controls.enabled = this.cameraControlsEnabled;
    this.renderer.domElement.style.cursor = this.cameraControlsEnabled
      ? "grab"
      : "crosshair";
    this.updateControlModeUI();
  }

  private updateControlModeUI(): void {
    const modeText = this.cameraControlsEnabled
      ? "Camera Mode (WASD/Arrows: Move | Space: Drop | C: Control Panel)"
      : "Control Panel Mode (WASD/Arrows: Move | Space: Drop | C: Camera)";

    const instructionEl = document.querySelector(".instruction");
    if (instructionEl) {
      instructionEl.textContent = modeText;
    }
  }
}

new CraneGame();
