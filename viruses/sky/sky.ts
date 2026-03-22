import './sky.scss';
import * as THREE from 'three';
import { randomFloat } from '../../utils/random';
import vertexShader from './sky.vert?raw';
import fragmentShader from './sky.frag?raw';

class Sky {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  material: THREE.ShaderMaterial;
  clock: THREE.Clock;

  timeOfDay = 0.5;
  targetTod = 0.5;
  cloudiness = 0.3;
  targetCloudiness = 0.3;
  nextJump = 0;
  animationId = 0;

  container: HTMLElement;

  constructor() {
    this.container = document.getElementById('container')!;
    this.clock = new THREE.Clock();
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.createElement('canvas'),
    });
    this.container.appendChild(this.renderer.domElement);
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: {
          value: new THREE.Vector2(
            this.container.clientWidth,
            this.container.clientHeight
          ),
        },
        u_timeOfDay: { value: 0.5 },
        u_cloudiness: { value: 0.3 },
      },
    });

    this.scene.add(
      new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material)
    );
    this.nextJump = randomFloat(2, 5);

    window.addEventListener('pagehide', () => this.dispose());
    this.render();
  }

  render() {
    const dt = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Keep canvas matched to container
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (
      this.renderer.domElement.width !== w ||
      this.renderer.domElement.height !== h
    ) {
      this.renderer.setSize(w, h);
      (this.material.uniforms.u_resolution.value as THREE.Vector2).set(w, h);
    }

    // Lerp toward targets
    this.timeOfDay += (this.targetTod - this.timeOfDay) * dt * 1.5;
    this.cloudiness += (this.targetCloudiness - this.cloudiness) * dt * 1.5;

    // Random jumps
    if (elapsed > this.nextJump) {
      this.targetTod = Math.random();
      this.targetCloudiness = Math.random();
      this.nextJump = elapsed + randomFloat(2, 5);
    }

    this.material.uniforms.u_time.value = elapsed;
    this.material.uniforms.u_timeOfDay.value = this.timeOfDay;
    this.material.uniforms.u_cloudiness.value = this.cloudiness;

    this.renderer.render(this.scene, this.camera);
    this.animationId = requestAnimationFrame(() => this.render());
  }

  dispose() {
    cancelAnimationFrame(this.animationId);
    this.material.dispose();
    this.renderer.dispose();
  }
}

new Sky();
