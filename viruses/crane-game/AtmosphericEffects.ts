import * as THREE from "three";
import { randomFloat } from "../../utils/random";
import { isMobile } from "../../utils/misc";

/**
 * AtmosphericEffects - Mobile Optimized
 *
 * Mobile optimizations:
 * - Dust particles: 50 → 8 (84% reduction)
 * - Floating lights: 30 → 5 (83% reduction)
 * - Background canvas: 512x512 → 256x256 (75% fewer pixels)
 * - Background update frequency: 100ms → 500ms (5x slower)
 * - Radial glow effects: Disabled on mobile (significant GPU savings)
 */

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
    // Reduce particle counts on mobile for better performance
    if (isMobile()) {
      this.particleCount = 8; // Reduced from 15 to 8 (84% reduction from desktop)
      this.backgroundUpdateInterval = 500; // Update much less frequently on mobile (5x slower)
    }

    this.createDustParticles(scene);
    this.createAnimatedBackground(scene);
    this.createFloatingLights(scene);

    // Create initial background for mobile (static)
    if (isMobile()) {
      this.animateBackground(true);
    }
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
    // Reduce canvas resolution on mobile for better performance
    const canvasSize = isMobile() ? 256 : 512;
    canvas.width = canvasSize;
    canvas.height = canvasSize;
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
    const particleCount = isMobile() ? 5 : 30; // Reduced from 10 to 5 on mobile (83% reduction)
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
        randomFloat(-50, 50),
        randomFloat(-20, 40),
        randomFloat(-60, -20),
      );

      // Store animation data
      particle.userData = particle.userData || {};
      particle.userData.floatSpeed = randomFloat(0.01, 0.03);
      particle.userData.floatOffset = randomFloat(0, Math.PI * 2);
      particle.userData.horizontalSpeed = randomFloat(0.005, 0.015);

      scene.add(particle);
      this.particles.push(particle);
    }
  }

  private createGradientColors(time: number, staticMode: boolean) {
    const baseHues = staticMode
      ? [280, 200, 320]
      : [(time * 20) % 360, (time * 20 + 120) % 360, (time * 20 + 240) % 360];
    const saturations = [70, 80, 70];
    const lightnesses = [15, 10, 12];

    return baseHues.map(
      (hue, i) => `hsl(${hue}, ${saturations[i]}%, ${lightnesses[i]}%)`,
    );
  }

  animateBackground(staticMode = false) {
    const bgCanvas = this.bgCanvas;
    const bgContext = this.bgContext;
    if (!bgCanvas || !bgContext) return;

    const time = staticMode ? 0 : Date.now() * 0.001;
    const colors = this.createGradientColors(time, staticMode);

    // Create gradient
    const gradient = bgContext.createLinearGradient(0, 0, 0, bgCanvas.height);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.5, colors[1]);
    gradient.addColorStop(1, colors[2]);

    bgContext.fillStyle = gradient;
    bgContext.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

    // Add some radial glow spots (skip in static mode and on mobile for performance)
    if (!staticMode && !isMobile()) {
      for (let i = 0; i < 3; i++) {
        bgContext.fillStyle = this.createRadialGlow(bgContext, time, i);
        bgContext.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
      }
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

  private createRadialGlow(
    bgContext: CanvasRenderingContext2D,
    time: number,
    i: number,
  ) {
    const x = Math.sin(time * 0.5 + i * 2) * 200 + 256;
    const y = Math.cos(time * 0.3 + i * 2) * 200 + 256;
    const hue = (time * 30 + i * 120) % 360;

    const radialGradient = bgContext.createRadialGradient(x, y, 0, x, y, 150);
    radialGradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.15)`);
    radialGradient.addColorStop(1, "rgba(0,0,0,0)");

    return radialGradient;
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
    // Skip all animations on mobile for better performance
    if (isMobile()) {
      return;
    }

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
