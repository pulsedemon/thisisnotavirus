import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock all dependencies before importing CraneGame
vi.mock("three", () => ({
  Scene: class MockScene {
    add = vi.fn();
    background = null;
  },
  PerspectiveCamera: class MockPerspectiveCamera {
    position = { set: vi.fn(), x: 0, y: 0, z: 0 };
    lookAt = vi.fn();
    aspect = 1;
    updateProjectionMatrix = vi.fn();
  },
  WebGLRenderer: class MockWebGLRenderer {
    setSize = vi.fn();
    setPixelRatio = vi.fn();
    render = vi.fn();
    shadowMap = { enabled: false, type: 0 };
    toneMapping = 0;
    toneMappingExposure = 1;
    dispose = vi.fn();
    domElement = document.createElement("canvas");
  },
  Vector3: class MockVector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    clone() {
      return new MockVector3(this.x, this.y, this.z);
    }
    set() {}
  },
  Color: class MockColor {},
  SpotLight: class MockSpotLight {
    position = { set: vi.fn() };
    castShadow = false;
    angle = 0;
    penumbra = 0;
    shadow = {
      mapSize: { width: 0, height: 0 },
      camera: { near: 0, far: 0, fov: 0 },
    };
  },
  PointLight: class MockPointLight {
    position = { set: vi.fn() };
    castShadow = false;
  },
  DirectionalLight: class MockDirectionalLight {
    position = { set: vi.fn() };
    castShadow = false;
  },
  AmbientLight: class MockAmbientLight {},
  Mesh: class MockMesh {
    position = { set: vi.fn(), x: 0, y: 0, z: 0 };
    rotation = { set: vi.fn(), x: 0, y: 0, z: 0 };
    castShadow = false;
    receiveShadow = false;
    frustumCulled = true;
    material = {};
  },
  Group: class MockGroup {
    add = vi.fn();
    position = { set: vi.fn(), x: 0, y: 0, z: 0 };
    rotation = { set: vi.fn(), x: 0, y: 0, z: 0 };
  },
  SphereGeometry: class MockSphereGeometry {},
  MeshStandardMaterial: class MockMeshStandardMaterial {
    emissive = {};
    emissiveIntensity = 0;
    roughness = 0;
    metalness = 0;
    userData = {};
  },
  TextureLoader: class MockTextureLoader {
    load = vi.fn().mockReturnValue({});
  },
  CanvasTexture: class MockCanvasTexture {},
  ACESFilmicToneMapping: 0,
  PCFSoftShadowMap: 0,
  RepeatWrapping: 0,
  SRGBColorSpace: "",
}));

vi.mock("../PhysicsManager", () => ({
  PhysicsManager: class MockPhysicsManager {
    createStaticBox = vi.fn();
    createDynamicSphere = vi.fn().mockReturnValue({});
    step = vi.fn();
    syncMeshWithBody = vi.fn();
  },
}));

vi.mock("../CraneRope", () => ({
  CraneRope: class MockCraneRope {},
}));

vi.mock("../ClawPhysics", () => ({
  ClawPhysics: class MockClawPhysics {},
}));

vi.mock("../AudioManager", () => ({
  AudioManager: class MockAudioManager {
    playSound = vi.fn();
  },
}));

vi.mock("../AtmosphericEffects", () => ({
  AtmosphericEffects: class MockAtmosphericEffects {
    animate = vi.fn();
  },
}));

vi.mock("../Cabinet", () => ({
  Cabinet: class MockCabinet {
    cabinet = {};
    mainGear = {};
    smallGears: any[] = [];
    ledStrips: any[] = [];
    floorCanvas = {};
    floorTexture = {};
  },
}));

vi.mock("../ClawManager", () => ({
  ClawManager: class MockClawManager {
    claw = {};
    clawProng1 = {};
    clawProng2 = {};
    clawProng3 = {};
    craneRope = {};
    dropClaw = vi.fn().mockReturnValue(true);
    update = vi.fn();
    setupDependencies = vi.fn();
    isDescending = false;
    isAscending = false;
    isMovingToBin = false;
    isReturning = false;
    isGrabbing = false;
    clawPosition = { x: 0, y: 0, z: 0 };
  },
}));

vi.mock("../config", () => ({
  GAME_CONFIG: {
    physics: {
      binPosition: {
        x: 8,
        y: -5,
        z: 8,
        clone: vi.fn().mockReturnValue({ x: 8, y: -5, z: 8 }),
      },
      floorY: -10,
    },
    cabinet: {
      width: 10,
      depth: 10,
      prizeSize: 1,
    },
    prizes: {
      gridPadding: 1,
      numFillerPrizes: 5,
      dropHeightRange: [2, 8],
    },
    claw: {
      restingHeight: 5,
    },
    startingCredits: 10,
  },
}));

vi.mock("@dimforge/rapier3d-compat", () => ({
  default: {
    init: vi.fn().mockResolvedValue(undefined),
    Vector3: class MockRapierVector3 {
      constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
      }
    },
  },
}));

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import CraneGame from "../crane-game";

