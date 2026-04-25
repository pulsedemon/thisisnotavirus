import { vi } from 'vitest';

/**
 * Class-based three.js mocks tailored to the engine layer (Layer3D,
 * Compositor, ExperienceController). The engine constructs Three.js objects
 * via `new THREE.X()`, which the global `vi.fn(() => obj)` style can be
 * fragile about; using real classes is unambiguous and lets engine tests
 * exercise constructor side-effects deterministically.
 *
 * Usage in a test file:
 *   import { engineThreeMockModule } from '../../test-utils/engine-three-mocks';
 *   vi.mock('three', engineThreeMockModule);
 */

class Vec2Mock {
  x: number;
  y: number;
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  set(x: number, y: number) {
    this.x = x;
    this.y = y;
    return this;
  }
}

class Vec3Mock {
  x: number;
  y: number;
  z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

class SceneMock {
  background: unknown = null;
  children: unknown[] = [];
  add = vi.fn((obj: unknown) => this.children.push(obj));
  remove = vi.fn((obj: unknown) => {
    const i = this.children.indexOf(obj);
    if (i >= 0) this.children.splice(i, 1);
  });
}

class PerspectiveCameraMock {
  position = new Vec3Mock(0, 0, 300);
  aspect = 1;
  fov = 60;
  near = 0.1;
  far = 10000;
  updateProjectionMatrix = vi.fn();
  lookAt = vi.fn();
}

class OrthographicCameraMock {
  left: number;
  right: number;
  top: number;
  bottom: number;
  near: number;
  far: number;
  position = new Vec3Mock();
  updateProjectionMatrix = vi.fn();
  constructor(left = -1, right = 1, top = 1, bottom = -1, near = 0, far = 1) {
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
    this.near = near;
    this.far = far;
  }
}

class WebGLRendererMock {
  domElement: HTMLCanvasElement;
  setSize = vi.fn();
  setPixelRatio = vi.fn();
  setClearColor = vi.fn();
  setRenderTarget = vi.fn();
  clear = vi.fn();
  render = vi.fn();
  dispose = vi.fn();
  shadowMap = { enabled: false, type: 0 };
  toneMapping = 0;
  toneMappingExposure = 1;
  constructor(opts?: { canvas?: HTMLCanvasElement }) {
    this.domElement = opts?.canvas ?? document.createElement('canvas');
  }
}

class WebGLRenderTargetMock {
  width: number;
  height: number;
  texture = { dispose: vi.fn() };
  setSize = vi.fn((w: number, h: number) => {
    this.width = w;
    this.height = h;
  });
  dispose = vi.fn();
  constructor(width = 1, height = 1) {
    this.width = width;
    this.height = height;
  }
}

class ShaderMaterialMock {
  uniforms: Record<string, { value: unknown }>;
  vertexShader: string;
  fragmentShader: string;
  transparent = false;
  depthTest = true;
  depthWrite = true;
  dispose = vi.fn();
  constructor(
    opts: {
      uniforms?: Record<string, { value: unknown }>;
      vertexShader?: string;
      fragmentShader?: string;
      transparent?: boolean;
      depthTest?: boolean;
      depthWrite?: boolean;
    } = {}
  ) {
    this.uniforms = opts.uniforms ?? {};
    this.vertexShader = opts.vertexShader ?? '';
    this.fragmentShader = opts.fragmentShader ?? '';
    if (opts.transparent !== undefined) this.transparent = opts.transparent;
    if (opts.depthTest !== undefined) this.depthTest = opts.depthTest;
    if (opts.depthWrite !== undefined) this.depthWrite = opts.depthWrite;
  }
}

class MeshBasicMaterialMock {
  color = {
    setRGB: vi.fn(),
    set: vi.fn(),
  };
  wireframe = false;
  dispose = vi.fn();
  constructor(opts?: { color?: number; wireframe?: boolean }) {
    if (opts?.wireframe) this.wireframe = opts.wireframe;
  }
}

class PlaneGeometryMock {
  dispose = vi.fn();
}

class SphereGeometryMock {
  dispose = vi.fn();
}

class MeshMock {
  geometry: { dispose: () => void };
  material: { dispose: () => void };
  position = new Vec3Mock();
  rotation = new Vec3Mock();
  frustumCulled = true;
  renderOrder = 0;
  constructor(
    geometry: { dispose: () => void },
    material: { dispose: () => void }
  ) {
    this.geometry = geometry;
    this.material = material;
  }
}

class CanvasTextureMock {
  needsUpdate = false;
  minFilter = 0;
  magFilter = 0;
  source: HTMLCanvasElement;
  dispose = vi.fn();
  constructor(canvas: HTMLCanvasElement) {
    this.source = canvas;
  }
}

class ClockMock {
  start = 0;
  constructor() {
    this.start = performance.now() / 1000;
  }
  getDelta(): number {
    return 0.016;
  }
  getElapsedTime(): number {
    return performance.now() / 1000 - this.start;
  }
}

export function engineThreeMockModule(): Record<string, unknown> {
  return {
    Scene: SceneMock,
    PerspectiveCamera: PerspectiveCameraMock,
    OrthographicCamera: OrthographicCameraMock,
    WebGLRenderer: WebGLRendererMock,
    WebGLRenderTarget: WebGLRenderTargetMock,
    ShaderMaterial: ShaderMaterialMock,
    MeshBasicMaterial: MeshBasicMaterialMock,
    PlaneGeometry: PlaneGeometryMock,
    SphereGeometry: SphereGeometryMock,
    Mesh: MeshMock,
    CanvasTexture: CanvasTextureMock,
    Clock: ClockMock,
    Vector2: Vec2Mock,
    Vector3: Vec3Mock,
    LinearFilter: 0,
    NearestFilter: 0,
    RGBAFormat: 0,
    UnsignedByteType: 0,
    DoubleSide: 0,
    FrontSide: 0,
    BackSide: 0,
  };
}
