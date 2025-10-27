import { vi } from "vitest";

/**
 * Creates simple factory functions for Three.js mocks
 * Can be used in both vitest.setup.ts and individual test files
 *
 * This factory approach is useful when you need fresh mock instances
 * for each test or when using vi.mock() which requires function factories.
 */
export function createThreeMocks() {
  return {
    Scene: vi.fn(() => ({
      add: vi.fn(),
      background: null,
    })),
    PerspectiveCamera: vi.fn(() => ({
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      lookAt: vi.fn(),
      aspect: 1,
      updateProjectionMatrix: vi.fn(),
    })),
    WebGLRenderer: vi.fn(() => ({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      render: vi.fn(),
      shadowMap: { enabled: false, type: 0 },
      toneMapping: 0,
      toneMappingExposure: 1,
      dispose: vi.fn(),
      get domElement() {
        return document.createElement("canvas");
      },
    })),
    Vector3: vi.fn((x = 0, y = 0, z = 0) => ({
      x: x as number,
      y: y as number,
      z: z as number,
      clone: vi.fn(() => ({ x: x as number, y: y as number, z: z as number })),
      set: vi.fn(),
    })),
    Color: vi.fn(() => ({
      setHSL: vi.fn().mockReturnThis(),
      r: 0,
      g: 0,
      b: 0,
    })),
    SpotLight: vi.fn(() => ({
      position: { set: vi.fn() },
      castShadow: false,
      angle: 0,
      penumbra: 0,
      shadow: {
        mapSize: { width: 0, height: 0 },
        camera: { near: 0, far: 0, fov: 0 },
      },
    })),
    PointLight: vi.fn(() => ({
      position: { set: vi.fn() },
      castShadow: false,
    })),
    DirectionalLight: vi.fn(() => ({
      position: { set: vi.fn() },
      castShadow: false,
    })),
    AmbientLight: vi.fn(() => ({})),
    Mesh: vi.fn(() => ({
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      rotation: { set: vi.fn(), x: 0, y: 0, z: 0 },
      castShadow: false,
      receiveShadow: false,
      frustumCulled: true,
      material: {},
    })),
    Group: vi.fn(() => ({
      add: vi.fn(),
      position: { set: vi.fn(), x: 0, y: 0, z: 0 },
      rotation: { set: vi.fn(), x: 0, y: 0, z: 0 },
    })),
    SphereGeometry: vi.fn(() => ({})),
    MeshStandardMaterial: vi.fn(() => ({
      emissive: {},
      emissiveIntensity: 0,
      roughness: 0,
      metalness: 0,
      userData: {},
    })),
    TextureLoader: vi.fn(() => ({
      load: vi.fn(() => ({})),
    })),
    CanvasTexture: vi.fn(() => ({})),
  };
}
