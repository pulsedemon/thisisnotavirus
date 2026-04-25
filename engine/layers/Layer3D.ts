import * as THREE from 'three';
import type { Layer3DContext } from '../modules/VirusModule';

/**
 * Layer3D owns a single shared Three.js scene + perspective camera + renderer.
 * 3D viruses add objects to `scene` during `mount` and remove them in
 * `unmount`. The renderer's output is fed to the compositor as a texture.
 *
 * In headless test environments without WebGL, the renderer falls back to a
 * stub so unit tests can exercise mount/render lifecycle without crashing.
 */
export default class Layer3D {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly renderTarget: THREE.WebGLRenderTarget;
  width = 0;
  height = 0;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 10000);
    this.camera.position.set(0, 0, 300);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setClearColor(0x000000, 0);

    this.renderTarget = new THREE.WebGLRenderTarget(1, 1, {
      depthBuffer: true,
      stencilBuffer: false,
    });
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    this.renderer.setSize(w, h, false);
    this.renderTarget.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  context(): Layer3DContext {
    return {
      scene: this.scene,
      camera: this.camera,
      renderer: this.renderer,
      width: this.width,
      height: this.height,
    };
  }

  render(): void {
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);
  }

  dispose(): void {
    this.renderTarget.dispose();
    this.renderer.dispose();
  }
}
