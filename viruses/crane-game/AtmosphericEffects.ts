import * as THREE from "three";

export class AtmosphericEffects {
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