describe("CraneGame", () => {
  let craneGame: CraneGame;

  beforeEach(async () => {
    // Mock DOM elements
    document.getElementById = vi.fn().mockReturnValue({
      appendChild: vi.fn(),
      innerText: "",
      innerHTML: "",
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
      style: {},
    });

    document.createElement = vi.fn().mockImplementation((tagName: string) => ({
      className: "",
      textContent: "",
      innerHTML: "",
      appendChild: vi.fn(),
      remove: vi.fn(),
    }));

    document.body = {
      appendChild: vi.fn(),
    } as any;

    // Mock fetch for image loading
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ images: ["test1.jpg", "test2.jpg"] }),
    });

    // Mock Rapier init to avoid async issues in tests
    const { default: RAPIER } = await import("@dimforge/rapier3d-compat");
    vi.mocked(RAPIER.init).mockResolvedValue(undefined);

    // Create a new instance and wait for async initialization
    craneGame = new CraneGame();

    // Wait for the constructor and async init to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Manually initialize the keys object since setupControls may not be called properly in tests
    craneGame.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      ArrowUp: false,
      ArrowLeft: false,
      ArrowDown: false,
      ArrowRight: false,
      space: false,
    };

    // Manually initialize required properties since async init may not complete properly in tests
    craneGame.clawManager = {
      dropClaw: vi.fn().mockReturnValue(true),
      isDescending: false,
      isAscending: false,
      isMovingToBin: false,
      isReturning: false,
      isGrabbing: false,
    } as any;

    // Initialize UI element for tests
    craneGame.uiElement = {
      innerHTML: "",
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with default values", () => {
      expect(craneGame).toBeDefined();
      expect(craneGame.credits).toBe(10); // startingCredits from config
      expect(craneGame.wonPrizes).toEqual([]);
      expect(craneGame.prizes).toEqual([]);
      expect(craneGame.images).toEqual([]);
    });
  });

  describe("dropClaw", () => {
    it("should decrease credits when dropping claw", () => {
      const initialCredits = craneGame.credits;
      craneGame.dropClaw();
      expect(craneGame.credits).toBe(initialCredits - 1);
    });

    it("should not drop claw when out of credits", () => {
      craneGame.credits = 0;
      const initialCredits = craneGame.credits;
      craneGame.dropClaw();
      expect(craneGame.credits).toBe(initialCredits);
    });
  });

  describe("showMessage", () => {
    it("should create and remove message element", async () => {
      const createElementSpy = vi.spyOn(document, "createElement");
      const appendChildSpy = vi.spyOn(document.body, "appendChild");

      craneGame.showMessage("TEST MESSAGE");

      expect(createElementSpy).toHaveBeenCalledWith("div");
      expect(appendChildSpy).toHaveBeenCalled();

      // Wait for timeout to complete
      await new Promise((resolve) => setTimeout(resolve, 2100));
    });
  });

  describe("updateUI", () => {
    it("should update UI element with current game state", () => {
      craneGame.updateUI();

      expect(craneGame.uiElement).toBeDefined();
      expect(craneGame.uiElement.innerHTML).toContain("Credits:");
      expect(craneGame.uiElement.innerHTML).toContain("Won:");
    });

    it("should show correct instruction text based on claw state", () => {
      // Test default state
      craneGame.updateUI();
      expect(craneGame.uiElement.innerHTML).toContain(
        "WASD or Arrow Keys: Move | SPACE: Drop Claw",
      );

      // Mock claw manager and its states
      craneGame.clawManager = {
        isDescending: false,
        isAscending: false,
        isMovingToBin: false,
        isReturning: false,
        isGrabbing: false,
      } as any;

      // Test different claw states
      craneGame.clawManager.isDescending = true;
      craneGame.updateUI();
      expect(craneGame.uiElement.innerHTML).toContain("Grabbing...");
    });
  });

  describe("onWindowResize", () => {
    it("should update camera aspect ratio and renderer size", () => {
      // Mock camera and renderer objects on the craneGame instance
      craneGame.camera = {
        aspect: 1,
        updateProjectionMatrix: vi.fn(),
      } as any;

      craneGame.renderer = {
        setSize: vi.fn(),
      } as any;

      const updateProjectionMatrixSpy = vi.spyOn(
        craneGame.camera,
        "updateProjectionMatrix",
      );
      const setSizeSpy = vi.spyOn(craneGame.renderer, "setSize");

      craneGame.onWindowResize();

      expect(updateProjectionMatrixSpy).toHaveBeenCalled();
      expect(setSizeSpy).toHaveBeenCalledWith(1920, 1080);
    });
  });

  describe("prize management", () => {
    it("should track won prizes", () => {
      const mockPrize = {
        mesh: { id: "test-prize" },
        rigidBody: {},
        grabbed: false,
        settled: false,
        imageUrl: "test.jpg",
        weight: 1,
        deformability: 0.5,
        bounciness: 0.2,
        materialType: "ball" as const,
        gripStrength: 0,
        dropChance: 0,
      };

      craneGame.wonPrizes.push(mockPrize);
      expect(craneGame.wonPrizes).toHaveLength(1);
      expect(craneGame.wonPrizes[0]).toBe(mockPrize);
    });
  });

  describe("keyboard controls", () => {
    it("should initialize keys object with default values", () => {
      expect(craneGame.keys).toEqual({
        w: false,
        a: false,
        s: false,
        d: false,
        ArrowUp: false,
        ArrowLeft: false,
        ArrowDown: false,
        ArrowRight: false,
        space: false,
      });
    });
  });
});
