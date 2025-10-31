import "./crane-game.scss";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { randomFloat } from "../../utils/random";
import { isMobile } from "../../utils/misc";
import { setupKeyboardControl } from "../../utils/keyboard-control";
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
    setupKeyboardControl();

    await RAPIER.init();

    await this.loadPlushieModel();

    // Now create physics manager after WASM is loaded
    this.physicsManager = new PhysicsManager();

    this.clawPhysics = new ClawPhysics(
      this.physicsManager,
      RAPIER,
      new THREE.Vector3(0, GAME_CONFIG.claw.restingHeight, 0),
    );

    this.createPhysicsBoundaries();

    this.setupScene();
    this.setupLights();

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
    this.ledStrips = cabinet.ledStrips;
    this.floorCanvas = cabinet.floorCanvas;
    this.floorTexture = cabinet.floorTexture;

    // Pass camera to control panel for raycasting
    cabinet.controlPanel.setCamera(this.camera);

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

    this.craneRope = this.clawManager.craneRope;
    this.createPrizes();
    this.setupUI();
    this.animate();

    window.addEventListener("resize", () => this.onWindowResize());
  }

  createPhysicsBoundaries() {
    const floorY = GAME_CONFIG.physics.floorY;
    this.physicsManager.createStaticBox(
      new THREE.Vector3(0, floorY, 0),
      new THREE.Vector3(10, 0.25, 10),
    );

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

        this.disableShadowsForPerformance(model);

        this.plushieTemplates.push(model);
      } catch (error) {
        console.error(`Failed to load model ${modelPath}:`, error);
      }
    }
  }

  private disableShadowsForPerformance(model: THREE.Group) {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
  }

  setupScene() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(0, 5, isMobile() ? 50 : 40);
    this.camera.lookAt(0, 5, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.5;
    document.getElementById("container")!.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 5, 0);
    this.controls.minDistance = 15;
    this.controls.maxDistance = 80;
    this.controls.maxPolarAngle = Math.PI / 1.5;
    this.controls.minPolarAngle = Math.PI / 8;
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.5;
    this.controls.rotateSpeed = 0.5;

    if (isMobile()) {
      this.controls.enabled = false;
      this.renderer.domElement.style.touchAction = "none";
    } else {
      this.controls.enabled = true;
    }

    this.controls.update();
  }

  setupLights() {
    const ambient = new THREE.AmbientLight(0xfff8e1, 0.6);
    this.scene.add(ambient);

    const spotLight = new THREE.SpotLight(0xffffff, 2.5);
    spotLight.position.set(0, 25, 0);
    spotLight.castShadow = false;
    spotLight.angle = Math.PI / 3.5;
    spotLight.penumbra = 0.4;
    this.scene.add(spotLight);

    const light1 = new THREE.PointLight(0xff00ff, 1.8, 40);
    light1.position.set(-12, 8, 12);
    light1.castShadow = false;
    this.scene.add(light1);

    const light2 = new THREE.PointLight(0x00ffff, 1.8, 40);
    light2.position.set(12, 8, 12);
    light2.castShadow = false;
    this.scene.add(light2);

    const light3 = new THREE.PointLight(0xffff00, 1.5, 40);
    light3.position.set(0, 8, -12);
    light3.castShadow = false;
    this.scene.add(light3);

    const light4 = new THREE.PointLight(0xff1493, 1.5, 35);
    light4.position.set(8, 4, 8);
    light4.castShadow = false;
    this.scene.add(light4);

    const rimLight = new THREE.DirectionalLight(0x88ccff, 0.8);
    rimLight.position.set(-20, 15, -20);
    rimLight.castShadow = false;
    this.scene.add(rimLight);

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
    const modelIndex = this.prizes.length % this.plushieTemplates.length;
    const template = this.plushieTemplates[modelIndex];
    const prizeGroup = template.clone();

    this.scalePrizeModel(prizeGroup);
    this.storeOriginalEmissiveProperties(prizeGroup);

    prizeGroup.position.set(x, y, z);
    prizeGroup.rotation.y = randomFloat(0, Math.PI * 2);
    prizeGroup.frustumCulled = false;

    this.scene.add(prizeGroup);

    const prizeRadius = this.calculatePrizeRadius(prizeGroup);
    const weight = randomFloat(
      GAME_CONFIG.prizes.weightRange[0],
      GAME_CONFIG.prizes.weightRange[1],
    );
    const bounciness = randomFloat(
      GAME_CONFIG.prizes.bouncinessRange[0],
      GAME_CONFIG.prizes.bouncinessRange[1],
    );
    const deformability = randomFloat(0.6, 0.9);

    this.applyDeformabilityVisuals(prizeGroup, deformability);

    const rigidBody = this.physicsManager.createDynamicSphere(
      prizeGroup.position,
      prizeRadius,
      weight,
      bounciness,
      GAME_CONFIG.prizes.friction,
      deformability,
    );

    const prize: Prize = {
      mesh: prizeGroup,
      rigidBody,
      grabbed: false,
      settled: false,
      weight,
      deformability,
      bounciness,
      materialType: "plush",
      gripStrength: 0,
      dropChance: 0,
    };

    return prize;
  }

  private scalePrizeModel(prizeGroup: THREE.Group) {
    const targetSize = this.prizeSize * GAME_CONFIG.prizes.radiusMultiplier;
    const modelHeight = 2.4;
    const scale = (targetSize / modelHeight) * 2;
    prizeGroup.scale.setScalar(scale);
  }

  private storeOriginalEmissiveProperties(prizeGroup: THREE.Group) {
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
  }

  private calculatePrizeRadius(prizeGroup: THREE.Group): number {
    const scaledBox = new THREE.Box3().setFromObject(prizeGroup);
    return (
      Math.max(
        scaledBox.max.x - scaledBox.min.x,
        scaledBox.max.z - scaledBox.min.z,
      ) / 2
    );
  }

  private applyDeformabilityVisuals(
    prizeGroup: THREE.Group,
    deformability: number,
  ) {
    prizeGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshStandardMaterial;
        material.roughness = 0.6 + deformability * 0.3;
        material.metalness = Math.max(0, 0.3 - deformability * 0.2);
        material.userData.deformability = deformability;
      }
    });
  }

  createPrizes() {
    const floorY = GAME_CONFIG.physics.floorY + 0.5;

    const { cols, rows, offsetX, offsetZ, spacingX, spacingZ } =
      this.calculatePrizeGrid();

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = offsetX + col * spacingX + randomFloat(-0.15, 0.15);
        const z = offsetZ + row * spacingZ + randomFloat(-0.15, 0.15);

        if (this.isTooCloseToBin(x, z)) {
          continue;
        }

        const dropHeight = randomFloat(
          GAME_CONFIG.prizes.dropHeightRange[0],
          GAME_CONFIG.prizes.dropHeightRange[1],
        );
        const y = floorY + dropHeight;

        const prize = this.createSinglePrize(x, y, z);
        this.prizes.push(prize);
      }
    }
  }

  private calculatePrizeGrid() {
    const usableWidth =
      GAME_CONFIG.cabinet.width - GAME_CONFIG.prizes.gridPadding;
    const usableDepth =
      GAME_CONFIG.cabinet.depth - GAME_CONFIG.prizes.gridPadding;

    const cols = Math.floor(usableWidth / this.prizeSize);
    const rows = Math.floor(usableDepth / this.prizeSize);

    const spacingX = usableWidth / cols;
    const spacingZ = usableDepth / rows;
    const offsetX = -(usableWidth / 2) + spacingX / 2;
    const offsetZ = -(usableDepth / 2) + spacingZ / 2;

    return { cols, rows, offsetX, offsetZ, spacingX, spacingZ };
  }

  private isTooCloseToBin(x: number, z: number): boolean {
    const distanceToBin = Math.sqrt(
      Math.pow(x - this.binPosition.x, 2) + Math.pow(z - this.binPosition.z, 2),
    );
    return distanceToBin < GAME_CONFIG.physics.binDistanceThreshold;
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
    this.physicsManager.step();

    this.prizes.forEach((prize) => {
      if (prize.grabbed) {
        this.updateGrabbedPrize(prize);
      } else {
        this.updateFreePrize(prize);
      }
    });
  }

  private updateGrabbedPrize(prize: Prize) {
    prize.settled = false;

    const targetX = this.clawManager.clawPosition.x;
    const targetY = this.clawManager.clawPosition.y - 1.5;
    const targetZ = this.clawManager.clawPosition.z;

    // Use faster interpolation for more responsive following
    prize.mesh.position.x += (targetX - prize.mesh.position.x) * 0.3;
    prize.mesh.position.y += (targetY - prize.mesh.position.y) * 0.3;
    prize.mesh.position.z += (targetZ - prize.mesh.position.z) * 0.3;

    prize.rigidBody.setTranslation(
      {
        x: prize.mesh.position.x,
        y: prize.mesh.position.y,
        z: prize.mesh.position.z,
      },
      true,
    );
    prize.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);

    this.applyGrabbedPrizeVisuals(prize);
  }

  private applyGrabbedPrizeVisuals(prize: Prize) {
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
  }

  private updateFreePrize(prize: Prize) {
    this.physicsManager.syncMeshWithBody(prize.mesh, prize.rigidBody);

    this.updatePrizeSettledState(prize);
    this.resetPrizeVisuals(prize);
    this.checkIfPrizeInBin(prize);
  }

  private updatePrizeSettledState(prize: Prize) {
    const linvel = prize.rigidBody.linvel();
    const speed = Math.sqrt(
      linvel.x * linvel.x + linvel.y * linvel.y + linvel.z * linvel.z,
    );

    prize.settled = speed < 0.05 && prize.mesh.position.y < -8;
  }

  private resetPrizeVisuals(prize: Prize) {
    if (prize.mesh instanceof THREE.Group) {
      prize.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshStandardMaterial;
          if (material.emissiveIntensity > 0.2) {
            material.emissiveIntensity =
              (material.userData?.originalEmissiveIntensity as number) || 0.0;
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
  }

  private checkIfPrizeInBin(prize: Prize) {
    const inBinX = Math.abs(prize.mesh.position.x - this.binPosition.x) < 1.5;
    const inBinZ = Math.abs(prize.mesh.position.z - this.binPosition.z) < 1.5;
    const inBinY = prize.mesh.position.y < -8;

    if (
      inBinX &&
      inBinZ &&
      inBinY &&
      !this.wonPrizes.some((wonPrize) => wonPrize.mesh.id === prize.mesh.id)
    ) {
      this.wonPrizes.push(prize);
      this.showMessage("YOU WIN!");
      this.audioManager.playSound("win", 0.6, 1.0);
      this.updateUI();
    }
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
      return;
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

    this.atmosphericEffects.animate(0.01);
    this.controls.update();

    this.renderer.render(this.scene, this.camera);
  };

  updateArcadeEffects() {
    this.animateLEDStrips();
    this.animateFloorPattern();
  }

  private animateLEDStrips() {
    if (!this.ledStrips) return;

    const time = Date.now() * 0.001;
    this.ledStrips.forEach((led: THREE.Mesh, i: number) => {
      const mat = led.material as THREE.MeshStandardMaterial;
      const phase = (time * 2 + i * 0.3) % (Math.PI * 2);
      const intensity = Math.sin(phase) * 1 + 2;
      mat.emissiveIntensity = Math.max(0.5, intensity);

      const hue = (time * 30 + i * 10) % 360;
      const color = new THREE.Color().setHSL(hue / 360, 1, 0.5);
      mat.emissive = color;
      mat.color = color;
    });
  }

  private animateFloorPattern() {
    const floorCanvas = this.floorCanvas;
    const floorTexture = this.floorTexture;
    if (!floorCanvas || !floorTexture) return;

    const ctx = floorCanvas.getContext("2d")!;
    const time = Date.now() * 0.001;

    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, floorCanvas.width, floorCanvas.height);

    this.drawPulsingGrid(ctx, floorCanvas, time);

    floorTexture.needsUpdate = true;
  }

  private drawPulsingGrid(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    time: number,
  ) {
    const gridSize = 32;
    const pulseIntensity = Math.sin(time * 2) * 0.3 + 0.7;
    const hue = (time * 30) % 360;

    ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${pulseIntensity * 0.4})`;
    ctx.lineWidth = 2;

    for (let x = 0; x <= canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y <= canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
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
