import "./void.scss";
import * as THREE from "three";
import Random from "../../utils/random";

// Type definitions for userData
interface TentacleUserData {
  baseAngle: number;
  writheSpeed: number;
  corruptionLevel: number;
  chaosPhase: number;
  thrashIntensity: number;
  originalPoints: THREE.Vector3[];
}

interface EyeUserData {
  originalAngle: number;
  blinkPhase: number;
  watchIntensity: number;
  lastBlink: number;
}

interface RingUserData {
  originalRotationZ: number;
  speed: number;
  corruptionPhase: number;
}

interface QuantumFieldUserData {
  energyResponse: number;
  phase: number;
}

class Void {
  WIDTH: number;
  HEIGHT: number;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  flowingSphere: THREE.Mesh;
  particles: THREE.Points;
  beautyRings: THREE.Group;
  currentTime = 0;
  lastFrameTime = 0;
  deltaTime = 0;
  mouseX = 0;
  mouseY = 0;
  targetX = 0;
  targetY = 0;
  mousePressed = false;
  lastClickTime = 0;
  audioContext: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  audioDataArray: Uint8Array = new Uint8Array(0);
  audioLevel = 0;
  audioUpdateFrame = 0;
  trailParticles: THREE.Points[] = [];
  trailParticlePool: THREE.Points[] = []; // Object pool for performance
  mouseTrail: THREE.Vector3[] = [];
  gravityWells: THREE.Vector3[] = [];
  timeWarp = 1.0;
  energyLevel = 0;
  lastMousePos = new THREE.Vector2();
  mouseVelocity = new THREE.Vector2();
  mouseResponsiveness = 0.15; // Increased base responsiveness
  corruptionTentacles: THREE.Mesh[] = [];
  evilEyes: THREE.Mesh[] = [];
  bloodVeins: THREE.Line[] = [];
  bloodVeinPool: THREE.Line[] = []; // Object pool for blood veins
  screechLevel = 0;
  lastScreechTime = 0;
  idleTime = 0;
  lastInteractionTime = 0;
  rageBuildupLevel = 0;
  autonomousEvents: number[] = [];
  isHavingTantrum = false;
  tentacleMorphFrame = 0; // Throttle tentacle morphing
  frameCount = 0;

  constructor() {
    this.setRenderOptions();
    this.scene = new THREE.Scene();

    this.createMalevolentPulsatingCore();
    this.createChaoticEvilParticleStorm();
    this.createCorruptedEnergyRings();
    this.createDarkEnergyCorruptionFields();
    this.createCorruptionTentacles();
    this.createEvilEyes();
    this.setupResponsiveUserInteraction();
    this.setupMicrophoneAudioReactivity();

    document.getElementById("container")!.appendChild(this.renderer.domElement);
    window.addEventListener("resize", () => this.setRenderOptions(), false);

    this.render();
  }

  setRenderOptions() {
    this.WIDTH = window.innerWidth;
    this.HEIGHT = window.innerHeight;

    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setClearColor(0x000000, 1);
    }

    this.renderer.setSize(this.WIDTH, this.HEIGHT);

