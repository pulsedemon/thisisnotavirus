import type * as THREE from 'three';

export interface Layer2DContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  domRoot: HTMLElement;
  width: number;
  height: number;
}

export interface Layer3DContext {
  scene: THREE.Scene;
  camera: THREE.Camera;
  renderer: THREE.WebGLRenderer;
  width: number;
  height: number;
}

export interface VirusModuleClock {
  elapsed: number;
  delta: number;
}

export interface VirusModuleContext {
  layer2D?: Layer2DContext;
  layer3D?: Layer3DContext;
  clock: VirusModuleClock;
}

export interface LayerBlend {
  layer2D: number;
  layer3D: number;
}

export interface VirusKeyboardEvent {
  type: 'keydown' | 'keyup';
  key: string;
  code: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

export interface VirusModuleCapabilities {
  has2D: boolean;
  has3D: boolean;
  wantsKeyboard?: boolean;
}

export interface VirusModule {
  readonly id: string;
  readonly capabilities: VirusModuleCapabilities;
  mount(ctx: VirusModuleContext): void | Promise<void>;
  update(dt: number, blend: LayerBlend): void;
  resize?(width: number, height: number): void;
  unmount(): void;
  onKeyboard?(event: VirusKeyboardEvent): void;
}

export type VirusModuleFactory = (id: string) => VirusModule;
