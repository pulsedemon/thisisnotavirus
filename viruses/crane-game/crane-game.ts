import "./crane-game.scss";
import * as THREE from "three";
import Random from "../../utils/random";

interface Prize {
  mesh: THREE.Mesh;
  body: {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    mass: number;
  };
  grabbed: boolean;
  settled: boolean; // True when prize has come to rest
  imageUrl: string;
  weight: number;
  deformability: number;
  bounciness: number;
  materialType: "plush" | "ball" | "box" | "cylinder";
}

class CraneRope {
  segments: THREE.Mesh[] = [];
  joints: THREE.Vector3[] = [];
  segmentLength = 0.5;
  segmentCount = 20;
  damping = 0.98;
  stiffness = 0.95;

  constructor(startPos: THREE.Vector3, endPos: THREE.Vector3) {
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
        const prevJoint = this.joints[i - 1];
        const joint = this.joints[i];
        const nextJoint = this.joints[i + 1];

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

class AudioManager {
  private audioContext: AudioContext;
  private sounds: Map<string, AudioBuffer> = new Map();
  private isEnabled = true;

  constructor() {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      this.loadSounds();
    } catch (e) {
      console.warn("Web Audio API not supported");
    }
  }

  async loadSounds() {
    // Generate procedural sounds since we don't have audio files
    this.generateProceduralSounds();
  }

  private generateProceduralSounds() {
    // Generate basic sound effects using oscillators
    const soundTypes = [
      "clawDescend",
      "clawGrab",
      "prizeDrop",
      "win",
      "ambient",
      "coin",
    ];

    soundTypes.forEach((soundName) => {
      const buffer = this.generateProceduralSound(soundName);
      if (buffer) this.sounds.set(soundName, buffer);
    });
  }

  private generateProceduralSound(soundName: string): AudioBuffer | null {
    try {
      const sampleRate = this.audioContext.sampleRate;
      const duration = this.getSoundDuration(soundName);
      const buffer = this.audioContext.createBuffer(
        1,
        sampleRate * duration,
        sampleRate,
      );
      const data = buffer.getChannelData(0);

      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;

        switch (soundName) {
          case "clawDescend":
            // Mechanical whirring sound
            data[i] =
              Math.sin(t * 150) * Math.exp(-t * 2) * 0.3 +
              Math.sin(t * 75) * Math.exp(-t * 1.5) * 0.2;
            break;
          case "clawGrab":
            // Sharp metallic clank
            data[i] = Math.sin(t * 800) * Math.exp(-t * 8) * 0.4;
            break;
          case "prizeDrop":
            // Soft thud with some bounce
            const envelope = Math.exp(-t * 3);
            data[i] =
              (Math.sin(t * 100) * envelope + Math.random() * 0.1) * 0.3;
            break;
          case "win":
            // Celebratory ascending notes
            const noteFreq = 220 + (Math.floor(t * 4) % 5) * 110;
            data[i] =
              Math.sin(t * noteFreq * 2 * Math.PI) * Math.exp(-t * 0.5) * 0.4;
            break;
          case "coin":
            // Coin dropping sound
            data[i] = Math.sin(t * 600) * Math.exp(-t * 6) * 0.5;
            break;
          default:
            data[i] = 0;
        }
      }

      return buffer;
    } catch (e) {
      return null;
    }
  }

  private getSoundDuration(soundName: string): number {
    const durations = {
      clawDescend: 0.8,
      clawGrab: 0.3,
      prizeDrop: 0.6,
      win: 1.5,
      ambient: 2.0,
      coin: 0.4,
    };
    return durations[soundName as keyof typeof durations] || 0.5;
  }

  playSound(name: string, volume = 0.5, pitch = 1.0) {
    if (!this.isEnabled || !this.sounds.has(name)) return;

    try {
      const buffer = this.sounds.get(name)!;
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      source.playbackRate.value = pitch;
      gainNode.gain.value = Math.min(volume, 1.0);

      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      source.start();
    } catch (e) {
      console.warn("Failed to play sound:", name);
    }
  }

  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }
}

class AtmosphericEffects {
  dustParticles: THREE.Points[] = [];
  particleCount = 50;

  constructor(scene: THREE.Scene) {
    this.createDustParticles(scene);
  }

