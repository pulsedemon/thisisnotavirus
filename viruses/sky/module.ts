import * as THREE from 'three';
import type {
  LayerBlend,
  VirusModule,
  VirusModuleCapabilities,
  VirusModuleContext,
  VirusModuleFactory,
} from '../../engine/modules/VirusModule';
import { randomFloat } from '../../utils/random';
import vertexShader from './sky.vert?raw';
import fragmentShader from './sky.frag?raw';

/**
 * Native port of sky — fullscreen shader plane added at the back of the
 * shared 3D scene. Because the plane uses an OrthographicCamera trick (the
 * vertex shader writes to clip space directly via `position.xy`), the shared
 * PerspectiveCamera doesn't matter for rendering this plane; the trick is
 * we make the plane large enough to cover the viewport at the camera's
 * current `z`. Simpler: render the plane through the shared scene's
 * background by adding it as a Mesh on its own private orthographic stage
 * is overkill for M1 — instead, write directly to clip-space with a
 * vertex shader that ignores the projection matrix.
 */
const VERT_FULLSCREEN = /* glsl */ `
  ${vertexShaderClipSpace()}
`;

function vertexShaderClipSpace(): string {
  // Ignore the camera; render to clip-space directly. We still pass uv so the
  // fragment shader can use it (the original sky.vert does similar work).
  return `
    varying vec2 v_uv;
    void main() {
      v_uv = uv;
      gl_Position = vec4(position.xy, 0.999, 1.0);
    }
  `;
}

class SkyModule implements VirusModule {
  readonly id: string;
  readonly capabilities: VirusModuleCapabilities = {
    has2D: false,
    has3D: true,
  };

  private mesh: THREE.Mesh | null = null;
  private scene: THREE.Scene | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private elapsed = 0;
  private timeOfDay = 0.5;
  private targetTod = 0.5;
  private cloudiness = 0.3;
  private targetCloudiness = 0.3;
  private nextJump = 0;

  constructor(id: string) {
    this.id = id;
  }

  mount(ctx: VirusModuleContext): void {
    if (!ctx.layer3D) throw new Error('sky requires layer3D');
    this.scene = ctx.layer3D.scene;

    const pixelRes = Math.round(randomFloat(128, 320));
    const cloudScaleX = randomFloat(8, 18);
    const cloudScaleY = randomFloat(4, 9);
    const cloudSpeed = randomFloat(0.03, 0.15);
    const cloudOpacity = randomFloat(0.6, 0.95);
    const posterLevels = Math.round(randomFloat(4, 10));
    const edgeOffset = randomFloat(0.02, 0.1);
    const hueShift = Math.random();
    const cloudHueShift = Math.random();

    // The original `sky.vert` uses an orthographic projection. To play nicely
    // with the shared perspective camera we replace it with a clip-space
    // pass-through, but we still load the original fragment shader unchanged.
    void vertexShader; // kept import for potential future use
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT_FULLSCREEN,
      fragmentShader,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: {
          value: new THREE.Vector2(ctx.layer3D.width, ctx.layer3D.height),
        },
        u_timeOfDay: { value: 0.5 },
        u_cloudiness: { value: 0.3 },
        u_pixelRes: { value: pixelRes },
        u_cloudScale: { value: new THREE.Vector2(cloudScaleX, cloudScaleY) },
        u_cloudSpeed: { value: cloudSpeed },
        u_cloudOpacity: { value: cloudOpacity },
        u_posterLevels: { value: posterLevels },
        u_edgeOffset: { value: edgeOffset },
        u_hueShift: { value: hueShift },
        u_cloudHueShift: { value: cloudHueShift },
      },
    });

    const geom = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geom, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1; // draw before other scene contents
    this.scene.add(this.mesh);
    this.nextJump = randomFloat(2, 5);
  }

  resize(width: number, height: number): void {
    if (!this.material) return;
    (this.material.uniforms.u_resolution.value as THREE.Vector2).set(
      width,
      height
    );
  }

  update(dt: number, _blend: LayerBlend): void {
    if (!this.material) return;
    this.elapsed += dt;
    this.timeOfDay += (this.targetTod - this.timeOfDay) * dt * 1.5;
    this.cloudiness += (this.targetCloudiness - this.cloudiness) * dt * 1.5;
    if (this.elapsed > this.nextJump) {
      this.targetTod = Math.random();
      this.targetCloudiness = randomFloat(0.3, 1);
      this.nextJump = this.elapsed + randomFloat(2, 5);
    }
    this.material.uniforms.u_time.value = this.elapsed;
    this.material.uniforms.u_timeOfDay.value = this.timeOfDay;
    this.material.uniforms.u_cloudiness.value = this.cloudiness;
  }

  unmount(): void {
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh);
      this.mesh.geometry.dispose();
    }
    this.material?.dispose();
    this.mesh = null;
    this.material = null;
    this.scene = null;
  }
}

const factory: VirusModuleFactory = id => new SkyModule(id);
export default factory;
