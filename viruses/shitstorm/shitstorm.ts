import * as THREE from "three";
import { isMobile } from "../../utils/misc";
import "./shitstorm.scss";

interface ParticleUserData {
  positions: Float32Array;
  velocities: Float32Array;
  rotations: Float32Array;
  scales: Float32Array;
}

interface ChaosElementUserData {
  rotationSpeed: { x: number; y: number; z: number };
  movementSpeed: { x: number; y: number; z: number };
}

interface SoundWaveUserData {
  delay: number;
  scale: number;
  opacity: number;
}

class ShitstormVirus {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private toiletBowl: THREE.Group;
  private waterSurface: THREE.Mesh;
  private particles: THREE.InstancedMesh;
  private soundWaves: THREE.Group;
  private animationId = 0;
  private cameraShake = { x: 0, y: 0, z: 0 };
  private chaosElements: THREE.Group[] = [];

  constructor() {
    this.init();
    this.createToiletBowl();
    this.createWater();
    this.createParticles();
    this.createSoundWaves();
    this.createChaosElements();
    this.animate();
  }

  private init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2d1b4d);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(
      isMobile() ? 120 : 75,
      aspect,
      0.1,
      1000,
    );
    this.camera.position.set(0, 2, isMobile() ? 80 : 5);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const container = document.getElementById("container");
    if (container) {
      container.appendChild(this.renderer.domElement);
    }

    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0xff00ff, 1, 10);
    pointLight1.position.set(3, 3, 3);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x00ffff, 1, 10);
    pointLight2.position.set(-3, 3, -3);
    this.scene.add(pointLight2);

    window.addEventListener("resize", () => this.onWindowResize());
  }

  private createToiletBowl() {
    this.toiletBowl = new THREE.Group();

    const bowlGeometry = new THREE.CylinderGeometry(1.5, 0.8, 3, 32, 1, true);
    const bowlMaterial = new THREE.MeshPhongMaterial({
      color: 0xf8f8f8,
      shininess: 100,
      specular: 0x666666,
      side: THREE.DoubleSide,
    });
    const bowl = new THREE.Mesh(bowlGeometry, bowlMaterial);
    bowl.position.y = 0;
    bowl.castShadow = true;
    bowl.receiveShadow = true;
    this.toiletBowl.add(bowl);

    const rimGeometry = new THREE.TorusGeometry(1.8, 0.2, 16, 32);
    const rimMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 120,
      specular: 0x888888,
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.position.y = 1.5;
    rim.rotation.x = Math.PI / 2;
    rim.castShadow = true;
    rim.receiveShadow = true;
    this.toiletBowl.add(rim);

    this.scene.add(this.toiletBowl);

    this.animateToiletShake();
  }

  private createWater() {
    const waterGeometry = new THREE.CylinderGeometry(1.4, 0.7, 0.1, 64);
    const waterMaterial = new THREE.MeshPhongMaterial({
      color: 0x4a90e2,
      transparent: true,
      opacity: 0.8,
      shininess: 100,
      specular: 0xffffff,
      emissive: 0x001122,
    });

    this.waterSurface = new THREE.Mesh(waterGeometry, waterMaterial);
    this.waterSurface.position.y = -0.5;
    this.scene.add(this.waterSurface);
  }

  private createChaosElements() {
    const shapes = [
      new THREE.TetrahedronGeometry(0.5),
      new THREE.OctahedronGeometry(0.5),
      new THREE.IcosahedronGeometry(0.5),
    ];

    for (let i = 0; i < 20; i++) {
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const material = new THREE.MeshPhongMaterial({
        color: 0xff00ff as THREE.ColorRepresentation,
        transparent: true,
        opacity: 0.6,
        wireframe: true,
      });

      const mesh = new THREE.Mesh(shape, material);
      mesh.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
      );
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      );

      const group = new THREE.Group();
      group.add(mesh);
      group.userData = {
        rotationSpeed: {
          x: (Math.random() - 0.5) * 0.02,
          y: (Math.random() - 0.5) * 0.02,
          z: (Math.random() - 0.5) * 0.02,
        },
        movementSpeed: {
          x: (Math.random() - 0.5) * 0.02,
          y: (Math.random() - 0.5) * 0.02,
          z: (Math.random() - 0.5) * 0.02,
        },
      } as ChaosElementUserData;

      this.chaosElements.push(group);
      this.scene.add(group);
    }
  }

  private createPoopGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.TorusKnotGeometry(0.5, 0.2, 64, 32, 2, 3);

    const positions = geometry.attributes.position.array;
    const normals = geometry.attributes.normal.array;

    const newPositions = new Float32Array(positions);
    const newNormals = new Float32Array(normals);

    for (let i = 0; i < positions.length; i += 3) {
      newPositions[i] += (Math.random() - 0.5) * 0.1;
      newPositions[i + 1] += (Math.random() - 0.5) * 0.1;
      newPositions[i + 2] += (Math.random() - 0.5) * 0.1;

      newNormals[i] += (Math.random() - 0.5) * 0.2;
      newNormals[i + 1] += (Math.random() - 0.5) * 0.2;
      newNormals[i + 2] += (Math.random() - 0.5) * 0.2;
    }

    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(newPositions, 3),
    );
    geometry.setAttribute("normal", new THREE.BufferAttribute(newNormals, 3));

    geometry.scale(1, 1.5, 1);

    return geometry;
  }

  private createParticles() {
    const particleCount = 1000;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const rotations = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    const poopColors = [
      new THREE.Color(0x8b4513),
      new THREE.Color(0xa0522d),
      new THREE.Color(0x654321),
      new THREE.Color(0x964b00),
    ];

    const poopGeometry = this.createPoopGeometry();
    const poopMaterial = new THREE.MeshPhongMaterial({
      color: 0x8b4513,
      shininess: 30,
      specular: 0x444444,
      flatShading: true,
    });

    this.particles = new THREE.InstancedMesh(
      poopGeometry,
      poopMaterial,
      particleCount,
    );
    this.scene.add(this.particles);

    this.particles.userData = {
      positions,
      velocities,
      rotations,
      scales,
    } as ParticleUserData;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 3;
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = Math.random() * 8 + 2;
      positions[i3 + 2] = Math.sin(angle) * radius;

      velocities[i3] = (Math.random() - 0.5) * 0.1;
      velocities[i3 + 1] = -Math.random() * 0.2 - 0.05;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;

      rotations[i3] = Math.random() * Math.PI * 2;
      rotations[i3 + 1] = Math.random() * Math.PI * 2;
      rotations[i3 + 2] = Math.random() * Math.PI * 2;

      scales[i] = 0.2 + Math.random() * 0.3;

      const matrix = new THREE.Matrix4();
      matrix.makeRotationFromEuler(
        new THREE.Euler(rotations[i3], rotations[i3 + 1], rotations[i3 + 2]),
      );
      matrix.setPosition(positions[i3], positions[i3 + 1], positions[i3 + 2]);
      matrix.scale(new THREE.Vector3(scales[i], scales[i], scales[i]));
      this.particles.setMatrixAt(i, matrix);

      const color = poopColors[Math.floor(Math.random() * poopColors.length)];
      this.particles.setColorAt(i, color);
    }
  }

  private createSoundWaves() {
    this.soundWaves = new THREE.Group();

    for (let i = 0; i < 3; i++) {
      const waveGeometry = new THREE.RingGeometry(0.1, 0.2, 32);
      const waveMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff as THREE.ColorRepresentation,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
      });

      const wave = new THREE.Mesh(waveGeometry, waveMaterial);
      wave.rotation.x = -Math.PI / 2;
      wave.position.y = 0.1;
      wave.userData = {
        delay: i * 0.7,
        scale: 0.1,
        opacity: 0.3,
      } as SoundWaveUserData;

      this.soundWaves.add(wave);
    }

    this.scene.add(this.soundWaves);
  }

  private animateToiletShake() {
    const shakeIntensity = 0.02;
    setInterval(() => {
      this.toiletBowl.position.x = (Math.random() - 0.5) * shakeIntensity;
      this.toiletBowl.position.z = (Math.random() - 0.5) * shakeIntensity;
      this.toiletBowl.rotation.z = (Math.random() - 0.5) * shakeIntensity;
    }, 50);
  }

  private updateWater() {
    if (this.waterSurface) {
      this.waterSurface.rotation.y += 0.05;
      this.waterSurface.position.y = -0.5 + Math.sin(Date.now() * 0.003) * 0.1;

      const hue = (Date.now() * 0.001) % 1;
      (this.waterSurface.material as THREE.MeshPhongMaterial).color.setHSL(
        0.6 + hue * 0.2,
        0.8,
        0.4,
      );
    }
  }

  private updateParticles() {
    const { positions, velocities, rotations, scales } = this.particles
      .userData as ParticleUserData;
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Euler();
    const scale = new THREE.Vector3();

    for (let i = 0; i < positions.length / 3; i++) {
      const i3 = i * 3;

      positions[i3] += velocities[i3];
      positions[i3 + 1] += velocities[i3 + 1];
      positions[i3 + 2] += velocities[i3 + 2];

      const angle = Date.now() * 0.001 + i * 0.1;
      positions[i3] += Math.cos(angle) * 0.01;
      positions[i3 + 2] += Math.sin(angle) * 0.01;

      rotations[i3] += 0.01;
      rotations[i3 + 1] += 0.01;
      rotations[i3 + 2] += 0.01;

      if (positions[i3 + 1] < -3) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.2;
        positions[i3] = Math.cos(angle) * radius;
        positions[i3 + 1] = Math.random() * 2 + 3;
        positions[i3 + 2] = Math.sin(angle) * radius;

        velocities[i3] = (Math.random() - 0.5) * 0.02;
        velocities[i3 + 1] = -Math.random() * 0.05 - 0.02;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
      }

      position.set(positions[i3], positions[i3 + 1], positions[i3 + 2]);
      rotation.set(rotations[i3], rotations[i3 + 1], rotations[i3 + 2]);
      scale.setScalar(scales[i]);

      matrix.compose(
        position,
        new THREE.Quaternion().setFromEuler(rotation),
        scale,
      );
      this.particles.setMatrixAt(i, matrix);
    }

    this.particles.instanceMatrix.needsUpdate = true;
  }

  private updateSoundWaves() {
    const time = Date.now() * 0.001;

    this.soundWaves.children.forEach((wave) => {
      const mesh = wave as THREE.Mesh;
      const userData = mesh.userData as SoundWaveUserData;

      const waveTime = time - userData.delay;
      if (waveTime > 0) {
        const scale = 0.1 + (waveTime % 2) * 2;
        const opacity = Math.max(0, 0.3 - (waveTime % 2) * 0.15);

        mesh.scale.set(scale, 1, scale);
        (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      }
    });
  }

  private updateChaosElements() {
    this.chaosElements.forEach((element) => {
      const { rotationSpeed, movementSpeed } =
        element.userData as ChaosElementUserData;

      element.rotation.x += rotationSpeed.x;
      element.rotation.y += rotationSpeed.y;
      element.rotation.z += rotationSpeed.z;

      element.position.x += movementSpeed.x;
      element.position.y += movementSpeed.y;
      element.position.z += movementSpeed.z;

      if (Math.abs(element.position.x) > 5) movementSpeed.x *= -1;
      if (Math.abs(element.position.y) > 5) movementSpeed.y *= -1;
      if (Math.abs(element.position.z) > 5) movementSpeed.z *= -1;
    });
  }

  private updateCamera() {
    const time = Date.now() * 0.001;
    this.camera.position.x = Math.sin(time * 0.5) * 3;
    this.camera.position.z = Math.cos(time * 0.5) * 3;
    this.camera.position.y = 2 + Math.sin(time * 0.3) * 0.5;

    this.cameraShake.x = (Math.random() - 0.5) * 0.1;
    this.cameraShake.y = (Math.random() - 0.5) * 0.1;
    this.cameraShake.z = (Math.random() - 0.5) * 0.1;

    this.camera.position.x += this.cameraShake.x;
    this.camera.position.y += this.cameraShake.y;
    this.camera.position.z += this.cameraShake.z;

    this.camera.lookAt(0, 0, 0);
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    this.updateWater();
    this.updateParticles();
    this.updateSoundWaves();
    this.updateChaosElements();
    this.updateCamera();

    this.renderer.render(this.scene, this.camera);
  }

  private onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  }

  public destroy() {
    cancelAnimationFrame(this.animationId);
    this.renderer.dispose();
  }
}

new ShitstormVirus();

window.addEventListener("beforeunload", () => {
  new ShitstormVirus().destroy();
});