    if (!this.camera) {
      const VIEW_ANGLE = 60;
      const ASPECT = this.WIDTH / this.HEIGHT;
      const NEAR = 0.1;
      const FAR = 1000;
      this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
      this.camera.position.z = 200;
    } else {
      this.camera.aspect = this.WIDTH / this.HEIGHT;
      this.camera.updateProjectionMatrix();
    }
  }

  createMalevolentPulsatingCore() {
    const CORE_RADIUS = 35;
    const CORE_DETAIL_LEVEL = 3;
    const DEEP_RED_EVIL_ENERGY = 0xff0033;

    const coreGeometry = new THREE.IcosahedronGeometry(
      CORE_RADIUS,
      CORE_DETAIL_LEVEL,
    );
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: DEEP_RED_EVIL_ENERGY,
      transparent: true,
      opacity: 0.8,
      wireframe: false,
    });

    this.flowingSphere = new THREE.Mesh(coreGeometry, coreMaterial);

    const INNER_CORE_RADIUS = 25;
    const INNER_CORE_DETAIL = 32;
    const DARK_CRIMSON = 0x330000;

    const innerCoreGeometry = new THREE.SphereGeometry(
      INNER_CORE_RADIUS,
      INNER_CORE_DETAIL,
      INNER_CORE_DETAIL,
    );
    const innerCoreMaterial = new THREE.MeshBasicMaterial({
      color: DARK_CRIMSON,
      transparent: true,
      opacity: 0.9,
      wireframe: true,
    });
    const innerDarkCore = new THREE.Mesh(innerCoreGeometry, innerCoreMaterial);
    this.flowingSphere.add(innerDarkCore);

    const ENERGY_SHELL_RADIUS = 45;
    const ENERGY_SHELL_DETAIL = 2;
    const BRIGHT_EVIL_RED = 0xff3366;

    const energyShellGeometry = new THREE.IcosahedronGeometry(
      ENERGY_SHELL_RADIUS,
      ENERGY_SHELL_DETAIL,
    );
    const energyShellMaterial = new THREE.MeshBasicMaterial({
      color: BRIGHT_EVIL_RED,
      transparent: true,
      opacity: 0.3,
      wireframe: true,
      blending: THREE.AdditiveBlending,
    });
    const cracklingEnergyShell = new THREE.Mesh(
      energyShellGeometry,
      energyShellMaterial,
    );
    this.flowingSphere.add(cracklingEnergyShell);

    this.scene.add(this.flowingSphere);
  }

  createChaoticEvilParticleStorm() {
    const CHAOTIC_PARTICLE_COUNT = 1200;
    const SPAWN_RADIUS_MIN = 50;
    const SPAWN_RADIUS_MAX = 400;
    const COLOR_VARIANT_COUNT = 3;
    const DEEP_RED_CORRUPTION_THRESHOLD = 1;
    const DARK_PURPLE_MALEVOLENCE_THRESHOLD = 2;

    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(CHAOTIC_PARTICLE_COUNT * 3);
    const particleColors = new Float32Array(CHAOTIC_PARTICLE_COUNT * 3);

    for (let i = 0; i < CHAOTIC_PARTICLE_COUNT; i++) {
      const spawnRadius = Random.numberBetween(
        SPAWN_RADIUS_MIN,
        SPAWN_RADIUS_MAX,
      );
      const sphericalTheta = Random.numberBetween(0, Math.PI * 2);
      const sphericalPhi = Random.numberBetween(0, Math.PI);

      particlePositions[i * 3] =
        spawnRadius * Math.sin(sphericalPhi) * Math.cos(sphericalTheta);
      particlePositions[i * 3 + 1] =
        spawnRadius * Math.sin(sphericalPhi) * Math.sin(sphericalTheta);
      particlePositions[i * 3 + 2] = spawnRadius * Math.cos(sphericalPhi);

      const colorVariant = Random.numberBetween(0, COLOR_VARIANT_COUNT);

      if (colorVariant < DEEP_RED_CORRUPTION_THRESHOLD) {
        particleColors[i * 3] = Random.numberBetween(0.7, 1.0);
        particleColors[i * 3 + 1] = Random.numberBetween(0.0, 0.2);
        particleColors[i * 3 + 2] = Random.numberBetween(0.0, 0.3);
      } else if (colorVariant < DARK_PURPLE_MALEVOLENCE_THRESHOLD) {
        particleColors[i * 3] = Random.numberBetween(0.4, 0.8);
        particleColors[i * 3 + 1] = Random.numberBetween(0.0, 0.2);
        particleColors[i * 3 + 2] = Random.numberBetween(0.4, 0.9);
      } else {
        particleColors[i * 3] = Random.numberBetween(0.1, 0.4);
        particleColors[i * 3 + 1] = Random.numberBetween(0.0, 0.1);
        particleColors[i * 3 + 2] = Random.numberBetween(0.0, 0.1);
      }
    }

    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(particlePositions, 3),
    );
    particleGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(particleColors, 3),
    );

    const PARTICLE_SIZE = 2;
    const particleMaterial = new THREE.PointsMaterial({
      size: PARTICLE_SIZE,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.particles);
  }

  createCorruptedEnergyRings() {
    this.beautyRings = new THREE.Group();

    const CORRUPTION_RING_COUNT = 5;
    for (let i = 0; i < CORRUPTION_RING_COUNT; i++) {
      const ringGeometry = new THREE.RingGeometry(
        70 + i * 25,
        75 + i * 25,
        6 + i * 2,
      );
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xff0000 : 0x880022, // Alternating evil reds
        transparent: true,
        opacity: 0.4 - i * 0.05,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });

      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2 + i * 0.2;
      ring.rotation.y = i * 0.5;
      ring.userData = {
        originalRotationZ: i * 0.7,
        speed: 0.002 + i * 0.001,
        corruptionPhase: i * 1.2,
      } as RingUserData;

      this.beautyRings.add(ring);
    }

    this.scene.add(this.beautyRings);
  }

  createCorruptionTentacles() {
    // Create INSANELY writhing tentacles of pure chaos!
    for (let i = 0; i < 12; i++) {
      // More tentacles!
      const points = [];
      const segments = 30; // More segments for smoother chaos

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const angle = (i / 12) * Math.PI * 2;
        const radius = 30 + t * 150; // Longer reach

        // MUCH more chaotic wobbling with multiple sine waves
        const wobble1 = Math.sin(t * Math.PI * 6) * 15;
        const wobble2 = Math.cos(t * Math.PI * 8 + i) * 12;
        const wobble3 = Math.sin(t * Math.PI * 10 + i * 2) * 8;
        const totalWobble = wobble1 + wobble2 + wobble3;

        // Spiral motion combined with chaos
        const spiralAngle = angle + t * Math.PI * 4;

        points.push(
          new THREE.Vector3(
            Math.cos(spiralAngle) * radius + totalWobble,
            Math.sin(spiralAngle) * radius + totalWobble,
            Math.sin(t * Math.PI * 3) * 30 + Math.cos(t * Math.PI * 5 + i) * 15,
          ),
        );
      }

      const geometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        segments,
        Random.numberBetween(1, 4), // Variable thickness
        Random.numberBetween(6, 12), // Variable resolution
        false,
      );

      const material = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x440000 : 0x660000, // Alternating evil colors
        transparent: true,
        opacity: Random.numberBetween(0.4, 0.8),
        wireframe: Random.bool(), // Some solid, some wireframe
      });

      const tentacle = new THREE.Mesh(geometry, material);
      tentacle.userData = {
        baseAngle: (i / 12) * Math.PI * 2,
        writheSpeed: Random.numberBetween(0.01, 0.05), // Variable speeds
        corruptionLevel: 0,
        chaosPhase: Random.numberBetween(0, Math.PI * 2),
        thrashIntensity: Random.numberBetween(0.5, 2.0),
        originalPoints: points.map((p) => p.clone()), // Store original for morphing
      } as TentacleUserData;

      this.corruptionTentacles.push(tentacle);
      this.scene.add(tentacle);
    }
  }

  createEvilEyes() {
    // Create malevolent eyes that watch from the darkness
    for (let i = 0; i < 6; i++) {
      const eyeGeometry = new THREE.SphereGeometry(8, 16, 16);
      const eyeMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0,
        emissive: 0xff0000,
        emissiveIntensity: 0.5,
      });

      const eye = new THREE.Mesh(eyeGeometry, eyeMaterial);

      // Position eyes in a circle around the core
      const angle = (i / 6) * Math.PI * 2;
      const radius = 180;
      eye.position.x = Math.cos(angle) * radius;
      eye.position.y = Math.sin(angle) * radius;
      eye.position.z = Random.numberBetween(-50, 50);

      eye.userData = {
        originalAngle: angle,
        blinkPhase: Random.numberBetween(0, Math.PI * 2),
        watchIntensity: 0,
        lastBlink: 0,
      } as EyeUserData;

      this.evilEyes.push(eye);
      this.scene.add(eye);
    }
  }

  createDarkEnergyCorruptionFields() {
    const CORRUPTION_FIELD_COUNT = 7;
    for (let i = 0; i < CORRUPTION_FIELD_COUNT; i++) {
      const fieldGeometry = new THREE.SphereGeometry(180 + i * 40, 6, 6);
      const fieldMaterial = new THREE.MeshBasicMaterial({
        color: i % 3 === 0 ? 0xff0000 : i % 3 === 1 ? 0x660000 : 0x330000,
        transparent: true,
        opacity: 0,
        wireframe: true,
        blending: THREE.AdditiveBlending,
      });

      const field = new THREE.Mesh(fieldGeometry, fieldMaterial);
      field.userData = {
        originalScale: 1,
        energyResponse: 0.15 + i * 0.08,
        phase: i * 0.8,
        corruptionLevel: i * 0.2,
      };

      this.scene.add(field);
    }
  }

  setupMicrophoneAudioReactivity() {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          this.audioContext = new AudioContext();
          const source = this.audioContext.createMediaStreamSource(stream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = 256;
          this.audioDataArray = new Uint8Array(
            this.analyser.frequencyBinCount,
          ) as Uint8Array;
          source.connect(this.analyser);
        })
        .catch(() => {
          // Audio not available, that's ok
        });
    }
  }

  setupResponsiveUserInteraction() {
    document.addEventListener("mousemove", (event) => {
      // Calculate mouse velocity for energy system
      const currentMousePos = new THREE.Vector2(event.clientX, event.clientY);
      this.mouseVelocity.subVectors(currentMousePos, this.lastMousePos);
      this.lastMousePos.copy(currentMousePos);

      this.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

      // Adaptive mouse responsiveness based on velocity
      const velocity = this.mouseVelocity.length();
      this.mouseResponsiveness = Math.min(0.15 + velocity * 0.0005, 0.4);

      // Build energy from movement
      this.energyLevel = Math.min(this.energyLevel + velocity * 0.001, 1.0);

      // Add to mouse trail
      this.addToMouseTrail(event.clientX, event.clientY);

      // Reset idle timer on any interaction
      this.lastInteractionTime = this.currentTime;
      this.idleTime = 0;

      // Increase energy based on movement speed
      const speed = this.mouseVelocity.length();
      this.energyLevel = Math.min(this.energyLevel + speed * 0.001, 1.0);

      // Create ripple effect on mouse movement
      this.createRipple(event.clientX, event.clientY);
    });

    document.addEventListener("mousedown", () => {
      this.mousePressed = true;
      this.lastInteractionTime = this.currentTime;
      this.idleTime = 0;
      this.createExplosion();
    });

    document.addEventListener("mouseup", () => {
      this.mousePressed = false;
    });

    document.addEventListener("click", (event) => {
      this.lastClickTime = this.currentTime;
      this.createClickBurst(event.clientX, event.clientY);
      this.createGravityWell(event.clientX, event.clientY);
    });

    // Double-click for special effect
    document.addEventListener("dblclick", (event) => {
      this.resetScene();
      this.createClickBurst(event.clientX, event.clientY);
    });

    // Touch support for mobile
    document.addEventListener("touchstart", (event) => {
      event.preventDefault();
      const touch = event.touches[0];
      this.mouseX = (touch.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = -(touch.clientY / window.innerHeight) * 2 + 1;
      this.mousePressed = true;
      this.createExplosion();
    });

    document.addEventListener("touchmove", (event) => {
      event.preventDefault();
      const touch = event.touches[0];
      this.mouseX = (touch.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = -(touch.clientY / window.innerHeight) * 2 + 1;
      this.createRipple(touch.clientX, touch.clientY);
    });

    document.addEventListener("touchend", () => {
      this.mousePressed = false;
    });

    // Mouse wheel for time warp effects
    document.addEventListener("wheel", (event) => {
      event.preventDefault();
      this.timeWarp += event.deltaY * 0.001;
      this.timeWarp = Math.max(0.1, Math.min(5.0, this.timeWarp));
    });
  }

  addToMouseTrail(x: number, y: number) {
    const worldPos = new THREE.Vector3(
      (x / window.innerWidth) * 2 - 1,
      -(y / window.innerHeight) * 2 + 1,
      0,
    );
    worldPos.unproject(this.camera);

    this.mouseTrail.push(worldPos.clone());

    // Keep trail to manageable length
    if (this.mouseTrail.length > 20) {
      this.mouseTrail.shift();
    }

    // Create beautiful trail particles
    if (this.mouseTrail.length > 1) {
      this.createTrailParticles();
    }
  }

  createTrailParticles() {
    // Try to reuse a trail particle from the pool
    let trailPoints = this.trailParticlePool.pop();

    if (!trailPoints) {
      // Create new one if pool is empty
      const trailGeometry = new THREE.BufferGeometry();
      const trailMaterial = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
      });
      trailPoints = new THREE.Points(trailGeometry, trailMaterial);
    }

    // Update geometry with current trail data
    const positions = new Float32Array(this.mouseTrail.length * 3);
    const colors = new Float32Array(this.mouseTrail.length * 3);

    for (let i = 0; i < this.mouseTrail.length; i++) {
      const pos = this.mouseTrail[i];
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      // Fade from bright to dim along trail
      const alpha = i / this.mouseTrail.length;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.8 + alpha * 0.2;
      colors[i * 3 + 2] = 0.9 + alpha * 0.1;
    }

    trailPoints.geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3),
    );
    trailPoints.geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3),
    );

    this.scene.add(trailPoints);
    this.trailParticles.push(trailPoints);

    // Clean up old trails and recycle them
    if (this.trailParticles.length > 3) {
      // Reduced from 5 to 3
      const oldTrail = this.trailParticles.shift();
      if (oldTrail) {
        this.scene.remove(oldTrail);
        // Return to pool instead of disposing
        this.trailParticlePool.push(oldTrail);
      }
    }
  }

  createGravityWell(x: number, y: number) {
    const worldPos = new THREE.Vector3(
      (x / window.innerWidth) * 2 - 1,
      -(y / window.innerHeight) * 2 + 1,
      0,
    );
    worldPos.unproject(this.camera);

    this.gravityWells.push(worldPos);

    // Create visual indicator for corruption vortex
    const wellGeometry = new THREE.RingGeometry(15, 30, 8);
    const wellMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    const well = new THREE.Mesh(wellGeometry, wellMaterial);
    well.position.copy(worldPos);
    well.userData = {
      life: 200,
      maxLife: 200,
    };

    this.scene.add(well);

    // Keep only recent gravity wells
    if (this.gravityWells.length > 3) {
      this.gravityWells.shift();
    }
  }

  createRipple(x: number, y: number) {
    // Create ripple effect that affects particles based on mouse position
    const positions = this.particles.geometry.attributes.position
      .array as Float32Array;
    const mouseWorld = new THREE.Vector3(
      (x / window.innerWidth) * 2 - 1,
      -(y / window.innerHeight) * 2 + 1,
      0,
    );
    mouseWorld.unproject(this.camera);

    for (let i = 0; i < positions.length; i += 3) {
      const particlePos = new THREE.Vector3(
        positions[i],
        positions[i + 1],
        positions[i + 2],
      );
      const distance = particlePos.distanceTo(mouseWorld);

      if (distance < 100) {
        const force = (100 - distance) / 100;
        const direction = particlePos.clone().sub(mouseWorld).normalize();

        positions[i] += direction.x * force * 2;
        positions[i + 1] += direction.y * force * 2;
        positions[i + 2] += direction.z * force * 2;
      }
    }
  }

  createExplosion() {
    // VIOLENT CORRUPTION BURST - like Tetsuo losing control
    const positions = this.particles.geometry.attributes.position
      .array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      const force = Random.numberBetween(1.0, 4.0);
      const direction = new THREE.Vector3(
        Random.numberBetween(-1, 1),
        Random.numberBetween(-1, 1),
        Random.numberBetween(-1, 1),
      ).normalize();

      positions[i] += direction.x * force;
      positions[i + 1] += direction.y * force;
      positions[i + 2] += direction.z * force;
    }

    // Core goes berserk
    this.flowingSphere.scale.setScalar(2.0);
    this.screechLevel = 1.0;
    this.lastScreechTime = this.currentTime;

    // Wake up the evil eyes
    this.evilEyes.forEach((eye) => {
      eye.userData.watchIntensity = 1.0;
    });

    // Tentacles thrash violently
    this.corruptionTentacles.forEach((tentacle) => {
      tentacle.userData.corruptionLevel = 1.0;
    });

    // Create blood veins spreading outward
    this.createBloodVeins();
  }

  createBloodVeins() {
    // Create spreading corruption veins like infected arteries
    // Reduce number to prevent performance issues
    for (let i = 0; i < 4; i++) {
      // Reduced from 6 to 4
      // Try to reuse from pool first
      let vein = this.bloodVeinPool.pop();

      if (!vein) {
        // Create new one if pool is empty
        const points = [];
        const angle = (i / 4) * Math.PI * 2;
        const length = Random.numberBetween(100, 300);

        for (let j = 0; j <= 10; j++) {
          const t = j / 10;
          const distance = t * length;
          const corruption = Math.sin(t * Math.PI * 3) * 20;

          points.push(
            new THREE.Vector3(
              Math.cos(angle) * distance + corruption,
              Math.sin(angle) * distance + corruption,
              Random.numberBetween(-30, 30),
            ),
          );
        }

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
          color: 0xff0000,
          transparent: true,
          opacity: 0.8,
          linewidth: 3,
        });

        vein = new THREE.Line(geometry, material);
      }

      // Reset vein properties
      vein.userData = {
        life: 150,
        maxLife: 150,
      };

      this.bloodVeins.push(vein);
      this.scene.add(vein);
    }
  }

  triggerAutonomousRageBehaviorWhenIgnored() {
    if (this.rageBuildupLevel > 0.3 && Math.random() < 0.008) {
      // Reduced frequency
      // Spontaneous corruption burst
      this.createExplosion();
    }

    if (
      this.rageBuildupLevel > 0.5 &&
      Math.random() < 0.003 &&
      this.gravityWells.length < 2
    ) {
      // Limit gravity wells
      // Random gravity wells appear without user input
      const x = Random.numberBetween(100, window.innerWidth - 100);
      const y = Random.numberBetween(100, window.innerHeight - 100);
      this.createGravityWell(x, y);
    }

    if (
      this.rageBuildupLevel > 0.7 &&
      Math.random() < 0.001 &&
      !this.isHavingTantrum
    ) {
      // Prevent multiple tantrums
      // VIOLENT TANTRUM - everything goes berserk
      this.isHavingTantrum = true;
      this.screechLevel = 2.0;

      // Create fewer blood vein bursts to prevent overload
      if (this.bloodVeins.length < 20) {
        for (let i = 0; i < 2; i++) {
          setTimeout(() => this.createBloodVeins(), i * 300);
        }
      }

      // Wake up ALL the eyes at once
      this.evilEyes.forEach((eye) => {
        eye.userData.watchIntensity = 2.0;
      });

      // All tentacles go crazy
      this.corruptionTentacles.forEach((tentacle) => {
        tentacle.userData.corruptionLevel = 2.0;
      });

      // Fewer particle explosions
      for (let i = 0; i < 2; i++) {
        setTimeout(() => {
          const x = Random.numberBetween(0, window.innerWidth);
          const y = Random.numberBetween(0, window.innerHeight);
          this.createClickBurst(x, y);
        }, i * 200);
      }

      // Tantrum lasts for a while
      setTimeout(() => {
        this.isHavingTantrum = false;
      }, 2000);
    }
  }

  hungerForAttention() {
    // The longer you ignore it, the more it craves interaction
    if (this.rageBuildupLevel > 0.4) {
      // Eyes start desperately seeking the mouse
      this.evilEyes.forEach((eye) => {
        if (Math.random() < 0.1) {
          // Occasionally look in random directions like searching
          const searchAngle = Random.numberBetween(0, Math.PI * 2);
          const searchDistance = 200;
          const searchTarget = new THREE.Vector3(
            Math.cos(searchAngle) * searchDistance,
            Math.sin(searchAngle) * searchDistance,
            0,
          );
          eye.lookAt(searchTarget);
        }
      });
    }

    if (this.rageBuildupLevel > 0.6) {
      // Tentacles start reaching out randomly
      this.corruptionTentacles.forEach((tentacle, index) => {
        tentacle.userData.writheSpeed =
          0.02 + index * 0.005 + this.rageBuildupLevel * 0.03;
      });
    }
  }

  createClickBurst(x: number, y: number) {
    // Add new temporary particles at click location
    const burstCount = 50;
    const burstGeometry = new THREE.BufferGeometry();
    const burstPositions = new Float32Array(burstCount * 3);
    const burstColors = new Float32Array(burstCount * 3);

    const clickWorld = new THREE.Vector3(
      (x / window.innerWidth) * 2 - 1,
      -(y / window.innerHeight) * 2 + 1,
      0,
    );
    clickWorld.unproject(this.camera);

    for (let i = 0; i < burstCount; i++) {
      const angle = (i / burstCount) * Math.PI * 2;
      const radius = Random.numberBetween(5, 30);

      burstPositions[i * 3] = clickWorld.x + Math.cos(angle) * radius;
      burstPositions[i * 3 + 1] = clickWorld.y + Math.sin(angle) * radius;
      burstPositions[i * 3 + 2] = clickWorld.z;

      burstColors[i * 3] = 1;
      burstColors[i * 3 + 1] = 1;
      burstColors[i * 3 + 2] = 1;
    }

    burstGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(burstPositions, 3),
    );
    burstGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(burstColors, 3),
    );

    const burstMaterial = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    const burstPoints = new THREE.Points(burstGeometry, burstMaterial);
    this.scene.add(burstPoints);

    // Animate and remove the burst
    let burstTime = 0;
    const animateBurst = () => {
      burstTime += 0.1;
      if (burstTime > 2) {
        this.scene.remove(burstPoints);
        return;
      }

      burstMaterial.opacity = 1 - burstTime / 2;
      burstMaterial.size = 3 + burstTime * 2;
      requestAnimationFrame(animateBurst);
    };
    animateBurst();
  }

  handleKeyPress(key: string) {
    switch (key.toLowerCase()) {
      case " ": // Spacebar - reset everything
        this.resetScene();
        break;
      case "r": // R - randomize colors
        this.randomizeColors();
        break;
      case "w": // W - toggle wireframe
        this.toggleWireframe();
        break;
      case "f": // F - speed up time
        this.currentTime += 100;
        break;
    }
  }

  resetScene() {
    // Reset all particles to original positions
    const positions = this.particles.geometry.attributes.position
      .array as Float32Array;

    for (let i = 0; i < positions.length / 3; i++) {
      const radius = Random.numberBetween(60, 300);
      const theta = Random.numberBetween(0, Math.PI * 2);
      const phi = Random.numberBetween(0, Math.PI);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }

    this.flowingSphere.scale.setScalar(1);
  }

  randomizeColors() {
    const colors = this.particles.geometry.attributes.color
      .array as Float32Array;

    for (let i = 0; i < colors.length; i += 3) {
      colors[i] = Math.random();
      colors[i + 1] = Math.random();
      colors[i + 2] = Math.random();
    }

    this.particles.geometry.attributes.color.needsUpdate = true;
  }

  toggleWireframe() {
    const material = this.flowingSphere.material as THREE.MeshBasicMaterial;
    material.wireframe = !material.wireframe;
  }

  updateParticles() {
    const positions = this.particles.geometry.attributes.position
      .array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      // Gentle orbital motion influenced by time warp
      const radius = Math.sqrt(x * x + y * y + z * z);
      let angle = Math.atan2(y, x) + 0.003 * this.timeWarp;

      // Mouse attraction/repulsion
      const mouseDistance = Math.sqrt(
        Math.pow(x - this.targetX * 100, 2) +
          Math.pow(y - this.targetY * 100, 2),
      );

      if (mouseDistance < 150) {
        const force = (150 - mouseDistance) / 150;
        if (this.mousePressed) {
          // Repel when mouse is pressed
          angle += force * 0.1;
        } else {
          // Attract when mouse is just hovering
          angle -= force * 0.05;
        }
      }

      // Gravity wells influence
      this.gravityWells.forEach((well) => {
        const wellDistance = Math.sqrt(
          Math.pow(x - well.x, 2) +
            Math.pow(y - well.y, 2) +
            Math.pow(z - well.z, 2),
        );

        if (wellDistance < 100) {
          const gravityForce = (100 - wellDistance) / 100;
          const direction = Math.atan2(well.y - y, well.x - x);

          positions[i] += Math.cos(direction) * gravityForce * 0.5;
          positions[i + 1] += Math.sin(direction) * gravityForce * 0.5;
          positions[i + 2] += (well.z - z) * gravityForce * 0.1;
        }
      });

      // Apply final positions with temporal waves
      positions[i] = Math.cos(angle) * radius;
      positions[i + 1] = Math.sin(angle) * radius;
      positions[i + 2] =
        z + Math.sin(this.currentTime * 0.005 + i * 0.01) * 0.3;
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  updateFlowingSphere() {
    // Smooth morphing effect on the sphere
    const geometry = this.flowingSphere.geometry as THREE.SphereGeometry;
    const positionAttribute = geometry.attributes.position;

    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);
      const z = positionAttribute.getZ(i);

      const radius = Math.sqrt(x * x + y * y + z * z);
      const wave = Math.sin(this.currentTime * 0.01 + radius * 0.1) * 3;

      positionAttribute.setX(i, x + (x / radius) * wave);
      positionAttribute.setY(i, y + (y / radius) * wave);
      positionAttribute.setZ(i, z + (z / radius) * wave);
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  render() {
    const currentTime = performance.now();

    // Initialize lastFrameTime on first frame
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = currentTime;
    }

    this.deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    this.frameCount++;

    // Adaptive time multiplier for consistent animation speed
    const timeMultiplier = Math.min(this.deltaTime / 16.67, 2.0); // Cap at 2x for extreme frame drops
    this.currentTime += this.timeWarp * timeMultiplier;

    // Gradually decay energy over time (frame-rate independent)
    this.energyLevel *= Math.pow(0.99, timeMultiplier);

    // Decay screech effect (frame-rate independent)
    this.screechLevel *= Math.pow(0.95, timeMultiplier);

    // Track idle time and build up rage when ignored
    this.idleTime = this.currentTime - this.lastInteractionTime;

    // Rage builds up exponentially the longer you ignore it
    if (this.idleTime > 300) {
      // After 5 seconds of no interaction
      this.rageBuildupLevel = Math.min((this.idleTime - 300) / 1200, 1.0); // Maxes out after 20 seconds
    } else {
      this.rageBuildupLevel *= Math.pow(0.98, timeMultiplier); // Quickly decay rage when interacting
    }

    const RAGE_THRESHOLD_FOR_AUTONOMOUS_BEHAVIOR = 0.1;
    if (this.rageBuildupLevel > RAGE_THRESHOLD_FOR_AUTONOMOUS_BEHAVIOR) {
      this.triggerAutonomousRageBehaviorWhenIgnored();
      this.hungerForAttention();
    }

    const AUDIO_UPDATE_FREQUENCY_FRAMES = 4;
    const shouldUpdateAudioThisFrame =
      this.frameCount % AUDIO_UPDATE_FREQUENCY_FRAMES === 0;
    const hasValidAudioSetup = this.analyser && this.audioDataArray.length > 0;

    if (shouldUpdateAudioThisFrame && hasValidAudioSetup) {
      // @ts-expect-error - Audio buffer type compatibility issue
      this.analyser.getByteFrequencyData(this.audioDataArray);
      let sum = 0;
      for (const value of this.audioDataArray) {
        sum += value;
      }
      this.audioLevel = sum / this.audioDataArray.length / 255;
    }

    // Combine energy sources including RAGE!
    const totalEnergy =
      this.energyLevel + this.audioLevel * 0.5 + this.rageBuildupLevel * 0.8;

    // Smooth mouse interaction with adaptive responsiveness
    const responsiveness = this.mouseResponsiveness * timeMultiplier;
    this.targetX += (this.mouseX - this.targetX) * responsiveness;
    this.targetY += (this.mouseY - this.targetY) * responsiveness;

    // Animate the malevolent core with sinister energy
    let sphereSpeedX = 0.01 + totalEnergy * 0.05;
    let sphereSpeedY = 0.015 + totalEnergy * 0.08;

    if (this.mousePressed) {
      sphereSpeedX *= 4;
      sphereSpeedY *= 4;
    }

    this.flowingSphere.rotation.x += sphereSpeedX * this.timeWarp;
    this.flowingSphere.rotation.y += sphereSpeedY * this.timeWarp;
    this.flowingSphere.rotation.z += 0.008 * this.timeWarp;

    // Evil pulsating core effect - gets MORE violent when rageful
    const ragePulse = this.isHavingTantrum
      ? Math.sin(this.currentTime * 0.2) * 0.5
      : 0;
    const evilPulse =
      1 +
      Math.sin(this.currentTime * (0.05 + this.rageBuildupLevel * 0.1)) *
        (0.3 + this.rageBuildupLevel * 0.4) +
      totalEnergy * 0.5 +
      ragePulse;
    this.flowingSphere.scale.setScalar(evilPulse);

    // Corrupt the color based on energy AND RAGE
    const coreMaterial = this.flowingSphere
      .material as THREE.MeshStandardMaterial;
    const corruption = Math.min(totalEnergy * 2, 1);
    const rageIntensity = this.rageBuildupLevel;

    // Gets redder and more intense with rage
    coreMaterial.color.setRGB(
      1,
      Math.max(0, 0.2 - corruption * 0.2 - rageIntensity * 0.2),
      Math.max(0, 0.2 - corruption * 0.2 - rageIntensity * 0.3),
    );

    // Core emits more evil energy when enraged
    if (this.rageBuildupLevel > 0.5) {
      coreMaterial.emissive = new THREE.Color(0x440000);
      coreMaterial.emissiveIntensity = this.rageBuildupLevel;
    } else {
      coreMaterial.emissiveIntensity = 0;
    }

    // Make inner components pulse wickedly
    this.flowingSphere.children.forEach((child, index) => {
      child.rotation.x += (0.02 + index * 0.01) * this.timeWarp;
      child.rotation.y -= (0.025 + index * 0.008) * this.timeWarp;

      const childMesh = child as THREE.Mesh;
      const childMaterial = childMesh.material as THREE.MeshBasicMaterial;
      if (index === 0) {
        // Inner core - darker and more intense
        childMaterial.opacity = 0.9 + Math.sin(this.currentTime * 0.1) * 0.1;
      } else {
        // Energy shell - crackling effect
        childMaterial.opacity =
          0.3 +
          Math.sin(this.currentTime * 0.08 + index) * 0.2 +
          totalEnergy * 0.4;
      }
    });

    // Update sphere morphing with mouse influence
    this.updateFlowingSphere();

    // Update particle system
    this.updateParticles();

    // Animate corruption rings with malevolent energy
    this.beautyRings.children.forEach((ring, index) => {
      const ringMesh = ring as THREE.Mesh;
      const userData = ring.userData as RingUserData;
      let speed = userData.speed * this.timeWarp;

      if (this.mousePressed) {
        speed *= 6; // Chaotic acceleration when disturbed
      }

      // Irregular, unsettling rotation
      ring.rotation.z = userData.originalRotationZ + this.currentTime * speed;
      ring.rotation.x += 0.002 * this.timeWarp * (index % 2 === 0 ? 1 : -1);
      ring.rotation.y +=
        0.003 *
        this.timeWarp *
        Math.sin(this.currentTime * 0.01 + userData.corruptionPhase);

      // Evil corruption breathing effect
      const mouseInfluence = Math.abs(this.targetX) + Math.abs(this.targetY);
      const corruptionPulse =
        1 +
        Math.sin(this.currentTime * 0.02 + userData.corruptionPhase) *
          (0.15 + mouseInfluence * 0.2 + totalEnergy * 0.4);
      ring.scale.setScalar(corruptionPulse);

      // Dynamic evil coloring
      const material = ringMesh.material as THREE.MeshBasicMaterial;
      const corruptionIntensity =
        0.3 + mouseInfluence * 0.4 + this.audioLevel * 0.6 + totalEnergy * 0.5;
      material.opacity = Math.min(corruptionIntensity, 0.8);

      // Shift between different shades of evil
      const evilHue = Math.sin(this.currentTime * 0.005 + index) * 0.5 + 0.5;
      if (evilHue > 0.7) {
        material.color.setRGB(1, 0, 0.2); // Bright blood red
      } else if (evilHue > 0.4) {
        material.color.setRGB(0.8, 0, 0.4); // Dark crimson
      } else {
        material.color.setRGB(0.6, 0, 0.1); // Deep maroon
      }
    });

    // Update quantum field visibility based on energy
    this.scene.children.forEach((child) => {
      if (
        child.userData &&
        (child.userData as QuantumFieldUserData).energyResponse
      ) {
        const childMesh = child as THREE.Mesh;
        const userData = child.userData as QuantumFieldUserData;
        const material = childMesh.material as THREE.MeshBasicMaterial;
        material.opacity = totalEnergy * userData.energyResponse;

        const scale =
          1 +
          totalEnergy * 0.5 +
          Math.sin(this.currentTime * 0.01 + userData.phase) * 0.1;
        child.scale.setScalar(scale);
      }

      // Update gravity well visuals
      if (child.userData && child.userData.life !== undefined) {
        child.userData.life--;
        const lifeRatio = child.userData.life / child.userData.maxLife;
        const childMesh = child as THREE.Mesh;
        const material = childMesh.material as THREE.MeshBasicMaterial;
        material.opacity = lifeRatio * 0.7;
        child.scale.setScalar(2 - lifeRatio);

        if (child.userData.life <= 0) {
          this.scene.remove(child);
        }
      }
    });

    // Animate corruption tentacles with PURE CHAOS
    this.corruptionTentacles.forEach((tentacle, index) => {
      const userData = tentacle.userData as TentacleUserData;

      // INSANE multi-axis writhing motion
      tentacle.rotation.z +=
        userData.writheSpeed * this.timeWarp * userData.thrashIntensity;
      tentacle.rotation.x +=
        0.02 *
        Math.sin(this.currentTime * 0.03 + userData.chaosPhase) *
        userData.thrashIntensity;
      tentacle.rotation.y +=
        0.015 *
        Math.cos(this.currentTime * 0.025 + index) *
        userData.thrashIntensity;

      // Corruption pulsing with more violence
      userData.corruptionLevel *= 0.97;
      const corruption =
        userData.corruptionLevel +
        totalEnergy * 0.7 +
        this.rageBuildupLevel * 0.8;

      // Dynamic morphing of the tentacle shape! (Throttled for performance)
      this.tentacleMorphFrame++;
      if (
        this.tentacleMorphFrame % 8 === 0 &&
        Math.random() < 0.3 &&
        corruption > 0.3
      ) {
        // Randomly deform the tentacle geometry (less frequently, more dramatically)
        const geometry = tentacle.geometry as THREE.TubeGeometry;
        const positionAttribute = geometry.attributes.position;

        // Only morph a subset of vertices for better performance
        const stepSize = Math.max(1, Math.floor(positionAttribute.count / 20));
        for (let i = 0; i < positionAttribute.count; i += stepSize) {
          const chaos = (Math.random() - 0.5) * corruption * 15;
          const x = positionAttribute.getX(i);
          const y = positionAttribute.getY(i);
          const z = positionAttribute.getZ(i);

          positionAttribute.setX(i, x + chaos);
          positionAttribute.setY(i, y + chaos);
          positionAttribute.setZ(i, z + chaos * 0.5);
        }
        positionAttribute.needsUpdate = true;
      }

      const material = tentacle.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 + corruption * 0.7;

      // More dynamic evil coloring
      if (corruption > 0.8) {
        material.color.setRGB(1, 0.2, 0); // Bright blood red when very corrupt
      } else if (corruption > 0.5) {
        material.color.setRGB(0.8, 0, 0.2); // Deep crimson
      } else {
        material.color.setRGB(0.4 + corruption * 0.4, 0, corruption * 0.3); // Dark red
      }

      // VIOLENT scaling and position chaos
      const violentScale =
        1 +
        corruption * 0.5 +
        Math.sin(this.currentTime * 0.1 + userData.chaosPhase) *
          corruption *
          0.3;
      tentacle.scale.setScalar(violentScale);

      // Tentacles lash out randomly when highly corrupted
      if (corruption > 0.6) {
        tentacle.position.x =
          Math.sin(
            this.currentTime * userData.writheSpeed + userData.chaosPhase,
          ) *
          corruption *
          20;
        tentacle.position.y =
          Math.cos(
            this.currentTime * userData.writheSpeed * 1.3 + userData.chaosPhase,
          ) *
          corruption *
          20;
        tentacle.position.z =
          Math.sin(
            this.currentTime * userData.writheSpeed * 0.7 + userData.chaosPhase,
          ) *
          corruption *
          15;
      } else {
        // Return to center when calmer
        tentacle.position.x *= 0.95;
        tentacle.position.y *= 0.95;
        tentacle.position.z *= 0.95;
      }

      // Reaching toward mouse when seeking attention
      if (this.rageBuildupLevel > 0.4 && Math.random() < 0.02) {
        const reachDirection = new THREE.Vector3(
          this.targetX * 100,
          this.targetY * 100,
          0,
        );
        reachDirection.normalize();
        tentacle.position.add(
          reachDirection.multiplyScalar(this.rageBuildupLevel * 10),
        );
      }
    });

    // Animate evil eyes
    this.evilEyes.forEach((eye) => {
      const userData = eye.userData as EyeUserData;

      // Eyes track the mouse like they're watching
      const lookDirection = new THREE.Vector3(
        this.targetX * 100,
        this.targetY * 100,
        0,
      );
      eye.lookAt(lookDirection);

      // Blinking effect
      const timeSinceLastBlink = this.currentTime - userData.lastBlink;
      if (timeSinceLastBlink > Random.numberBetween(100, 300)) {
        userData.lastBlink = this.currentTime;
      }

      const blinkCycle = Math.min(timeSinceLastBlink / 20, 1);
      const blink = blinkCycle < 0.1 ? 0 : 1;

      // Watch intensity fades over time
      userData.watchIntensity *= 0.995;

      const intensity =
        userData.watchIntensity + totalEnergy * 0.3 + this.screechLevel * 0.5;
      const material = eye.material as THREE.MeshStandardMaterial;
      material.opacity = intensity * blink;
      material.emissiveIntensity = intensity * 2;

      // Eyes glow brighter when evil is stronger
      if (intensity > 0.7) {
        material.color.setRGB(1, 0.2, 0);
      } else if (intensity > 0.4) {
        material.color.setRGB(1, 0, 0);
      } else {
        material.color.setRGB(0.6, 0, 0);
      }
    });

    // Update blood veins with proper cleanup and pooling
    this.bloodVeins = this.bloodVeins.filter((vein) => {
      vein.userData.life--;
      const lifeRatio = vein.userData.life / vein.userData.maxLife;

      const material = vein.material as THREE.LineBasicMaterial;
      material.opacity = lifeRatio * 0.8;

      if (vein.userData.life <= 0) {
        this.scene.remove(vein);
        // Return to pool instead of disposing
        this.bloodVeinPool.push(vein);
        return false;
      }
      return true;
    });

    // Emergency cleanup if too many objects
    if (this.bloodVeins.length > 30) {
      const toRemove = this.bloodVeins.splice(0, 10);
      toRemove.forEach((vein) => {
        this.scene.remove(vein);
        vein.geometry.dispose();
        (vein.material as THREE.Material).dispose();
      });
    }

    // Dynamic camera movement with enhanced mouse interaction
    const cameraRadius = 50 + Math.abs(this.targetX) * 100;
    this.camera.position.x =
      Math.sin(this.currentTime * 0.001) * 20 + this.targetX * cameraRadius;
    this.camera.position.y =
      Math.cos(this.currentTime * 0.0015) * 15 + this.targetY * 50;
    this.camera.position.z = 200 + this.targetY * 100;

    // Look at target influenced by mouse
    const lookAtTarget = new THREE.Vector3(
      this.targetX * 50,
      this.targetY * 50,
      0,
    );
    this.camera.lookAt(lookAtTarget);

    // Render the scene
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.render());
  }
}

new Void();