  createDustParticles(scene: THREE.Scene) {
    for (let i = 0; i < this.particleCount; i++) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(3);
      const colors = new Float32Array(3);

      // Random positions in cabinet
      positions[0] = (Math.random() - 0.5) * 20;
      positions[1] = Math.random() * 15 - 5;
      positions[2] = (Math.random() - 0.5) * 20;

      colors[0] = 0.8 + Math.random() * 0.2; // Slight yellowish tint
      colors[1] = 0.7 + Math.random() * 0.2;
      colors[2] = 0.5 + Math.random() * 0.1;

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.3,
      });

      const particle = new THREE.Points(geometry, material);
      this.dustParticles.push(particle);
      scene.add(particle);
    }
  }

  animateDust(windStrength = 0.01) {
    this.dustParticles.forEach((particle) => {
      const positions = particle.geometry.attributes.position
        .array as Float32Array;

      // Gentle floating animation
      positions[0] += (Math.random() - 0.5) * windStrength;
      positions[1] += (Math.random() - 0.5) * windStrength * 0.5;
      positions[2] += (Math.random() - 0.5) * windStrength;

      // Reset particles that float too far
      if (Math.abs(positions[0]) > 15) positions[0] *= 0.8;
      if (Math.abs(positions[1]) > 20) positions[1] *= 0.8;
      if (Math.abs(positions[2]) > 15) positions[2] *= 0.8;

      particle.geometry.attributes.position.needsUpdate = true;
    });
  }
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
  clawRestingHeight = 10; // Height where claw waits
  clawPosition = new THREE.Vector3(0, 10, 0);
  targetPosition = new THREE.Vector2(0, 0);
  binPosition = new THREE.Vector3(8, -5, 8); // Prize bin location (raised)
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
  credits = 10;

  // Physics
  gravity = -0.05;
  friction = 0.95;

  // Images
  images: string[] = [];
  textureLoader = new THREE.TextureLoader();

  // UI
  uiElement: HTMLDivElement;

  // Enhanced features
  audioManager: AudioManager;
  atmosphericEffects: AtmosphericEffects;
  clawVelocity = new THREE.Vector3();
  swingDamping = 0.95;

  constructor() {
    this.setupScene();
    this.setupLights();
    this.createCabinet();
    this.createClaw();
    this.loadImages();
    this.setupUI();
    this.setupControls();
    this.initializeEnhancedFeatures();
    this.animate();

    window.addEventListener("resize", () => this.onWindowResize());
  }

  setupScene() {
    this.scene = new THREE.Scene();

    // Create animated gradient background
    this.createAnimatedBackground();

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

  createAnimatedBackground() {
    // Animated gradient background using a large sphere
    const geometry = new THREE.SphereGeometry(200, 32, 32);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d")!;

    // Store canvas for animation
    (this as any).bgCanvas = canvas;
    (this as any).bgContext = context;

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
    });

    const sphere = new THREE.Mesh(geometry, material);
    this.scene.add(sphere);

    // Create floating neon particles
    this.createFloatingLights();
  }

  createFloatingLights() {
    // Create glowing particle spheres that float around
    const particleCount = 30;
    const colors = [0xff00ff, 0x00ffff, 0xffff00, 0xff0080, 0x00ff00];

    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(0.3, 8, 8);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.6,
      });

      const particle = new THREE.Mesh(geometry, material);
      particle.position.set(
        Random.numberBetween(-50, 50),
        Random.numberBetween(-20, 40),
        Random.numberBetween(-60, -20),
      );

      // Store animation data
      (particle as any).floatSpeed = Random.numberBetween(0.01, 0.03);
      (particle as any).floatOffset = Random.numberBetween(0, Math.PI * 2);
      (particle as any).horizontalSpeed = Random.numberBetween(0.005, 0.015);

      this.scene.add(particle);
      if (!(this as any).particles) (this as any).particles = [];
      (this as any).particles.push(particle);
    }
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

  cabinetSize = { width: 20, height: 25, depth: 20 };
  prizeSize = 1.3; // Slightly smaller for more prizes

  createCabinet() {
    this.cabinet = new THREE.Group();

    // Add base cabinet/pedestal
    const baseHeight = 12;
    const baseGeometry = new THREE.BoxGeometry(
      this.cabinetSize.width + 2,
      baseHeight,
      this.cabinetSize.depth + 2,
    );
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf8f8f8,
      metalness: 0.2,
      roughness: 0.6,
      clearcoat: 0.3,
      clearcoatRoughness: 0.1,
      reflectivity: 0.1,
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -10 - baseHeight / 2 - 0.5;
    this.cabinet.add(base);

    // Add colorful side panels to base
    const panelMaterial = new THREE.MeshStandardMaterial({
      color: 0xff1493,
      metalness: 0.4,
      roughness: 0.6,
      emissive: 0xff1493,
      emissiveIntensity: 0.3,
    });

    const leftPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, baseHeight - 2, this.cabinetSize.depth + 1),
      panelMaterial,
    );
    leftPanel.position.set(
      -(this.cabinetSize.width + 2) / 2 + 0.15,
      -10 - baseHeight / 2 - 0.5,
      0,
    );
    this.cabinet.add(leftPanel);

    const rightPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, baseHeight - 2, this.cabinetSize.depth + 1),
      panelMaterial,
    );
    rightPanel.position.set(
      (this.cabinetSize.width + 2) / 2 - 0.15,
      -10 - baseHeight / 2 - 0.5,
      0,
    );
    this.cabinet.add(rightPanel);

    // Floor (prize area) - animated grid pattern
    const floorGeometry = new THREE.BoxGeometry(
      this.cabinetSize.width,
      0.5,
      this.cabinetSize.depth,
    );

    // Create canvas for animated floor
    const floorCanvas = document.createElement("canvas");
    floorCanvas.width = 256;
    floorCanvas.height = 256;
    const floorTexture = new THREE.CanvasTexture(floorCanvas);
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(4, 4);

    // Store for animation
    (this as any).floorCanvas = floorCanvas;
    (this as any).floorTexture = floorTexture;

    const floorMaterial = new THREE.MeshStandardMaterial({
      map: floorTexture,
      color: 0xffffff,
      metalness: 0.2,
      roughness: 0.8,
      emissive: 0x111111,
      emissiveIntensity: 0.1,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = -10;
    floor.receiveShadow = true;
    this.cabinet.add(floor);

    // Glass walls (more visible with light cyan tint)
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xaaffff,
      transparent: true,
      opacity: 0.15,
      metalness: 0.05,
      roughness: 0.02,
      transmission: 0.95,
      thickness: 0.8,
      ior: 1.5, // Index of refraction for glass
      reflectivity: 0.1,
      clearcoat: 0.1,
      clearcoatRoughness: 0.05,
    });

    // Front wall - full transparent glass
    const frontWallGeometry = new THREE.BoxGeometry(
      this.cabinetSize.width,
      this.cabinetSize.height,
      0.15,
    );
    const frontWall = new THREE.Mesh(frontWallGeometry, glassMaterial);
    frontWall.position.set(0, 2.5, this.cabinetSize.depth / 2);
    this.cabinet.add(frontWall);

    // Back wall
    const backWall = new THREE.Mesh(frontWallGeometry, glassMaterial);
    backWall.position.set(0, 2.5, -this.cabinetSize.depth / 2);
    this.cabinet.add(backWall);

    // Side walls
    const sideWallGeometry = new THREE.BoxGeometry(
      0.15,
      this.cabinetSize.height,
      this.cabinetSize.depth,
    );
    const leftWall = new THREE.Mesh(sideWallGeometry, glassMaterial);
    leftWall.position.set(-this.cabinetSize.width / 2, 2.5, 0);
    this.cabinet.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeometry, glassMaterial);
    rightWall.position.set(this.cabinetSize.width / 2, 2.5, 0);
    this.cabinet.add(rightWall);

    // Add thin white frame edges (just outlines, not blocking view)
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.6,
      roughness: 0.4,
    });

    // Vertical frame posts
    const postGeometry = new THREE.BoxGeometry(
      0.4,
      this.cabinetSize.height,
      0.4,
    );
    const frontLeftPost = new THREE.Mesh(postGeometry, frameMaterial);
    frontLeftPost.position.set(
      -this.cabinetSize.width / 2,
      2.5,
      this.cabinetSize.depth / 2,
    );
    this.cabinet.add(frontLeftPost);

    const frontRightPost = new THREE.Mesh(postGeometry, frameMaterial);
    frontRightPost.position.set(
      this.cabinetSize.width / 2,
      2.5,
      this.cabinetSize.depth / 2,
    );
    this.cabinet.add(frontRightPost);

    const backLeftPost = new THREE.Mesh(postGeometry, frameMaterial);
    backLeftPost.position.set(
      -this.cabinetSize.width / 2,
      2.5,
      -this.cabinetSize.depth / 2,
    );
    this.cabinet.add(backLeftPost);

    const backRightPost = new THREE.Mesh(postGeometry, frameMaterial);
    backRightPost.position.set(
      this.cabinetSize.width / 2,
      2.5,
      -this.cabinetSize.depth / 2,
    );
    this.cabinet.add(backRightPost);

    // Top marquee/header (more substantial like real crane games)
    const marqueeHeight = 3;
    const marqueeGeometry = new THREE.BoxGeometry(
      this.cabinetSize.width + 2,
      marqueeHeight,
      this.cabinetSize.depth + 2,
    );
    const marqueeMaterial = new THREE.MeshStandardMaterial({
      color: 0xff1493,
      metalness: 0.6,
      roughness: 0.4,
      emissive: 0xff1493,
      emissiveIntensity: 0.4,
    });
    const marquee = new THREE.Mesh(marqueeGeometry, marqueeMaterial);
    marquee.position.y = 15 + marqueeHeight / 2;
    this.cabinet.add(marquee);

    // Add Japanese text to front of marquee
    this.addJapaneseText(marquee, marqueeHeight);

    // Add yellow trim to marquee
    const trimGeometry = new THREE.BoxGeometry(
      this.cabinetSize.width + 2.2,
      0.3,
      this.cabinetSize.depth + 2.2,
    );
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xffff00,
      emissiveIntensity: 0.6,
    });
    const topTrim = new THREE.Mesh(trimGeometry, trimMaterial);
    topTrim.position.y = 15 + marqueeHeight;
    this.cabinet.add(topTrim);

    const bottomTrim = new THREE.Mesh(trimGeometry, trimMaterial);
    bottomTrim.position.y = 15;
    this.cabinet.add(bottomTrim);

    // Add decorative corner lights on marquee
    const lightGeometry = new THREE.SphereGeometry(0.4, 8, 8);
    const lightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 1.5,
    });
    const marqueeCorners = [
      [-10.5, 15 + marqueeHeight / 2, -10.5],
      [10.5, 15 + marqueeHeight / 2, -10.5],
      [-10.5, 15 + marqueeHeight / 2, 10.5],
      [10.5, 15 + marqueeHeight / 2, 10.5],
    ];
    marqueeCorners.forEach(([x, y, z]) => {
      const light = new THREE.Mesh(lightGeometry, lightMaterial);
      light.position.set(x, y, z);
      this.cabinet.add(light);
    });

    // Create prize bin/chute
    this.createPrizeBin();

    // Add realistic details
    this.addControlPanel();
    this.addLEDLightStrips();
    this.addInternalLighting();
    this.addMechanicalDetails();
    this.addCabinetDetails();
    this.addGlassDecals();

    this.scene.add(this.cabinet);
  }

  addControlPanel() {
    // Control panel on the front of the cabinet
    const panelWidth = 8;
    const panelHeight = 4;
    const panelDepth = 1;
    const panelY = -10;
    const panelZ = this.cabinetSize.depth / 2 + panelDepth / 2;

    // Main panel box
    const panelGeometry = new THREE.BoxGeometry(
      panelWidth,
      panelHeight,
      panelDepth,
    );
    const panelMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      metalness: 0.5,
      roughness: 0.6,
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.set(0, panelY, panelZ);
    this.cabinet.add(panel);

    // Large red START button
    const startButtonGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.3, 16);
    const startButtonMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5,
      metalness: 0.3,
      roughness: 0.4,
    });
    const startButton = new THREE.Mesh(
      startButtonGeometry,
      startButtonMaterial,
    );
    startButton.rotation.x = Math.PI / 2;
    startButton.position.set(0, panelY, panelZ + panelDepth / 2 + 0.2);
    this.cabinet.add(startButton);

    // Joystick
    const joystickBaseGeometry = new THREE.CylinderGeometry(0.5, 0.6, 0.4, 16);
    const joystickBaseMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.7,
      roughness: 0.3,
    });
    const joystickBase = new THREE.Mesh(
      joystickBaseGeometry,
      joystickBaseMaterial,
    );
    joystickBase.position.set(-3, panelY, panelZ + panelDepth / 2 + 0.2);
    this.cabinet.add(joystickBase);

    // Joystick stick
    const joystickStickGeometry = new THREE.CylinderGeometry(
      0.15,
      0.15,
      1.5,
      8,
    );
    const joystickStickMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2,
    });
    const joystickStick = new THREE.Mesh(
      joystickStickGeometry,
      joystickStickMaterial,
    );
    joystickStick.position.set(
      -3,
      panelY + 0.75,
      panelZ + panelDepth / 2 + 0.2,
    );
    this.cabinet.add(joystickStick);

    // Joystick ball
    const joystickBallGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const joystickBallMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      metalness: 0.4,
      roughness: 0.5,
    });
    const joystickBall = new THREE.Mesh(
      joystickBallGeometry,
      joystickBallMaterial,
    );
    joystickBall.position.set(-3, panelY + 1.5, panelZ + panelDepth / 2 + 0.2);
    this.cabinet.add(joystickBall);

    // Coin slot
    const coinSlotGeometry = new THREE.BoxGeometry(1.5, 0.3, 0.2);
    const coinSlotMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      metalness: 0.9,
      roughness: 0.2,
    });
    const coinSlot = new THREE.Mesh(coinSlotGeometry, coinSlotMaterial);
    coinSlot.position.set(3, panelY + 1, panelZ + panelDepth / 2 + 0.1);
    this.cabinet.add(coinSlot);

    // "COIN" label
    const coinLabelCanvas = document.createElement("canvas");
    coinLabelCanvas.width = 128;
    coinLabelCanvas.height = 32;
    const ctx = coinLabelCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffff00";
    ctx.font = "bold 24px Arial";
    ctx.textAlign = "center";
    ctx.fillText("COIN", 64, 24);
    const coinLabelTexture = new THREE.CanvasTexture(coinLabelCanvas);
    const coinLabelMaterial = new THREE.MeshBasicMaterial({
      map: coinLabelTexture,
      transparent: true,
    });
    const coinLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 0.25),
      coinLabelMaterial,
    );
    coinLabel.position.set(3, panelY + 1.5, panelZ + panelDepth / 2 + 0.3);
    this.cabinet.add(coinLabel);
  }

  addLEDLightStrips() {
    // Animated LED strips around the cabinet edges
    const ledStrips: THREE.Mesh[] = [];

    // Top edge LED strip housing (continuous strip around marquee)
    const topY = 12;
    const stripHousingGeometry = new THREE.TorusGeometry(11, 0.2, 8, 50);
    const stripHousingMaterial = new THREE.MeshStandardMaterial({
      color: 0xff1493,
      metalness: 0.6,
      roughness: 0.4,
      emissive: 0xff1493,
      emissiveIntensity: 0.4,
    });
    const stripHousing = new THREE.Mesh(
      stripHousingGeometry,
      stripHousingMaterial,
    );
    stripHousing.rotation.x = Math.PI / 2;
    stripHousing.position.y = topY;
    this.cabinet.add(stripHousing);

    // LEDs mounted on the strip
    const ledCount = 20;
    const ledSize = 0.25;

    for (let i = 0; i < ledCount; i++) {
      const ledGeometry = new THREE.SphereGeometry(ledSize, 8, 8);
      const ledMaterial = new THREE.MeshStandardMaterial({
        color: 0xff00ff,
        emissive: 0xff00ff,
        emissiveIntensity: 2,
      });
      const led = new THREE.Mesh(ledGeometry, ledMaterial);

      // Position around the top perimeter, embedded in housing
      const angle = (i / ledCount) * Math.PI * 2;
      const radius = 11;
      led.position.set(
        Math.cos(angle) * radius,
        topY,
        Math.sin(angle) * radius,
      );

      this.cabinet.add(led);
      ledStrips.push(led);
    }

    // Store for animation
    (this as any).ledStrips = ledStrips;

    // Side LED strip housings (vertical) - full height along glass edges
    const glassHeight = this.cabinetSize.height;
    const glassBottom = 2.5 - glassHeight / 2; // -10
    const sideStripCount = 10; // More LEDs for full height

    // Left and right edges of front glass
    const edgePositions = [
      -this.cabinetSize.width / 2,
      this.cabinetSize.width / 2,
    ]; // -10, 10

    edgePositions.forEach((x) => {
      // Vertical strip housing - full height
      const verticalHousingGeometry = new THREE.BoxGeometry(
        0.6,
        glassHeight,
        0.4,
      );
      const verticalHousingMaterial = new THREE.MeshStandardMaterial({
        color: 0xff1493,
        metalness: 0.6,
        roughness: 0.4,
        emissive: 0xff1493,
        emissiveIntensity: 0.4,
      });
      const verticalHousing = new THREE.Mesh(
        verticalHousingGeometry,
        verticalHousingMaterial,
      );
      verticalHousing.position.set(x, 2.5, this.cabinetSize.depth / 2 + 0.3);
      this.cabinet.add(verticalHousing);

      // LEDs mounted on vertical strips - evenly spaced
      const ledSpacing = glassHeight / (sideStripCount + 1);
      for (let i = 1; i <= sideStripCount; i++) {
        const ledGeometry = new THREE.SphereGeometry(ledSize, 8, 8);
        const ledMaterial = new THREE.MeshStandardMaterial({
          color: 0x00ffff,
          emissive: 0x00ffff,
          emissiveIntensity: 2,
        });
        const led = new THREE.Mesh(ledGeometry, ledMaterial);
        const yPos = glassBottom + i * ledSpacing;
        led.position.set(x, yPos, this.cabinetSize.depth / 2 + 0.4);
        this.cabinet.add(led);
        ledStrips.push(led);
      }
    });
  }

  addInternalLighting() {
    // Spotlights inside cabinet pointing at prizes
    const spotlightPositions = [
      { x: -5, z: -5 },
      { x: 5, z: -5 },
      { x: -5, z: 5 },
      { x: 0, z: 0 },
    ];

    spotlightPositions.forEach((pos) => {
      const spotlight = new THREE.SpotLight(0xffffff, 1.5);
      spotlight.position.set(pos.x, 8, pos.z);
      spotlight.target.position.set(pos.x, -10, pos.z);
      spotlight.angle = Math.PI / 6;
      spotlight.penumbra = 0.5;
      spotlight.castShadow = false;
      this.cabinet.add(spotlight);
      this.cabinet.add(spotlight.target);
    });

    // Colored accent lights
    const colors = [0xff00ff, 0x00ffff, 0xffff00];
    colors.forEach((color, i) => {
      const light = new THREE.PointLight(color, 0.5, 20);
      light.position.set((i - 1) * 6, 5, 0);
      this.cabinet.add(light);
    });
  }

  addMechanicalDetails() {
    // Motor/mechanism box at the top
    const motorBoxGeometry = new THREE.BoxGeometry(3, 2, 3);
    const motorBoxMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.3,
      roughness: 0.7,
    });
    const motorBox = new THREE.Mesh(motorBoxGeometry, motorBoxMaterial);
    motorBox.position.set(0, 11, 0);
    this.cabinet.add(motorBox);

    // Pulley system
    const pulleyGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16);
    const pulleyMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.9,
      roughness: 0.2,
    });
    [-1, 1].forEach((x) => {
      const pulley = new THREE.Mesh(pulleyGeometry, pulleyMaterial);
      pulley.position.set(x, 11.5, 0);
      pulley.rotation.x = Math.PI / 2;
      this.cabinet.add(pulley);
    });

    // Metal tracks/rails
    const trackGeometry = new THREE.BoxGeometry(0.2, 0.3, 18);
    const trackMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.9,
      roughness: 0.3,
    });
    [-10, 10].forEach((x) => {
      const track = new THREE.Mesh(trackGeometry, trackMaterial);
      track.position.set(x, 10, 0);
      this.cabinet.add(track);
    });

    // Support beams
    const beamGeometry = new THREE.BoxGeometry(0.3, 20, 0.3);
    const beamMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.7,
      roughness: 0.5,
    });
    [
      { x: -10, z: -10 },
      { x: 10, z: -10 },
      { x: -10, z: 10 },
      { x: 10, z: 10 },
    ].forEach((pos) => {
      const beam = new THREE.Mesh(beamGeometry, beamMaterial);
      beam.position.set(pos.x, 0, pos.z);
      this.cabinet.add(beam);
    });
  }

  addCabinetDetails() {
    // Speaker grills on sides
    const grillGeometry = new THREE.PlaneGeometry(2, 3);
    const grillCanvas = document.createElement("canvas");
    grillCanvas.width = 64;
    grillCanvas.height = 96;
    const ctx = grillCanvas.getContext("2d")!;
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, grillCanvas.width, grillCanvas.height);
    ctx.fillStyle = "#666666";
    for (let y = 5; y < grillCanvas.height; y += 10) {
      for (let x = 5; x < grillCanvas.width; x += 8) {
        ctx.fillRect(x, y, 4, 4);
      }
    }
    const grillTexture = new THREE.CanvasTexture(grillCanvas);
    const grillMaterial = new THREE.MeshBasicMaterial({ map: grillTexture });

    [-11.5, 11.5].forEach((x) => {
      const grill = new THREE.Mesh(grillGeometry, grillMaterial);
      grill.position.set(x, 0, 0);
      grill.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      this.cabinet.add(grill);
    });

    // Ventilation slots
    const ventGeometry = new THREE.BoxGeometry(4, 0.2, 0.5);
    const ventMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      metalness: 0.5,
      roughness: 0.7,
    });
    [0, 1, 2].forEach((i) => {
      const vent = new THREE.Mesh(ventGeometry, ventMaterial);
      vent.position.set(-6, -15 + i * 1, 11.5);
      this.cabinet.add(vent);
    });

    // Coin return slot
    const coinReturnGeometry = new THREE.BoxGeometry(1, 0.4, 0.3);
    const coinReturnMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      metalness: 0.9,
      roughness: 0.2,
    });
    const coinReturn = new THREE.Mesh(coinReturnGeometry, coinReturnMaterial);
    coinReturn.position.set(5, -11, 11.5);
    this.cabinet.add(coinReturn);

    // Decorative screws/bolts
    const screwGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.1, 8);
    const screwMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.9,
      roughness: 0.3,
    });
    [
      { x: -10, y: 10, z: 10 },
      { x: 10, y: 10, z: 10 },
      { x: -10, y: -10, z: 10 },
      { x: 10, y: -10, z: 10 },
    ].forEach((pos) => {
      const screw = new THREE.Mesh(screwGeometry, screwMaterial);
      screw.position.set(pos.x, pos.y, pos.z + 0.5);
      screw.rotation.x = Math.PI / 2;
      this.cabinet.add(screw);
    });
  }

  addGlassDecals() {
    // PUSH button instructions in Japanese on front glass
    const instructionCanvas = document.createElement("canvas");
    instructionCanvas.width = 256;
    instructionCanvas.height = 128;
    const ctx = instructionCanvas.getContext("2d")!;

    // Background
    ctx.fillStyle = "rgba(255, 255, 0, 0.9)";
    ctx.fillRect(0, 0, instructionCanvas.width, instructionCanvas.height);
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 4;
    ctx.strokeRect(
      5,
      5,
      instructionCanvas.width - 10,
      instructionCanvas.height - 10,
    );

    // Text
    ctx.fillStyle = "#ff0000";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    ctx.fillText("PUSH", 128, 50);
    ctx.font = "bold 32px Arial";
    ctx.fillText("ボタン", 128, 90);

    const instructionTexture = new THREE.CanvasTexture(instructionCanvas);
    const instructionMaterial = new THREE.MeshBasicMaterial({
      map: instructionTexture,
      transparent: true,
      opacity: 0.8,
    });
    const instructionDecal = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 2),
      instructionMaterial,
    );
    instructionDecal.position.set(-5, 3, 10.1);
    this.cabinet.add(instructionDecal);

    // Warning sticker
    const warningCanvas = document.createElement("canvas");
    warningCanvas.width = 128;
    warningCanvas.height = 128;
    const wctx = warningCanvas.getContext("2d")!;
    wctx.fillStyle = "#ffff00";
    wctx.beginPath();
    wctx.moveTo(64, 10);
    wctx.lineTo(118, 108);
    wctx.lineTo(10, 108);
    wctx.closePath();
    wctx.fill();
    wctx.strokeStyle = "#ff0000";
    wctx.lineWidth = 4;
    wctx.stroke();
    wctx.fillStyle = "#000000";
    wctx.font = "bold 72px Arial";
    wctx.textAlign = "center";
    wctx.fillText("!", 64, 90);

    const warningTexture = new THREE.CanvasTexture(warningCanvas);
    const warningMaterial = new THREE.MeshBasicMaterial({
      map: warningTexture,
      transparent: true,
      opacity: 0.8,
    });
    const warningDecal = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 1.5),
      warningMaterial,
    );
    warningDecal.position.set(5, 6, 10.1);
    this.cabinet.add(warningDecal);
  }

  addJapaneseText(marquee: THREE.Mesh, marqueeHeight: number) {
    // Create canvas for text
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const context = canvas.getContext("2d")!;

    // Clear canvas
    context.fillStyle = "#ff1493";
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Add exciting Japanese text
    context.font = "bold 120px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";

    // White outline
    context.strokeStyle = "#ffffff";
    context.lineWidth = 8;
    context.strokeText(
      "クレーンゲーム",
      canvas.width / 2,
      canvas.height / 2 - 20,
    );

    // Yellow fill
    context.fillStyle = "#ffff00";
    context.fillText(
      "クレーンゲーム",
      canvas.width / 2,
      canvas.height / 2 - 20,
    );

    // Add "GET PRIZE!" in smaller text
    context.font = "bold 60px Arial, sans-serif";
    context.strokeStyle = "#ffffff";
    context.lineWidth = 4;
    context.strokeText("挑戦！", canvas.width / 2, canvas.height / 2 + 60);
    context.fillStyle = "#00ffff";
    context.fillText("挑戦！", canvas.width / 2, canvas.height / 2 + 60);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create plane for text
    const textGeometry = new THREE.PlaneGeometry(18, 4.5);
    const textMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    });
    const textPlane = new THREE.Mesh(textGeometry, textMaterial);

    // Position on front of marquee
    textPlane.position.set(
      0,
      15 + marqueeHeight / 2,
      this.cabinetSize.depth / 2 + 1.1,
    );
    this.cabinet.add(textPlane);
  }

  createPrizeBin() {
    // Prize bin at the front right corner (raised higher)
    const binWidth = 4;
    const binDepth = 4;
    const binHeight = 5; // Taller bin

    // Bin walls
    const binMaterial = new THREE.MeshStandardMaterial({
      color: 0xff9900,
      metalness: 0.6,
      roughness: 0.4,
      emissive: 0xff6600,
      emissiveIntensity: 0.4,
    });

    // Back wall of bin
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(binWidth, binHeight, 0.2),
      binMaterial,
    );
    backWall.position.set(
      this.binPosition.x,
      -10 + binHeight / 2,
      this.binPosition.z - binDepth / 2,
    );
    this.cabinet.add(backWall);

    // Left wall of bin
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, binHeight, binDepth),
      binMaterial,
    );
    leftWall.position.set(
      this.binPosition.x - binWidth / 2,
      -10 + binHeight / 2,
      this.binPosition.z,
    );
    this.cabinet.add(leftWall);

    // Right wall of bin
    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, binHeight, binDepth),
      binMaterial,
    );
    rightWall.position.set(
      this.binPosition.x + binWidth / 2,
      -10 + binHeight / 2,
      this.binPosition.z,
    );
    this.cabinet.add(rightWall);

    // Add glowing edges to bin
    [backWall, leftWall, rightWall].forEach((wall) => {
      const edgeGeometry = new THREE.EdgesGeometry(wall.geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0xffff00,
        linewidth: 2,
      });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      wall.add(edges);
    });

    // Add a sign above the bin
    const signGeometry = new THREE.PlaneGeometry(3, 1);
    const signMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      emissive: 0xffff00,
      emissiveIntensity: 0.8,
    });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(
      this.binPosition.x,
      -10 + binHeight + 0.5,
      this.binPosition.z - binDepth / 2,
    );
    this.cabinet.add(sign);
  }

  createClaw() {
    this.claw = new THREE.Group();

    // Create rope physics system instead of rigid cable
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
        const data = await response.json();
        this.images = data.images;
        this.createPrizes();
      }
    } catch (error) {
      console.error("Failed to load images:", error);
    }
  }

  createPrizes() {
    const floorY = -9.5;

    // Calculate grid dimensions based on cabinet and prize size
    // Reserve space for the prize bin (avoid spawning prizes there)
    const binReserveWidth = 5; // Width to avoid near bin
    const binReserveDepth = 5; // Depth to avoid near bin

    const usableWidth = this.cabinetSize.width - 2; // Leave 1 unit padding on each side
    const usableDepth = this.cabinetSize.depth - 2;

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
        const imageUrl = Random.itemInArray(this.images);

        // Vary prize dimensions for more organic look (avoid flat shapes)
        const widthVariation = Random.numberBetween(0.95, 1.15);
        const heightVariation = Random.numberBetween(0.95, 1.25); // Some taller, but not flat
        const depthVariation = Random.numberBetween(0.95, 1.15);

        // Randomly choose different shapes for variety (more like real plush toys)
        const shapeType = Random.int(3); // 0: cylinder, 1: capsule, 2: rounded box
        let geometry: THREE.BufferGeometry;

        if (shapeType === 0) {
          // Cylinder shape (like rolled plushies)
          geometry = new THREE.CylinderGeometry(
            this.prizeSize * 0.5 * widthVariation,
            this.prizeSize * 0.5 * depthVariation,
            this.prizeSize * heightVariation,
            16,
          );
        } else if (shapeType === 1) {
          // Capsule shape (sphere + cylinder = plush toy shape)
          const capsuleGroup = new THREE.Group();
          const cylinderHeight = this.prizeSize * heightVariation * 0.6;
          const radius = this.prizeSize * 0.5 * widthVariation;

          const cylinder = new THREE.CylinderGeometry(
            radius,
            radius,
            cylinderHeight,
            16,
          );
          const topSphere = new THREE.SphereGeometry(
            radius,
            16,
            8,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2,
          );
          const bottomSphere = new THREE.SphereGeometry(
            radius,
            16,
            8,
            0,
            Math.PI * 2,
            Math.PI / 2,
            Math.PI / 2,
          );

          // Merge geometries for capsule
          geometry = cylinder;
          geometry.translate(0, 0, 0);
        } else {
          // Sphere shape (round plushies)
          geometry = new THREE.SphereGeometry(
            this.prizeSize * 0.6 * widthVariation,
            16,
            12,
          );
        }

        // Load texture
        const texture = this.textureLoader.load(imageUrl);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;

        // Randomly vary material properties for variety
        const brightness = Random.numberBetween(0.05, 0.15);
        const roughness = Random.numberBetween(0.6, 0.9);

        // Single material that wraps around the geometry
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          emissive: 0x111111,
          emissiveIntensity: brightness,
          roughness: roughness,
          metalness: 0.1,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Position in grid with slight randomness
        const x = offsetX + col * spacingX + Random.numberBetween(-0.15, 0.15);
        const z = offsetZ + row * spacingZ + Random.numberBetween(-0.15, 0.15);

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
        const dropHeight = Random.numberBetween(2, 15);

        const y = floorY + dropHeight;

        mesh.position.set(x, y, z);
        mesh.rotation.y = Random.numberBetween(0, Math.PI * 2);

        // Store shape info for better collision detection
        (mesh as any).prizeRadius =
          shapeType === 2
            ? this.prizeSize * 0.6 * widthVariation
            : this.prizeSize * 0.5 * Math.max(widthVariation, depthVariation);

        this.scene.add(mesh);

        const prize: Prize = {
          mesh,
          body: {
            position: mesh.position.clone(),
            velocity: new THREE.Vector3(0, 0, 0),
            mass: 1,
          },
          grabbed: false,
          settled: false, // Starts unsettled so it can fall
          imageUrl,
          weight: Random.numberBetween(0.8, 1.2),
          deformability: Random.numberBetween(0.1, 0.8),
          bounciness: Random.numberBetween(0.1, 0.3),
          materialType: Random.itemInArray([
            "plush",
            "ball",
            "box",
            "cylinder",
          ] as const),
        };

        this.prizes.push(prize);
      }
    }

    // Add extra "filler" prizes in random positions to make it look full
    const numFillerPrizes = 200; // Add 200 more random prizes for completely packed look

    for (let i = 0; i < numFillerPrizes; i++) {
      const imageUrl = Random.itemInArray(this.images);

      // Random position within cabinet bounds, avoiding bin
      let x, z, distanceToBin;
      let attempts = 0;
      do {
        x = Random.numberBetween(-8, 8);
        z = Random.numberBetween(-8, 8);
        distanceToBin = Math.sqrt(
          Math.pow(x - this.binPosition.x, 2) +
            Math.pow(z - this.binPosition.z, 2),
        );
        attempts++;
      } while (distanceToBin < 4 && attempts < 20); // Avoid bin area

      if (attempts >= 20) continue; // Skip if can't find good spot

      // Random shape and size variations (avoid flat shapes)
      const widthVariation = Random.numberBetween(0.95, 1.15);
      const heightVariation = Random.numberBetween(0.95, 1.25);
      const depthVariation = Random.numberBetween(0.95, 1.15);
      const shapeType = Random.int(3);

      let geometry: THREE.BufferGeometry;
      if (shapeType === 0) {
        geometry = new THREE.CylinderGeometry(
          this.prizeSize * 0.5 * widthVariation,
          this.prizeSize * 0.5 * depthVariation,
          this.prizeSize * heightVariation,
          16,
        );
      } else if (shapeType === 1) {
        const cylinderHeight = this.prizeSize * heightVariation * 0.6;
        const radius = this.prizeSize * 0.5 * widthVariation;
        geometry = new THREE.CylinderGeometry(
          radius,
          radius,
          cylinderHeight,
          16,
        );
      } else {
        geometry = new THREE.SphereGeometry(
          this.prizeSize * 0.6 * widthVariation,
          16,
          12,
        );
      }

      const texture = this.textureLoader.load(imageUrl);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;

      const brightness = Random.numberBetween(0.05, 0.15);
      const roughness = Random.numberBetween(0.6, 0.9);

      const material = new THREE.MeshStandardMaterial({
        map: texture,
        emissive: 0x111111,
        emissiveIntensity: brightness,
        roughness: roughness,
        metalness: 0.1,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      // Drop from random height to let physics handle stacking
      const dropHeight = Random.numberBetween(2, 15);
      const y = floorY + dropHeight;

      mesh.position.set(x, y, z);
      mesh.rotation.y = Random.numberBetween(0, Math.PI * 2);

      (mesh as any).prizeRadius =
        shapeType === 2
          ? this.prizeSize * 0.6 * widthVariation
          : this.prizeSize * 0.5 * Math.max(widthVariation, depthVariation);

      this.scene.add(mesh);

      const prize: Prize = {
        mesh,
        body: {
          position: mesh.position.clone(),
          velocity: new THREE.Vector3(0, 0, 0),
          mass: 1,
        },
        grabbed: false,
        settled: false, // Starts unsettled so it can fall
        imageUrl,
        weight: Random.numberBetween(0.8, 1.2),
        deformability: Random.numberBetween(0.1, 0.8),
        bounciness: Random.numberBetween(0.1, 0.3),
        materialType: Random.itemInArray([
          "plush",
          "ball",
          "box",
          "cylinder",
        ] as const),
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
    let instruction = "WASD: Move | SPACE: Drop Claw";

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
    const moveSpeed = 0.3;
    const keys = { w: false, a: false, s: false, d: false, space: false };

    window.addEventListener("keydown", (e) => {
      const key = e.key.toLowerCase();
      if (key in keys) keys[key as keyof typeof keys] = true;

      if (
        key === " " &&
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
      const key = e.key.toLowerCase();
      if (key in keys) keys[key as keyof typeof keys] = false;
    });

    // Store keys reference for movement
    (this as any).keys = keys;
    (this as any).moveSpeed = moveSpeed;
  }

  updateClawMovement() {
    const keys = (this as any).keys;
    const moveSpeed = (this as any).moveSpeed;

    if (
      this.isDescending ||
      this.isAscending ||
      this.isMovingToBin ||
      this.isReturning
    )
      return;

    // Calculate movement input
    const moveVector = new THREE.Vector3();
    if (keys.w) moveVector.z -= moveSpeed;
    if (keys.s) moveVector.z += moveSpeed;
    if (keys.a) moveVector.x -= moveSpeed;
    if (keys.d) moveVector.x += moveSpeed;

    if (moveVector.length() > 0) {
      // Add momentum to claw movement
      this.clawVelocity.add(moveVector.multiplyScalar(0.1));
      this.clawVelocity.multiplyScalar(0.92); // Gradual deceleration

      // Apply movement with momentum
      this.clawPosition.add(this.clawVelocity);

      // Add slight swing based on movement direction and speed
      const swingIntensity = this.clawVelocity.length() * 0.05;
      const swingAngle = Math.sin(Date.now() * 0.01) * swingIntensity;
      this.claw.rotation.z = swingAngle;
    } else {
      // Apply gentle return swing when not moving
      this.clawVelocity.multiplyScalar(0.95);
      this.claw.rotation.z *= 0.95;
    }

    // Clamp to cabinet bounds with slight bounce
    const oldX = this.clawPosition.x;
    const oldZ = this.clawPosition.z;

    this.clawPosition.x = THREE.MathUtils.clamp(this.clawPosition.x, -8, 8);
    this.clawPosition.z = THREE.MathUtils.clamp(this.clawPosition.z, -8, 8);

    // Add bounce effect if hitting walls
    if (Math.abs(this.clawPosition.x) === 8 && Math.abs(oldX) < 8) {
      this.clawVelocity.x *= -0.3;
      this.audioManager.playSound("clawGrab", 0.2, 1.2);
    }
    if (Math.abs(this.clawPosition.z) === 8 && Math.abs(oldZ) < 8) {
      this.clawVelocity.z *= -0.3;
      this.audioManager.playSound("clawGrab", 0.2, 1.2);
    }

    // Smooth the target position towards actual position
    this.targetPosition.x +=
      (this.clawPosition.x - this.targetPosition.x) * 0.1;
    this.targetPosition.y +=
      (this.clawPosition.z - this.targetPosition.y) * 0.1;
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
    this.audioManager.playSound("clawDescend", 0.3, 0.9);

    this.updateUI();
  }

  updateClaw() {
    this.updateClawMovement();

    // Descending
    if (this.isDescending) {
      this.clawPosition.y -= 0.2;
      if (this.clawPosition.y <= -7) {
        this.clawPosition.y = -7;
        this.isDescending = false;
        this.isGrabbing = true;
        this.startGrabbing();
      }
    }

    // Ascending
    if (this.isAscending) {
      this.clawPosition.y += 0.15;
      if (this.clawPosition.y >= this.clawRestingHeight) {
        this.clawPosition.y = this.clawRestingHeight;
        this.isAscending = false;
        this.isMovingToBin = true;
      }
    }

    // Moving to bin
    if (this.isMovingToBin) {
      this.clawPosition.x += (this.binPosition.x - this.clawPosition.x) * 0.08;
      this.clawPosition.z += (this.binPosition.z - this.clawPosition.z) * 0.08;

      const distanceToBin = Math.sqrt(
        Math.pow(this.binPosition.x - this.clawPosition.x, 2) +
          Math.pow(this.binPosition.z - this.clawPosition.z, 2),
      );

      if (distanceToBin < 0.5) {
        this.isMovingToBin = false;

        // Immediately release prizes when we reach the bin
        console.log("Reached bin, releasing prizes now");
        this.releasePrizesPhysics();

        // Play prize drop sound
        this.audioManager.playSound(
          "prizeDrop",
          0.4,
          0.8 + Math.random() * 0.4,
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
      // Smoother, slower movement back to center
      this.clawPosition.x += (0 - this.clawPosition.x) * 0.03;
      this.clawPosition.z += (0 - this.clawPosition.z) * 0.03;
      this.clawPosition.y +=
        (this.clawRestingHeight - this.clawPosition.y) * 0.03;

      if (
        Math.abs(this.clawPosition.x) < 0.1 &&
        Math.abs(this.clawPosition.z) < 0.1 &&
        Math.abs(this.clawPosition.y - this.clawRestingHeight) < 0.1
      ) {
        this.clawPosition.x = 0;
        this.clawPosition.z = 0;
        this.clawPosition.y = this.clawRestingHeight;
        this.targetPosition.set(0, 0);
        this.isReturning = false;
      }
    }

    // Update rope physics instead of rigid cable
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
    const grabRadius = 1.8; // Slightly larger since we're limiting to 1 prize
    const maxPrizesToGrab = 1; // Japanese crane games: grab max 1 prize!

    // Find all prizes within grab range and calculate distances
    const prizesInRange: Array<{ prize: Prize; distance: number }> = [];

    this.prizes.forEach((prize) => {
      if (prize.grabbed) return;

      // Check distance from claw to prize
      const distance = prize.mesh.position.distanceTo(this.clawPosition);

      // Get prize's effective radius for better collision
      const prizeRadius = (prize.mesh as any).prizeRadius || 0.75;
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

    // Only try to grab the closest prize (max 1)
    let grabbedCount = 0;
    for (let i = 0; i < Math.min(prizesInRange.length, maxPrizesToGrab); i++) {
      const { prize, distance } = prizesInRange[i];

      // 70% chance to grab each prize
      if (Math.random() < 0.7) {
        prize.grabbed = true;
        prize.settled = false;
        this.grabbedPrizes.push(prize);
        grabbedCount++;

        const prizeRadius = (prize.mesh as any).prizeRadius || 0.75;
        console.log(
          `Grabbed prize ${grabbedCount}! Distance: ${distance.toFixed(2)}`,
        );

        // Unsettle nearby prizes for realistic disturbance
        this.prizes.forEach((otherPrize) => {
          if (otherPrize === prize || otherPrize.grabbed) return;
          const distToOther = prize.mesh.position.distanceTo(
            otherPrize.mesh.position,
          );
          if (distToOther < 2) {
            otherPrize.settled = false;
            const pushDir = new THREE.Vector3()
              .subVectors(otherPrize.mesh.position, prize.mesh.position)
              .normalize();
            otherPrize.body.velocity.add(pushDir.multiplyScalar(0.03));
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

    if (this.grabbedPrizes.length > 0) {
      this.showMessage("YOU WIN!");

      // Play win sound effect
      this.audioManager.playSound("win", 0.6, 1.0);

      // Store the prizes we're releasing in a local variable
      const prizesToRelease = [...this.grabbedPrizes];
      console.log(`Stored ${prizesToRelease.length} prizes to release`);

      // Clear the grabbed prizes array immediately
      this.grabbedPrizes = [];

      // Release prizes and let them fall with physics
      prizesToRelease.forEach((prize) => {
        prize.grabbed = false;
        prize.settled = false; // Mark as unsettled so it can fall
        // Give them a slight downward velocity to start falling
        prize.body.velocity.set(0, -0.2, 0);
        this.wonPrizes.push(prize);
      });

      this.credits += 3; // Bonus credits

      // Remove won prizes from scene after they've fallen
      setTimeout(() => {
        prizesToRelease.forEach((prize) => {
          this.scene.remove(prize.mesh);
          const index = this.prizes.indexOf(prize);
          if (index > -1) this.prizes.splice(index, 1);
        });
      }, 2000); // Give them 2 seconds to fall into the bin visually
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
    const floorY = -9.5;
    const settleVelocityThreshold = 0.05; // If velocity is below this, prize can settle (increased)

    this.prizes.forEach((prize, index) => {
      if (prize.grabbed) {
        // Mark as unsettled when grabbed
        prize.settled = false;

        // Follow claw whenever grabbed (holding, ascending, moving to bin, or returning)
        const targetX = this.clawPosition.x;
        const targetY = this.clawPosition.y - 1.5; // Hang below claw
        const targetZ = this.clawPosition.z;

        prize.mesh.position.x += (targetX - prize.mesh.position.x) * 0.2;
        prize.mesh.position.y += (targetY - prize.mesh.position.y) * 0.2;
        prize.mesh.position.z += (targetZ - prize.mesh.position.z) * 0.2;

        // Reset velocity while being held
        prize.body.velocity.set(0, 0, 0);

        // Update body position to match mesh
        prize.body.position.copy(prize.mesh.position);
      } else if (!prize.grabbed && !prize.settled) {
        // Apply gravity
        prize.body.velocity.y += this.gravity;

        // Update position
        prize.mesh.position.add(prize.body.velocity);
        prize.body.position.copy(prize.mesh.position);

        // Prize-to-prize collision detection
        const prizeRadius = (prize.mesh as any).prizeRadius || 0.75;

        for (let i = 0; i < this.prizes.length; i++) {
          if (i === index) continue; // Skip self

          const otherPrize = this.prizes[i];
          if (otherPrize.grabbed) continue; // Skip grabbed prizes

          const otherRadius = (otherPrize.mesh as any).prizeRadius || 0.75;
          const distance = prize.mesh.position.distanceTo(
            otherPrize.mesh.position,
          );
          const minDistance = prizeRadius + otherRadius;

          // Check for collision
          if (distance < minDistance && distance > 0) {
            // Calculate collision normal
            const normal = new THREE.Vector3()
              .subVectors(prize.mesh.position, otherPrize.mesh.position)
              .normalize();

            // Separate prizes
            const overlap = minDistance - distance;
            const separation = normal.multiplyScalar(overlap * 0.5);

            prize.mesh.position.add(separation);
            prize.body.position.copy(prize.mesh.position);

            // Apply collision response to velocity
            const relativeVelocity = prize.body.velocity
              .clone()
              .sub(otherPrize.body.velocity);
            const velocityAlongNormal = relativeVelocity.dot(normal);

            if (velocityAlongNormal < 0) {
              const restitution = 0.1; // Very low bounciness for faster settling
              const impulse = normal.multiplyScalar(
                -(1 + restitution) * velocityAlongNormal * 0.5,
              );
              prize.body.velocity.add(impulse);

              // Add stronger friction to prevent rolling
              prize.body.velocity.multiplyScalar(0.85);
            }
          }
        }

        // Floor collision - adjust for different shapes
        const minY = floorY + prizeRadius;
        const onGround = prize.mesh.position.y <= minY + 0.1;

        if (prize.mesh.position.y <= minY) {
          prize.mesh.position.y = minY;
          prize.body.position.y = minY;
          prize.body.velocity.y = 0;
          prize.body.velocity.multiplyScalar(this.friction);
        }

        // Wall collisions
        if (Math.abs(prize.mesh.position.x) > 9) {
          prize.mesh.position.x = Math.sign(prize.mesh.position.x) * 9;
          prize.body.velocity.x *= -0.5;
        }
        if (Math.abs(prize.mesh.position.z) > 9) {
          prize.mesh.position.z = Math.sign(prize.mesh.position.z) * 9;
          prize.body.velocity.z *= -0.5;
        }

        // Slow rotation (reduced for less rolling)
        prize.mesh.rotation.x += prize.body.velocity.y * 0.05;
        prize.mesh.rotation.z += prize.body.velocity.x * 0.05;

        // Apply damping when on ground to help settle
        if (onGround) {
          prize.body.velocity.multiplyScalar(0.96);
        }

        // Check if prize should settle (velocity is very low AND on ground)
        const speed = prize.body.velocity.length();

        // Only settle if on ground and barely moving
        if (onGround && speed < settleVelocityThreshold) {
          prize.settled = true;
          prize.body.velocity.set(0, 0, 0); // Stop all movement
        }
      }
    });
  }

  initializeEnhancedFeatures() {
    // Initialize audio system
    this.audioManager = new AudioManager();

    // Initialize atmospheric effects
    this.atmosphericEffects = new AtmosphericEffects(this.scene);

    // Play ambient arcade sounds
    setInterval(() => {
      if (Math.random() < 0.1) {
        // 10% chance every interval
        this.audioManager.playSound("ambient", 0.2, 0.8 + Math.random() * 0.4);
      }
    }, 5000);
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

    // Update atmospheric effects
    this.atmosphericEffects.animateDust(0.01);

    this.renderer.render(this.scene, this.camera);
  };

  updateArcadeEffects() {
    // Animate LED light strips (chase effect)
    const ledStrips = (this as any).ledStrips;
    if (ledStrips) {
      const time = Date.now() * 0.001;
      ledStrips.forEach((led: THREE.Mesh, i: number) => {
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
    const floorCanvas = (this as any).floorCanvas;
    const floorTexture = (this as any).floorTexture;
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

    // Animate background gradient
    const bgCanvas = (this as any).bgCanvas;
    const bgContext = (this as any).bgContext;
    if (bgCanvas && bgContext) {
      const time = Date.now() * 0.001;

      // Create animated gradient
      const gradient = bgContext.createLinearGradient(0, 0, 0, bgCanvas.height);

      // Animated colors cycling through arcade neon palette
      const hue1 = (time * 20) % 360;
      const hue2 = (time * 20 + 120) % 360;
      const hue3 = (time * 20 + 240) % 360;

      gradient.addColorStop(0, `hsl(${hue1}, 70%, 15%)`);
      gradient.addColorStop(0.5, `hsl(${hue2}, 80%, 10%)`);
      gradient.addColorStop(1, `hsl(${hue3}, 70%, 12%)`);

      bgContext.fillStyle = gradient;
      bgContext.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

      // Add some radial glow spots
      for (let i = 0; i < 3; i++) {
        const radialGradient = bgContext.createRadialGradient(
          Math.sin(time * 0.5 + i * 2) * 200 + 256,
          Math.cos(time * 0.3 + i * 2) * 200 + 256,
          0,
          Math.sin(time * 0.5 + i * 2) * 200 + 256,
          Math.cos(time * 0.3 + i * 2) * 200 + 256,
          150,
        );
        radialGradient.addColorStop(
          0,
          `hsla(${(time * 30 + i * 120) % 360}, 100%, 50%, 0.15)`,
        );
        radialGradient.addColorStop(1, "rgba(0,0,0,0)");
        bgContext.fillStyle = radialGradient;
        bgContext.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
      }

      // Update texture
      if (this.scene.children[0] && (this.scene.children[0] as any).material) {
        const material = (this.scene.children[0] as any).material;
        if (material.map) {
          material.map.needsUpdate = true;
        }
      }
    }

    // Animate floating particles
    const particles = (this as any).particles;
    if (particles) {
      const time = Date.now() * 0.001;
      particles.forEach((particle: THREE.Mesh) => {
        const floatSpeed = (particle as any).floatSpeed;
        const floatOffset = (particle as any).floatOffset;
        const horizontalSpeed = (particle as any).horizontalSpeed;

        // Vertical floating
        particle.position.y += Math.sin(time * floatSpeed + floatOffset) * 0.02;

        // Horizontal drifting
        particle.position.x += Math.cos(time * horizontalSpeed) * 0.01;

        // Pulsing opacity
        const mat = particle.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.4 + Math.sin(time * 2 + floatOffset) * 0.3;

        // Wrap around
        if (particle.position.y > 40) particle.position.y = -20;
        if (particle.position.y < -20) particle.position.y = 40;
        if (particle.position.x > 50) particle.position.x = -50;
        if (particle.position.x < -50) particle.position.x = 50;
      });
    }
  }
}

new CraneGame();
