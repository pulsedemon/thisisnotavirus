import * as THREE from "three";
import Random from "../../utils/random";
import "./shitstorm.scss";

class ShitstormVirus {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private toiletBowl: THREE.Group;
  private waterSurface: THREE.Mesh;
  private particles: THREE.Points;
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
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    // Camera setup with proper aspect ratio
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.camera.position.set(0, 2, 5);
    this.camera.lookAt(0, 0, 0);

    // Renderer setup with pixel ratio
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

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Add point lights for more dynamic lighting
    const pointLight1 = new THREE.PointLight(0xff00ff, 1, 10);
    pointLight1.position.set(3, 3, 3);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x00ffff, 1, 10);
    pointLight2.position.set(-3, 3, -3);
    this.scene.add(pointLight2);

    // Handle window resize
    window.addEventListener("resize", () => this.onWindowResize());
  }

  private createToiletBowl() {
    this.toiletBowl = new THREE.Group();

    // Create a more realistic bowl shape
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

    // Add a simple rim
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

    // Add subtle shaking animation to the toilet bowl
    this.animateToiletShake();
  }

  private createWater() {
    // Create a more realistic water surface
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

    // Create swirling water effect with rotating geometry
    this.animateWaterSwirl();
  }

  private createChaosElements() {
    // Create floating geometric shapes
    const shapes = [
      new THREE.TetrahedronGeometry(0.5),
      new THREE.OctahedronGeometry(0.5),
      new THREE.IcosahedronGeometry(0.5),
    ];

    for (let i = 0; i < 20; i++) {
      const shape = shapes[Math.floor(Math.random() * shapes.length)];
      const material = new THREE.MeshPhongMaterial({
        color: Random.itemInArray([0xff00ff, 0x00ffff, 0xffff00]),
        transparent: true,
        opacity: 0.6,
        wireframe: true,
      });

      const mesh = new THREE.Mesh(shape, material);
      mesh.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
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
      };

      this.chaosElements.push(group);
      this.scene.add(group);
    }
  }

  private createParticles() {
    const particleCount = 1000; // Increased particle count
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    // Enhanced poop colors with more variety
    const poopColors = [
      new THREE.Color(0x8b4513), // Saddle brown
      new THREE.Color(0xa0522d), // Sienna
      new THREE.Color(0x654321), // Dark brown
      new THREE.Color(0x964b00), // Brown
      new THREE.Color(0xff00ff), // Magenta
      new THREE.Color(0x00ffff), // Cyan
      new THREE.Color(0xffff00), // Yellow
    ];

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Random positions in a larger area
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 3;
      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = Math.random() * 8 + 2;
      positions[i3 + 2] = Math.sin(angle) * radius;

      // More chaotic velocities
      velocities[i3] = (Math.random() - 0.5) * 0.1;
      velocities[i3 + 1] = -Math.random() * 0.2 - 0.05;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;

      // Random poop colors
      const color = poopColors[Math.floor(Math.random() * poopColors.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    particleGeometry.setAttribute(
      "color",
      new THREE.BufferAttribute(colors, 3)
    );
    particleGeometry.setAttribute(
      "velocity",
      new THREE.BufferAttribute(velocities, 3)
    );

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.particles);
  }

  private createSoundWaves() {
    this.soundWaves = new THREE.Group();

    // Create multiple expanding rings for sound waves
    for (let i = 0; i < 3; i++) {
      const waveGeometry = new THREE.RingGeometry(0.1, 0.2, 32);
      const waveMaterial = new THREE.MeshBasicMaterial({
        color: Random.itemInArray([0x00ffff, 0xff00ff, 0xffff00]),
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
      };

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

  private animateWaterSwirl() {
    const animateWater = () => {
      if (this.waterSurface) {
        this.waterSurface.rotation.y += 0.05;
        this.waterSurface.position.y =
          -0.5 + Math.sin(Date.now() * 0.003) * 0.1;

        // Change water color over time
        const hue = (Date.now() * 0.001) % 1;
        (this.waterSurface.material as THREE.MeshPhongMaterial).color.setHSL(
          0.6 + hue * 0.2,
          0.8,
          0.4
        );
      }
      requestAnimationFrame(animateWater);
    };
    animateWater();
  }

  private updateParticles() {
    const positions = this.particles.geometry.attributes.position
      .array as Float32Array;
    const velocities = this.particles.geometry.attributes.velocity
      .array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      // Update positions
      positions[i] += velocities[i];
      positions[i + 1] += velocities[i + 1];
      positions[i + 2] += velocities[i + 2];

      // Add swirling motion
      const angle = Date.now() * 0.001 + i * 0.1;
      positions[i] += Math.cos(angle) * 0.01;
      positions[i + 2] += Math.sin(angle) * 0.01;

      // Reset particles that fall too low
      if (positions[i + 1] < -3) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 1.2;
        positions[i] = Math.cos(angle) * radius;
        positions[i + 1] = Math.random() * 2 + 3;
        positions[i + 2] = Math.sin(angle) * radius;

        velocities[i] = (Math.random() - 0.5) * 0.02;
        velocities[i + 1] = -Math.random() * 0.05 - 0.02;
        velocities[i + 2] = (Math.random() - 0.5) * 0.02;
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  private updateSoundWaves() {
    const time = Date.now() * 0.001;

    this.soundWaves.children.forEach((wave, index) => {
      const mesh = wave as THREE.Mesh;
      const userData = mesh.userData;

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
      const { rotationSpeed, movementSpeed } = element.userData;

      // Rotate
      element.rotation.x += rotationSpeed.x;
      element.rotation.y += rotationSpeed.y;
      element.rotation.z += rotationSpeed.z;

      // Move
      element.position.x += movementSpeed.x;
      element.position.y += movementSpeed.y;
      element.position.z += movementSpeed.z;

      // Bounce off boundaries
      if (Math.abs(element.position.x) > 5) movementSpeed.x *= -1;
      if (Math.abs(element.position.y) > 5) movementSpeed.y *= -1;
      if (Math.abs(element.position.z) > 5) movementSpeed.z *= -1;
    });
  }

  private updateCamera() {
    // Dynamic camera movement
    const time = Date.now() * 0.001;
    this.camera.position.x = Math.sin(time * 0.5) * 3;
    this.camera.position.z = Math.cos(time * 0.5) * 3;
    this.camera.position.y = 2 + Math.sin(time * 0.3) * 0.5;

    // Add camera shake
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

// Initialize the virus
new ShitstormVirus();

// Clean up on page unload
window.addEventListener("beforeunload", () => {
  new ShitstormVirus().destroy();
});
