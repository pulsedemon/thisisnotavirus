import { vi } from "vitest";

/**
 * Mock implementation of Three.js Vector3
 */
export class MockVector3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  clone() {
    return new MockVector3(this.x, this.y, this.z);
  }

  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
}

/**
 * Mock implementation of Three.js Box3
 */
export class MockBox3 {
  min: MockVector3;
  max: MockVector3;

  constructor() {
    this.min = new MockVector3();
    this.max = new MockVector3();
  }

  setFromObject(object: any) {
    // Mock implementation - return a box with reasonable dimensions
    this.min.set(-1, -1, -1);
    this.max.set(1, 1, 1);
    return this;
  }
}

/**
 * Mock implementation of Three.js Color with basic HSL to RGB conversion
 */
export class MockColor {
  r = 0;
  g = 0;
  b = 0;

  setHSL(h: number, s: number, l: number) {
    // Simple HSL to RGB conversion for testing
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
    const m = l - c / 2;

    let r = 0,
      g = 0,
      b = 0;
    if (h < 1 / 6) {
      r = c;
      g = x;
      b = 0;
    } else if (h < 2 / 6) {
      r = x;
      g = c;
      b = 0;
    } else if (h < 3 / 6) {
      r = 0;
      g = c;
      b = x;
    } else if (h < 4 / 6) {
      r = 0;
      g = x;
      b = c;
    } else if (h < 5 / 6) {
      r = x;
      g = 0;
      b = c;
    } else {
      r = c;
      g = 0;
      b = x;
    }

    this.r = r + m;
    this.g = g + m;
    this.b = b + m;
    return this;
  }
}

/**
 * Mock implementation of Three.js Scene
 */
export class MockScene {
  add = vi.fn();
  background = null;
}

/**
 * Mock implementation of Three.js PerspectiveCamera
 */
export class MockPerspectiveCamera {
  position = new MockVector3(0, 0, 0);
  lookAt = vi.fn();
  aspect = 1;
  updateProjectionMatrix = vi.fn();

  constructor() {
    // Ensure position has a set method for compatibility
    this.position.set = vi.fn((x: number, y: number, z: number) => {
      this.position.x = x;
      this.position.y = y;
      this.position.z = z;
      return this.position;
    });
  }
}

/**
 * Mock implementation of Three.js WebGLRenderer
 */
export class MockWebGLRenderer {
  setSize = vi.fn();
  setPixelRatio = vi.fn();
  render = vi.fn();
  shadowMap = { enabled: false, type: 0 };
  toneMapping = 0;
  toneMappingExposure = 1;
  dispose = vi.fn();
  domElement = {
    style: {
      touchAction: "",
    },
  } as HTMLCanvasElement;
}

/**
 * Mock implementation of Three.js SpotLight
 */
export class MockSpotLight {
  position = { set: vi.fn() };
  castShadow = false;
  angle = 0;
  penumbra = 0;
  shadow = {
    mapSize: { width: 0, height: 0 },
    camera: { near: 0, far: 0, fov: 0 },
  };
}

/**
 * Mock implementation of Three.js PointLight
 */
export class MockPointLight {
  position = { set: vi.fn() };
  castShadow = false;
}

/**
 * Mock implementation of Three.js DirectionalLight
 */
export class MockDirectionalLight {
  position = { set: vi.fn() };
  castShadow = false;
}

/**
 * Mock implementation of Three.js AmbientLight
 */
export class MockAmbientLight {}

/**
 * Mock implementation of Three.js Mesh
 */
export class MockMesh {
  position = { set: vi.fn(), x: 0, y: 0, z: 0 };
  rotation = { set: vi.fn(), x: 0, y: 0, z: 0 };
  castShadow = false;
  receiveShadow = false;
  frustumCulled = true;
  material = {};
}

/**
 * Mock implementation of Three.js Group
 */
export class MockGroup {
  add = vi.fn();
  position = { set: vi.fn(), x: 0, y: 0, z: 0 };
  rotation = { set: vi.fn(), x: 0, y: 0, z: 0 };
  scale = { setScalar: vi.fn(), x: 1, y: 1, z: 1 };
  frustumCulled = true;
  traverse = vi.fn((callback: (child: unknown) => void) => {
    // Call callback on self
    callback(this);
  });
  clone = vi.fn(() => {
    const cloned = new MockGroup();
    cloned.position.x = this.position.x;
    cloned.position.y = this.position.y;
    cloned.position.z = this.position.z;
    return cloned;
  });
}

/**
 * Mock implementation of Three.js SphereGeometry
 */
export class MockSphereGeometry {}

/**
 * Mock implementation of Three.js MeshStandardMaterial
 */
export class MockMeshStandardMaterial {
  emissive = {};
  emissiveIntensity = 0;
  roughness = 0;
  metalness = 0;
  userData = {};
}

/**
 * Mock implementation of Three.js TextureLoader
 */
export class MockTextureLoader {
  load = vi.fn(() => ({}));
}

/**
 * Mock implementation of Three.js CanvasTexture
 */
export class MockCanvasTexture {}

/**
 * Mock implementation of OrbitControls from three/examples/jsm/controls/OrbitControls
 */
export class MockOrbitControls {
  enableDamping = false;
  dampingFactor = 0.05;
  target = new MockVector3(0, 0, 0);
  minDistance = 0;
  maxDistance = Infinity;
  maxPolarAngle = Math.PI;
  minPolarAngle = 0;
  enablePan = true;
  panSpeed = 1;
  rotateSpeed = 1;
  update = vi.fn();

  constructor() {
    // Mock constructor - no actual initialization needed
  }
}
