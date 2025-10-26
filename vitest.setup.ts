import { beforeAll } from "vitest";
import { vi } from "vitest";

// Mock Three.js modules
vi.mock("three", async () => {
  const actual = await vi.importActual("three");
  return {
    ...actual,
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      shadowMap: { enabled: false, type: 0 },
      toneMapping: 0,
      toneMappingExposure: 1,
      dispose: vi.fn(),
    })),
    Scene: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      background: null,
    })),
    PerspectiveCamera: vi.fn().mockImplementation(() => ({
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      lookAt: vi.fn(),
      aspect: 1,
      updateProjectionMatrix: vi.fn(),
    })),
    SpotLight: vi.fn().mockImplementation(() => ({
      position: { set: vi.fn() },
      castShadow: false,
      angle: 0,
      penumbra: 0,
      shadow: {
        mapSize: { width: 0, height: 0 },
        camera: { near: 0, far: 0, fov: 0 },
      },
    })),
    PointLight: vi.fn().mockImplementation(() => ({
      position: { set: vi.fn() },
      castShadow: false,
    })),
    DirectionalLight: vi.fn().mockImplementation(() => ({
      position: { set: vi.fn() },
      castShadow: false,
    })),
    AmbientLight: vi.fn().mockImplementation(() => ({})),
    Mesh: vi.fn().mockImplementation(() => ({
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      rotation: { set: vi.fn(), x: 0, y: 0, z: 0 },
      castShadow: false,
      receiveShadow: false,
      frustumCulled: true,
      material: {},
    })),
    Group: vi.fn().mockImplementation(() => ({
      add: vi.fn(),
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      rotation: { set: vi.fn(), x: 0, y: 0, z: 0 },
    })),
    SphereGeometry: vi.fn().mockImplementation(() => ({})),
    MeshStandardMaterial: vi.fn().mockImplementation(() => ({
      emissive: new (vi.importActual("three").Color)(),
      emissiveIntensity: 0,
      roughness: 0,
      metalness: 0,
      userData: {},
    })),
    Vector3: vi.fn().mockImplementation(function (x = 0, y = 0, z = 0) {
      return {
        x,
        y,
        z,
        clone: vi.fn().mockReturnValue({ x, y, z }),
        set: vi.fn(),
      };
    }),
    Color: vi.fn().mockImplementation(() => ({})),
    TextureLoader: vi.fn().mockImplementation(() => ({
      load: vi.fn().mockReturnValue({}),
    })),
    CanvasTexture: vi.fn().mockImplementation(() => ({})),
    ACESFilmicToneMapping: 0,
    PCFSoftShadowMap: 0,
    RepeatWrapping: 0,
    SRGBColorSpace: "",
  };
});

// Mock Rapier physics
vi.mock("@dimforge/rapier3d-compat", () => ({
  default: {
    init: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock global objects
Object.defineProperty(window, "innerWidth", { value: 1920 });
Object.defineProperty(window, "innerHeight", { value: 1080 });
Object.defineProperty(window, "devicePixelRatio", { value: 1 });

// Mock DOM elements
global.document = {
  createElement: vi.fn().mockImplementation((tagName: string) => ({
    className: "",
    textContent: "",
    innerHTML: "",
    appendChild: vi.fn(),
    remove: vi.fn(),
    getContext: vi.fn().mockReturnValue({
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 0,
      fillRect: vi.fn(),
      stroke: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
    }),
  })),
  getElementById: vi.fn().mockReturnValue({
    appendChild: vi.fn(),
    innerText: "",
    innerHTML: "",
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
    },
    style: {},
  }),
  querySelector: vi.fn().mockReturnValue({
    remove: vi.fn(),
  }),
  body: {
    appendChild: vi.fn(),
  },
} as any;

global.window =
  global.window ||
  ({
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1,
    addEventListener: vi.fn(),
    requestAnimationFrame: vi.fn((cb) => setTimeout(cb, 16)),
  } as any);
