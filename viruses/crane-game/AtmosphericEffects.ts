import * as THREE from "three";
import Random from "../../utils/random";

export class AtmosphericEffects {
  dustParticles: THREE.Points[] = [];
  particleCount = 50;

  // Background gradient animation
  bgCanvas?: HTMLCanvasElement;
  bgContext?: CanvasRenderingContext2D;
  backgroundSphere?: THREE.Mesh;

  // Floating neon particles
  particles: THREE.Mesh[] = [];

  // Throttle expensive background animation
  private lastBackgroundUpdate = 0;
  private backgroundUpdateInterval = 100; // Update every 100ms instead of every frame

  constructor(scene: THREE.Scene) {
    this.createDustParticles(scene);
    this.createAnimatedBackground(scene);
    this.createFloatingLights(scene);
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

  createAnimatedBackground(scene: THREE.Scene) {
    // Animated gradient background using a large sphere
    const geometry = new THREE.SphereGeometry(200, 32, 32);
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d")!;

    // Store canvas for animation
    this.bgCanvas = canvas;
    this.bgContext = context;

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
    });

    const sphere = new THREE.Mesh(geometry, material);
    this.backgroundSphere = sphere;
    scene.add(sphere);
  }

  createFloatingLights(scene: THREE.Scene) {
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
        Random.floatBetween(-50, 50),
        Random.floatBetween(-20, 40),
        Random.floatBetween(-60, -20),
      );

      // Store animation data
      particle.userData = particle.userData || {};
      particle.userData.floatSpeed = Random.floatBetween(0.01, 0.03);
      particle.userData.floatOffset = Random.floatBetween(0, Math.PI * 2);
      particle.userData.horizontalSpeed = Random.floatBetween(0.005, 0.015);

      scene.add(particle);
      this.particles.push(particle);
    }
  }

  animateBackground() {
    const bgCanvas = this.bgCanvas;
    const bgContext = this.bgContext;
    if (!bgCanvas || !bgContext) return;

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

    // Update texture for background sphere
    if (this.backgroundSphere && this.backgroundSphere.material) {
      const material = this.backgroundSphere
        .material as THREE.MeshBasicMaterial;
      if (material.map) {
        material.map.needsUpdate = true;
      }
    }
  }

  animateFloatingParticles() {
    if (!this.particles) return;

    const time = Date.now() * 0.001;
    this.particles.forEach((particle: THREE.Mesh) => {
      const floatSpeed = (particle.userData?.floatSpeed as number) || 0.02;
      const floatOffset = (particle.userData?.floatOffset as number) || 0;
      const horizontalSpeed =
        (particle.userData?.horizontalSpeed as number) || 0.01;

      // Vertical floating
      particle.position.y += Math.sin(time * floatSpeed + floatOffset) * 0.02;

      // Horizontal drifting
      particle.position.x += Math.cos(time * horizontalSpeed) * 0.01;

      // Pulsing opacity
      const mat = particle.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 + Math.sin(time * 2 + floatOffset) * 0.3;

      // Wrap around boundaries
      if (particle.position.y > 40) particle.position.y = -20;
      if (particle.position.y < -20) particle.position.y = 40;
      if (particle.position.x > 50) particle.position.x = -50;
      if (particle.position.x < -50) particle.position.x = 50;
    });
  }

  animate(windStrength = 0.01) {
    this.animateDust(windStrength);

    // Throttle expensive background animation to every 100ms
    const now = Date.now();
    if (now - this.lastBackgroundUpdate > this.backgroundUpdateInterval) {
      this.animateBackground();
      this.lastBackgroundUpdate = now;
    }

    this.animateFloatingParticles();
  }
}
