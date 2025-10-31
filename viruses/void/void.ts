import "./void.scss";
import * as THREE from "three";
import Random from "../../utils/random";

const CONSTANTS = {
  CORE_RADIUS: 35,
  CORE_DETAIL_LEVEL: 3,
  INNER_CORE_RADIUS: 25,
  INNER_CORE_DETAIL: 32,
  ENERGY_SHELL_RADIUS: 45,
  ENERGY_SHELL_DETAIL: 2,

  CHAOTIC_PARTICLE_COUNT: 1200,
  SPAWN_RADIUS_MIN: 50,
  SPAWN_RADIUS_MAX: 400,
  PARTICLE_SIZE: 2,

  DEEP_RED_EVIL_ENERGY: 0xff0033,
  DARK_CRIMSON: 0x330000,
  BRIGHT_EVIL_RED: 0xff3366,

  CORRUPTION_RING_COUNT: 5,
  CORRUPTION_FIELD_COUNT: 7,

  MOUSE_TRAIL_MAX_LENGTH: 20,
  MAX_TRAIL_PARTICLES: 3,
  MAX_BLOOD_VEINS: 30,
  MAX_GRAVITY_WELLS: 3,

  RAGE_THRESHOLD_FOR_AUTONOMOUS_BEHAVIOR: 0.1,
  INTERACTION_TIMEOUT: 300,
  RAGE_BUILDUP_DURATION: 1200,

  TENTACLE_MORPH_THROTTLE: 8,
  BLOOD_VEIN_BURST_COUNT: 4,
  BURST_PARTICLE_COUNT: 50,
};

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
  trailParticles: THREE.Points[] = [];
  trailParticlePool: THREE.Points[] = [];
  mouseTrail: THREE.Vector3[] = [];
  gravityWells: THREE.Vector3[] = [];
  timeWarp = 1.0;
  energyLevel = 0;
  lastMousePos = new THREE.Vector2();
  mouseVelocity = new THREE.Vector2();
  mouseResponsiveness = 0.15;
  corruptionTentacles: THREE.Mesh[] = [];
  evilEyes: THREE.Mesh[] = [];
  bloodVeins: THREE.Line[] = [];
  bloodVeinPool: THREE.Line[] = [];
  screechLevel = 0;
  lastScreechTime = 0;
  idleTime = 0;
  lastInteractionTime = 0;
  rageBuildupLevel = 0;
  calmLevel = 0;
  contentmentLevel = 0;
  lastCalmingTime = 0;
  autonomousEvents: number[] = [];
  isHavingTantrum = false;
  tentacleMorphFrame = 0;
  frameCount = 0;

  constructor() {
    try {
      this.setRenderOptions();
      this.scene = new THREE.Scene();

      this.createMalevolentPulsatingCore();
      this.createChaoticEvilParticleStorm();
      this.createCorruptedEnergyRings();
      this.createCorruptionTentacles();
      this.createEvilEyes();
      this.setupResponsiveUserInteraction();

      const container = document.getElementById("container");
      if (!container) {
        throw new Error("Container element not found");
      }
      container.appendChild(this.renderer.domElement);

      window.addEventListener("resize", () => this.setRenderOptions(), false);
      window.addEventListener("beforeunload", () => this.dispose());

      this.render();
    } catch (error) {
      console.error("Failed to initialize Void:", error);
      throw error;
    }
  }

  dispose() {
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        if (object.geometry && "dispose" in object.geometry) {
          (object.geometry as THREE.BufferGeometry).dispose();
        }
        if (Array.isArray(object.material)) {
          object.material.forEach((material: THREE.Material) => {
            if (
              material &&
              "dispose" in material &&
              typeof material.dispose === "function"
            ) {
              material.dispose();
            }
          });
        } else if (object.material && "dispose" in object.material) {
          (object.material as THREE.Material).dispose();
        }
      }
    });

    this.renderer.dispose();
  }

  setRenderOptions() {
    this.WIDTH = window.innerWidth;
    this.HEIGHT = window.innerHeight;

    if (!this.renderer) {
      try {
        this.renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        });

        const gl = this.renderer.getContext();
        if (!gl) {
          throw new Error("WebGL context not available");
        }

        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 1);
      } catch (error) {
        console.error("Failed to initialize WebGL renderer:", error);
        throw new Error("WebGL not supported or failed to initialize");
      }
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
    const coreGeometry = new THREE.IcosahedronGeometry(
      CONSTANTS.CORE_RADIUS,
      CONSTANTS.CORE_DETAIL_LEVEL,
    );
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: CONSTANTS.DEEP_RED_EVIL_ENERGY,
      transparent: true,
      opacity: 0.8,
      wireframe: false,
    });

    this.flowingSphere = new THREE.Mesh(coreGeometry, coreMaterial);

    const innerCoreGeometry = new THREE.SphereGeometry(
      CONSTANTS.INNER_CORE_RADIUS,
      CONSTANTS.INNER_CORE_DETAIL,
      CONSTANTS.INNER_CORE_DETAIL,
    );
    const innerCoreMaterial = new THREE.MeshBasicMaterial({
      color: CONSTANTS.DARK_CRIMSON,
      transparent: true,
      opacity: 0.9,
      wireframe: true,
    });
    const innerDarkCore = new THREE.Mesh(innerCoreGeometry, innerCoreMaterial);
    this.flowingSphere.add(innerDarkCore);

    const energyShellGeometry = new THREE.IcosahedronGeometry(
      CONSTANTS.ENERGY_SHELL_RADIUS,
      CONSTANTS.ENERGY_SHELL_DETAIL,
    );
    const energyShellMaterial = new THREE.MeshBasicMaterial({
      color: CONSTANTS.BRIGHT_EVIL_RED,
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
    const COLOR_VARIANT_COUNT = 3;
    const DEEP_RED_CORRUPTION_THRESHOLD = 1;
    const DARK_PURPLE_MALEVOLENCE_THRESHOLD = 2;

    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(
      CONSTANTS.CHAOTIC_PARTICLE_COUNT * 3,
    );
    const particleColors = new Float32Array(
      CONSTANTS.CHAOTIC_PARTICLE_COUNT * 3,
    );

    for (let i = 0; i < CONSTANTS.CHAOTIC_PARTICLE_COUNT; i++) {
      const spawnRadius = Random.numberBetween(
        CONSTANTS.SPAWN_RADIUS_MIN,
        CONSTANTS.SPAWN_RADIUS_MAX,
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

    const particleMaterial = new THREE.PointsMaterial({
      size: CONSTANTS.PARTICLE_SIZE,
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

    for (let i = 0; i < CONSTANTS.CORRUPTION_RING_COUNT; i++) {
      const ringGeometry = new THREE.RingGeometry(
        70 + i * 25,
        75 + i * 25,
        6 + i * 2,
      );
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xff0000 : 0x880022,
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

    for (let i = 0; i < CONSTANTS.CORRUPTION_FIELD_COUNT; i++) {
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

  createCorruptionTentacles() {
    for (let i = 0; i < 12; i++) {
      const points = [];
      const segments = 30;

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const angle = (i / 12) * Math.PI * 2;
        const radius = 30 + t * 150;

        const wobble1 = Math.sin(t * Math.PI * 6) * 15;
        const wobble2 = Math.cos(t * Math.PI * 8 + i) * 12;
        const wobble3 = Math.sin(t * Math.PI * 10 + i * 2) * 8;
        const totalWobble = wobble1 + wobble2 + wobble3;

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
        Random.numberBetween(1, 4),
        Random.numberBetween(6, 12),
        false,
      );

      const material = new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0x440000 : 0x660000,
        transparent: true,
        opacity: Random.numberBetween(0.4, 0.8),
        wireframe: Random.bool(),
      });

      const tentacle = new THREE.Mesh(geometry, material);
      tentacle.userData = {
        baseAngle: (i / 12) * Math.PI * 2,
        writheSpeed: Random.numberBetween(0.01, 0.05),
        corruptionLevel: 0,
        chaosPhase: Random.numberBetween(0, Math.PI * 2),
        thrashIntensity: Random.numberBetween(0.5, 2.0),
        originalPoints: points.map((p) => p.clone()),
      } as TentacleUserData;

      this.corruptionTentacles.push(tentacle);
      this.scene.add(tentacle);
    }
  }

  createEvilEyes() {
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

  setupResponsiveUserInteraction() {
    document.addEventListener("mousemove", (event) => {
      const currentMousePos = new THREE.Vector2(event.clientX, event.clientY);
      this.mouseVelocity.subVectors(currentMousePos, this.lastMousePos);
      this.lastMousePos.copy(currentMousePos);

      this.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

      const velocity = this.mouseVelocity.length();
      this.mouseResponsiveness = Math.min(0.15 + velocity * 0.0005, 0.4);

      this.energyLevel = Math.min(this.energyLevel + velocity * 0.001, 1.0);

      this.addToMouseTrail(event.clientX, event.clientY);

      this.lastInteractionTime = this.currentTime;
      this.idleTime = 0;

      this.createRipple(event.clientX, event.clientY);
    });

    document.addEventListener("mousedown", () => {
      this.mousePressed = true;
      this.lastInteractionTime = this.currentTime;
      this.idleTime = 0;
      this.createExplosion();
      this.provideCalmingAttention();
    });

    document.addEventListener("mouseup", () => {
      this.mousePressed = false;
    });

    document.addEventListener("click", (event) => {
      this.lastClickTime = this.currentTime;
      this.createClickBurst(event.clientX, event.clientY);
      this.createGravityWell(event.clientX, event.clientY);
      this.provideCalmingAttention();
    });

    document.addEventListener("dblclick", (event) => {
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
      this.createClickBurst(event.clientX, event.clientY);
    });

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

    if (this.mouseTrail.length > CONSTANTS.MOUSE_TRAIL_MAX_LENGTH) {
      this.mouseTrail.shift();
    }

    if (this.mouseTrail.length > 1) {
      let trailPoints = this.trailParticlePool.pop();
      if (!trailPoints) {
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

      const positions = new Float32Array(this.mouseTrail.length * 3);
      const colors = new Float32Array(this.mouseTrail.length * 3);
      for (let i = 0; i < this.mouseTrail.length; i++) {
        const pos = this.mouseTrail[i];
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
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

      if (this.trailParticles.length > CONSTANTS.MAX_TRAIL_PARTICLES) {
        const oldTrail = this.trailParticles.shift();
        if (oldTrail) {
          this.scene.remove(oldTrail);
          this.trailParticlePool.push(oldTrail);
        }
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

    if (this.gravityWells.length > CONSTANTS.MAX_GRAVITY_WELLS) {
      this.gravityWells.shift();
    }
  }

  createRipple(x: number, y: number) {
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

    this.flowingSphere.scale.setScalar(2.0);
    this.screechLevel = 1.0;
    this.lastScreechTime = this.currentTime;

    this.evilEyes.forEach((eye) => {
      eye.userData.watchIntensity = 1.0;
    });

    this.corruptionTentacles.forEach((tentacle) => {
      tentacle.userData.corruptionLevel = 1.0;
    });
  }

  provideCalmingAttention() {
    this.lastCalmingTime = this.currentTime;

    this.rageBuildupLevel *= 0.3;
    this.calmLevel = Math.min(this.calmLevel + 0.4, 1.0);

    if (this.isHavingTantrum) {
      this.isHavingTantrum = false;
      this.autonomousEvents.forEach((eventId) => clearTimeout(eventId));
      this.autonomousEvents = [];
    }

    this.contentmentLevel = Math.min(this.contentmentLevel + 0.3, 1.0);

    this.evilEyes.forEach((eye) => {
      const userData = eye.userData as EyeUserData;
      userData.watchIntensity *= 0.2;
      userData.lastBlink = this.currentTime;
    });

    this.corruptionTentacles.forEach((tentacle) => {
      const userData = tentacle.userData as TentacleUserData;
      userData.writheSpeed *= 0.5;
      userData.thrashIntensity *= 0.4;
      userData.corruptionLevel *= 0.6;
    });
  }

  createClickBurst(x: number, y: number) {
    const burstCount = CONSTANTS.BURST_PARTICLE_COUNT;
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
      case " ": {
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
        break;
      }
      case "r": {
        const colors = this.particles.geometry.attributes.color
          .array as Float32Array;
        for (let i = 0; i < colors.length; i += 3) {
          colors[i] = Math.random();
          colors[i + 1] = Math.random();
          colors[i + 2] = Math.random();
        }
        this.particles.geometry.attributes.color.needsUpdate = true;
        break;
      }
      case "w": {
        const material = this.flowingSphere.material as THREE.MeshBasicMaterial;
        material.wireframe = !material.wireframe;
        break;
      }
      case "f":
        this.currentTime += 100;
        break;
    }
  }

  updateParticles() {
    const positions = this.particles.geometry.attributes.position
      .array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      const radius = Math.sqrt(x * x + y * y + z * z);
      let angle = Math.atan2(y, x) + 0.003 * this.timeWarp;

      const mouseDistance = Math.sqrt(
        Math.pow(x - this.targetX * 100, 2) +
          Math.pow(y - this.targetY * 100, 2),
      );

      if (mouseDistance < 150) {
        const force = (150 - mouseDistance) / 150;
        if (this.mousePressed) {
          angle += force * 0.1;
        } else {
          angle -= force * 0.05;
        }
      }

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

      positions[i] = Math.cos(angle) * radius;
      positions[i + 1] = Math.sin(angle) * radius;
      positions[i + 2] =
        z + Math.sin(this.currentTime * 0.005 + i * 0.01) * 0.3;
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  updateBehavioralStates(timeMultiplier: number) {
    this.energyLevel *= Math.pow(0.99, timeMultiplier);

    this.screechLevel *= Math.pow(0.95, timeMultiplier);

    this.idleTime = this.currentTime - this.lastInteractionTime;

    if (this.idleTime > CONSTANTS.INTERACTION_TIMEOUT) {
      this.rageBuildupLevel = Math.min(
        (this.idleTime - CONSTANTS.INTERACTION_TIMEOUT) /
          CONSTANTS.RAGE_BUILDUP_DURATION,
        1.0,
      );
    } else {
      this.rageBuildupLevel *= Math.pow(0.98, timeMultiplier);
    }

    this.calmLevel *= Math.pow(0.996, timeMultiplier);
    this.contentmentLevel *= Math.pow(0.994, timeMultiplier);

    if (
      this.rageBuildupLevel > CONSTANTS.RAGE_THRESHOLD_FOR_AUTONOMOUS_BEHAVIOR
    ) {
      if (this.rageBuildupLevel > 0.3 && Math.random() < 0.008) {
        this.createExplosion();
      }

      if (
        this.rageBuildupLevel > 0.5 &&
        Math.random() < 0.003 &&
        this.gravityWells.length < 2
      ) {
        const x = Random.numberBetween(100, window.innerWidth - 100);
        const y = Random.numberBetween(100, window.innerHeight - 100);
        this.createGravityWell(x, y);
      }

      if (
        this.rageBuildupLevel > 0.7 &&
        Math.random() < 0.001 &&
        !this.isHavingTantrum
      ) {
        this.isHavingTantrum = true;
        this.screechLevel = 2.0;

        this.evilEyes.forEach((eye) => {
          eye.userData.watchIntensity = 2.0;
        });

        this.corruptionTentacles.forEach((tentacle) => {
          tentacle.userData.corruptionLevel = 2.0;
        });

        for (let i = 0; i < 2; i++) {
          setTimeout(() => {
            const x = Random.numberBetween(0, window.innerWidth);
            const y = Random.numberBetween(0, window.innerHeight);
            this.createClickBurst(x, y);
          }, i * 200);
        }

        setTimeout(() => {
          this.isHavingTantrum = false;
        }, 2000);
      }
    }
  }

  updateFlowingSphere() {
    const geometry = this.flowingSphere.geometry as THREE.SphereGeometry;
    const positionAttribute = geometry.attributes.position;

    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);
      const z = positionAttribute.getZ(i);

      const radius = Math.sqrt(x * x + y * y + z * z);
      const normalizedRadius = radius / 35;

      const baseWave = Math.sin(this.currentTime * 0.01 + radius * 0.1) * 3;
      const timeWave =
        Math.sin(this.currentTime * 0.005 + normalizedRadius * Math.PI) * 5;
      const finalWave = baseWave + timeWave;

      positionAttribute.setX(i, x + (x / radius) * finalWave);
      positionAttribute.setY(i, y + (y / radius) * finalWave);
      positionAttribute.setZ(i, z + (z / radius) * finalWave);
    }

    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  render() {
    const currentTime = performance.now();

    if (this.lastFrameTime === 0) {
      this.lastFrameTime = currentTime;
    }

    this.deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    this.frameCount++;

    const timeMultiplier = Math.min(this.deltaTime / 16.67, 2.0);
    this.currentTime += this.timeWarp * timeMultiplier;

    this.updateBehavioralStates(timeMultiplier);

    const totalEnergy = this.energyLevel + this.rageBuildupLevel * 0.8;

    const responsiveness = this.mouseResponsiveness * timeMultiplier;
    this.targetX += (this.mouseX - this.targetX) * responsiveness;
    this.targetY += (this.mouseY - this.targetY) * responsiveness;

    const calmingFactor =
      1 - this.calmLevel * 0.7 - this.contentmentLevel * 0.3;
    let sphereSpeedX = (0.01 + totalEnergy * 0.05) * calmingFactor;
    let sphereSpeedY = (0.015 + totalEnergy * 0.08) * calmingFactor;

    if (this.mousePressed) {
      sphereSpeedX *= 4;
      sphereSpeedY *= 4;
    }

    this.flowingSphere.rotation.x += sphereSpeedX * this.timeWarp;
    this.flowingSphere.rotation.y += sphereSpeedY * this.timeWarp;
    this.flowingSphere.rotation.z += 0.008 * this.timeWarp;

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

    const coreMaterial = this.flowingSphere
      .material as THREE.MeshStandardMaterial;
    const corruption = Math.min(totalEnergy * 2, 1);

    const calmEffect = this.calmLevel * 0.6;
    const contentEffect = this.contentmentLevel * 0.4;

    const baseRed = 0.8 + corruption * 0.2;
    const finalRed = Math.min(1, baseRed - calmEffect * 0.4);

    const finalGreen = Math.max(
      0,
      0.05 + calmEffect * 0.6 + contentEffect * 0.2,
    );

    const finalBlue = Math.max(
      0,
      0.05 + calmEffect * 0.8 + contentEffect * 0.4,
    );

    coreMaterial.color.set(finalRed, finalGreen, finalBlue);

    const baseEmissiveIntensity =
      this.rageBuildupLevel > 0.5 ? this.rageBuildupLevel : 0;

    if (baseEmissiveIntensity > 0 || this.calmLevel > 0.2) {
      const emissiveRed = Math.min(1, 0.4 - this.calmLevel * 0.3);

      const emissiveGreen = Math.max(
        0,
        this.calmLevel * 0.3 + this.contentmentLevel * 0.2,
      );

      const emissiveBlue = Math.max(
        0,
        this.calmLevel * 0.5 + this.contentmentLevel * 0.4,
      );

      coreMaterial.emissive = new THREE.Color(
        emissiveRed,
        emissiveGreen,
        emissiveBlue,
      );
      const calmEmissiveIntensity =
        this.calmLevel * 0.5 + this.contentmentLevel * 0.3;
      coreMaterial.emissiveIntensity = Math.max(
        baseEmissiveIntensity * (1 - this.calmLevel * 0.8),
        calmEmissiveIntensity,
      );
    } else {
      coreMaterial.emissiveIntensity = 0;
    }

    this.flowingSphere.children.forEach((child, index) => {
      child.rotation.x += (0.02 + index * 0.01) * this.timeWarp;
      child.rotation.y -= (0.025 + index * 0.008) * this.timeWarp;

      const childMesh = child as THREE.Mesh;
      const childMaterial = childMesh.material as THREE.MeshBasicMaterial;
      if (index === 0) {
        childMaterial.opacity = 0.9 + Math.sin(this.currentTime * 0.1) * 0.1;
      } else {
        childMaterial.opacity =
          0.3 +
          Math.sin(this.currentTime * 0.08 + index) * 0.2 +
          totalEnergy * 0.4;
      }
    });

    this.updateFlowingSphere();

    this.updateParticles();

    this.beautyRings.children.forEach((ring, index) => {
      const ringMesh = ring as THREE.Mesh;
      const userData = ring.userData as RingUserData;
      let speed = userData.speed * this.timeWarp;

      if (this.mousePressed) {
        speed *= 6;
      }

      ring.rotation.z = userData.originalRotationZ + this.currentTime * speed;
      ring.rotation.x += 0.002 * this.timeWarp * (index % 2 === 0 ? 1 : -1);
      ring.rotation.y +=
        0.003 *
        this.timeWarp *
        Math.sin(this.currentTime * 0.01 + userData.corruptionPhase);

      const mouseInfluence = Math.abs(this.targetX) + Math.abs(this.targetY);
      const corruptionPulse =
        1 +
        Math.sin(this.currentTime * 0.02 + userData.corruptionPhase) *
          (0.15 + mouseInfluence * 0.2 + totalEnergy * 0.4);
      ring.scale.setScalar(corruptionPulse);

      const material = ringMesh.material as THREE.MeshBasicMaterial;
      const corruptionIntensity =
        0.3 + mouseInfluence * 0.4 + totalEnergy * 0.5;
      material.opacity = Math.min(corruptionIntensity, 0.8);

      const evilHue = Math.sin(this.currentTime * 0.005 + index) * 0.5 + 0.5;
      if (evilHue > 0.7) {
        material.color.set(1, 0, 0.2);
      } else if (evilHue > 0.4) {
        material.color.set(0.8, 0, 0.4);
      } else {
        material.color.set(0.6, 0, 0.1);
      }
    });

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

    this.corruptionTentacles.forEach((tentacle, index) => {
      const userData = tentacle.userData as TentacleUserData;

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

      userData.corruptionLevel *= 0.97;
      const corruption =
        userData.corruptionLevel +
        totalEnergy * 0.7 +
        this.rageBuildupLevel * 0.8;

      this.tentacleMorphFrame++;
      if (
        this.tentacleMorphFrame % CONSTANTS.TENTACLE_MORPH_THROTTLE === 0 &&
        Math.random() < 0.3 &&
        corruption > 0.3
      ) {
        const geometry = tentacle.geometry as THREE.TubeGeometry;
        const positionAttribute = geometry.attributes.position;

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

      if (corruption > 0.8) {
        material.color.set(1, 0.2, 0);
      } else if (corruption > 0.5) {
        material.color.set(0.8, 0, 0.2);
      } else {
        material.color.set(0.4 + corruption * 0.4, 0, corruption * 0.3);
      }

      const corruptionScale =
        1 +
        corruption * 0.5 +
        Math.sin(this.currentTime * 0.1 + userData.chaosPhase) *
          corruption *
          0.3;
      tentacle.scale.setScalar(corruptionScale);

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
        tentacle.position.x *= 0.95;
        tentacle.position.y *= 0.95;
        tentacle.position.z *= 0.95;
      }

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

    this.evilEyes.forEach((eye) => {
      const userData = eye.userData as EyeUserData;

      const lookDirection = new THREE.Vector3(
        this.targetX * 100,
        this.targetY * 100,
        0,
      );
      eye.lookAt(lookDirection);

      const timeSinceLastBlink = this.currentTime - userData.lastBlink;
      if (timeSinceLastBlink > Random.numberBetween(100, 300)) {
        userData.lastBlink = this.currentTime;
      }

      const blinkCycle = Math.min(timeSinceLastBlink / 20, 1);
      const blink = blinkCycle < 0.1 ? 0 : 1;

      userData.watchIntensity *= 0.995;

      const intensity =
        userData.watchIntensity + totalEnergy * 0.3 + this.screechLevel * 0.5;
      const material = eye.material as THREE.MeshStandardMaterial;
      material.opacity = intensity * blink;
      material.emissiveIntensity = intensity * 2;

      if (intensity > 0.7) {
        material.color.set(1, 0.2, 0);
      } else if (intensity > 0.4) {
        material.color.set(1, 0, 0);
      } else {
        material.color.set(0.6, 0, 0);
      }
    });

    this.bloodVeins = this.bloodVeins.filter((vein) => {
      vein.userData.life--;
      const lifeRatio = vein.userData.life / vein.userData.maxLife;

      const material = vein.material as THREE.LineBasicMaterial;
      material.opacity = lifeRatio * 0.8;

      if (vein.userData.life <= 0) {
        this.scene.remove(vein);
        this.bloodVeinPool.push(vein);
        return false;
      }
      return true;
    });

    if (this.bloodVeins.length > CONSTANTS.MAX_BLOOD_VEINS) {
      const toRemove = this.bloodVeins.splice(0, 10);
      toRemove.forEach((vein) => {
        this.scene.remove(vein);
        vein.geometry.dispose();
        (vein.material as THREE.Material).dispose();
      });
    }

    const cameraRadius = 50 + Math.abs(this.targetX) * 100;
    this.camera.position.x =
      Math.sin(this.currentTime * 0.001) * 20 + this.targetX * cameraRadius;
    this.camera.position.y =
      Math.cos(this.currentTime * 0.0015) * 15 + this.targetY * 50;
    this.camera.position.z = 200 + this.targetY * 100;

    const lookAtTarget = new THREE.Vector3(
      this.targetX * 50,
      this.targetY * 50,
      0,
    );
    this.camera.lookAt(lookAtTarget);

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.render());
  }
}

new Void();
