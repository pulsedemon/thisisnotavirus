import * as THREE from 'three';
import type { TransitionEffect } from '../transitions/TransitionEffect';
import crossFade from '../transitions/cross-fade';
import chromaticTear from '../transitions/chromatic-tear';
import type Layer2D from './Layer2D';
import type Layer3D from './Layer3D';

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

interface CompositorState {
  blend2D: number;
  blend3D: number;
  progress: number;
  effect: TransitionEffect;
}

/**
 * Compositor draws a single fullscreen quad to the visible canvas.
 * Its fragment shader is swapped in/out per active TransitionEffect, so adding
 * a new transition is one new file and one registry entry.
 */
export default class Compositor {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private mesh: THREE.Mesh;
  private layer2DTexture: THREE.CanvasTexture;
  private effects = new Map<string, TransitionEffect>();
  private currentEffectName: string;
  private state: CompositorState;
  private clock = new THREE.Clock();
  width = 0;
  height = 0;

  constructor(canvas: HTMLCanvasElement, layer2D: Layer2D, layer3D: Layer3D) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      preserveDrawingBuffer: false,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.layer2DTexture = new THREE.CanvasTexture(layer2D.canvas);
    this.layer2DTexture.minFilter = THREE.LinearFilter;
    this.layer2DTexture.magFilter = THREE.LinearFilter;

    this.registerEffect(crossFade);
    this.registerEffect(chromaticTear);
    this.currentEffectName = crossFade.name;

    this.state = {
      blend2D: 1,
      blend3D: 0,
      progress: 0,
      effect: crossFade,
    };

    const material = this.buildMaterial(crossFade);
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);

    // Bind the 3D layer's render target as the secondary texture.
    this.bindLayer3D(layer3D);
  }

  private bindLayer3D(layer3D: Layer3D): void {
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.uTex3D.value = layer3D.renderTarget.texture;
  }

  private buildMaterial(effect: TransitionEffect): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: effect.fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTex2D: { value: this.layer2DTexture },
        uTex3D: { value: null },
        uBlend2D: { value: 1 },
        uBlend3D: { value: 0 },
        uProgress: { value: 0 },
        uTime: { value: 0 },
      },
    });
  }

  registerEffect(effect: TransitionEffect): void {
    this.effects.set(effect.name, effect);
  }

  listEffects(): string[] {
    return Array.from(this.effects.keys());
  }

  setEffect(name: string): boolean {
    const effect = this.effects.get(name);
    if (!effect) return false;
    this.currentEffectName = name;
    const oldMat = this.mesh.material as THREE.ShaderMaterial;
    const prevTex3D = oldMat.uniforms.uTex3D.value as THREE.Texture | null;
    const newMat = this.buildMaterial(effect);
    newMat.uniforms.uTex3D.value = prevTex3D;
    this.mesh.material = newMat;
    oldMat.dispose();
    this.state.effect = effect;
    return true;
  }

  getEffectName(): string {
    return this.currentEffectName;
  }

  setBlend(blend2D: number, blend3D: number): void {
    this.state.blend2D = clamp01(blend2D);
    this.state.blend3D = clamp01(blend3D);
  }

  getBlend(): { blend2D: number; blend3D: number } {
    return { blend2D: this.state.blend2D, blend3D: this.state.blend3D };
  }

  setProgress(progress: number): void {
    this.state.progress = clamp01(progress);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height, false);
  }

  render(): void {
    this.layer2DTexture.needsUpdate = true;
    const mat = this.mesh.material as THREE.ShaderMaterial;
    mat.uniforms.uBlend2D.value = this.state.blend2D;
    mat.uniforms.uBlend3D.value = this.state.blend3D;
    mat.uniforms.uProgress.value = this.state.progress;
    mat.uniforms.uTime.value = this.clock.getElapsedTime();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    const mat = this.mesh.material;
    if (Array.isArray(mat)) {
      for (const m of mat) m.dispose();
    } else {
      mat.dispose();
    }
    this.mesh.geometry.dispose();
    this.layer2DTexture.dispose();
    this.renderer.dispose();
  }
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}
