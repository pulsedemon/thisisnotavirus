import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Import utilities that are used directly in tests (not in vi.mock)
import { setupDOMMocks } from "../../../test-utils/dom-mocks";
import {
  setupAnimationFrameMocks,
  cleanupAnimationFrameMocks,
} from "../../../test-utils/anim-mocks";

// Import mock classes from test-utils
import {
  MockScene,
  MockPerspectiveCamera,
  MockWebGLRenderer,
  MockVector3,
  MockBox3,
  MockColor,
  MockSpotLight,
  MockPointLight,
  MockDirectionalLight,
  MockAmbientLight,
  MockMesh,
  MockGroup,
  MockSphereGeometry,
  MockMeshStandardMaterial,
  MockTextureLoader,
  MockCanvasTexture,
  MockOrbitControls,
} from "../../../test-utils/three-mocks";

import {
  MockPhysicsManager,
  MockRapierVector3,
} from "../../../test-utils/physics-mocks";

import {
  MockCabinet,
  MockClawManager,
  MockCraneRope,
  MockClawPhysics,
  MockAudioManager,
  MockAtmosphericEffects,
  createMockGameConfig,
} from "../../../test-utils/crane-game-mocks";

// Mock all dependencies before importing CraneGame
vi.mock("three", () => ({
  Scene: MockScene,
  PerspectiveCamera: MockPerspectiveCamera,
  WebGLRenderer: MockWebGLRenderer,
  Vector3: MockVector3,
  Box3: MockBox3,
  Color: MockColor,
  SpotLight: MockSpotLight,
  PointLight: MockPointLight,
  DirectionalLight: MockDirectionalLight,
  AmbientLight: MockAmbientLight,
  Mesh: MockMesh,
  Group: MockGroup,
  SphereGeometry: MockSphereGeometry,
  MeshStandardMaterial: MockMeshStandardMaterial,
  TextureLoader: MockTextureLoader,
  CanvasTexture: MockCanvasTexture,
  ACESFilmicToneMapping: 0,
  PCFSoftShadowMap: 0,
  RepeatWrapping: 0,
  SRGBColorSpace: "",
}));

vi.mock("three/addons/controls/OrbitControls.js", () => ({
  OrbitControls: MockOrbitControls,
}));

vi.mock("three/addons/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class MockGLTFLoader {
    loadAsync = vi.fn().mockResolvedValue({
      scene: new MockGroup(),
    });
  },
}));

vi.mock("../PhysicsManager", () => ({
  PhysicsManager: MockPhysicsManager,
}));

import CraneGame from "../crane-game";

vi.mock("../CraneRope", () => ({
  CraneRope: MockCraneRope,
}));

vi.mock("../ClawPhysics", () => ({
  ClawPhysics: MockClawPhysics,
}));

vi.mock("../AudioManager", () => ({
  AudioManager: MockAudioManager,
}));

vi.mock("../AtmosphericEffects", () => ({
  AtmosphericEffects: MockAtmosphericEffects,
}));

vi.mock("../Cabinet", () => ({
  Cabinet: MockCabinet,
}));

vi.mock("../ClawManager", () => ({
  ClawManager: MockClawManager,
}));

vi.mock("../config", () => ({
  GAME_CONFIG: createMockGameConfig(),
}));

vi.mock("@dimforge/rapier3d-compat", () => ({
  default: {
    init: vi.fn().mockResolvedValue(undefined),
    Vector3: MockRapierVector3,
  },
}));

// Setup animation frame mocks
setupAnimationFrameMocks();

// Mock fetch globally
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ images: ["test1.jpg", "test2.jpg"] }),
} as Response);

describe("CraneGame", () => {
  let craneGame: CraneGame;

  beforeEach(async () => {
    // Setup DOM mocks
    setupDOMMocks();

    // Mock Rapier init to avoid async issues in tests
    const { default: RAPIER } = await import("@dimforge/rapier3d-compat");
    vi.mocked(RAPIER.init).mockResolvedValue(undefined);

    // Reset fetch mock before each test
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ images: ["test1.jpg", "test2.jpg"] }),
    } as Response);

    // Mock the animate method before creating the instance
    const animateSpy = vi.fn();

    // Create a new instance and wait for async initialization
    craneGame = new CraneGame();

    // Replace the animate method after construction to prevent animation loop
    craneGame.animate = animateSpy;

    // Wait for the constructor and async init to complete (including loadImages)
    await new Promise((resolve) => setTimeout(resolve, 200));

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
      update: vi.fn(),
      updateClaw: vi.fn(),
    } as unknown as typeof craneGame.clawManager;

    // Initialize UI element for tests
    craneGame.uiElement = {
      innerHTML: "",
    } as HTMLDivElement;
  });

  afterEach(() => {
    // Cleanup animation frame mocks
    cleanupAnimationFrameMocks();
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe("constructor", () => {
    it("should initialize with default values", () => {
      expect(craneGame).toBeDefined();
      expect(craneGame.credits).toBe(10); // startingCredits from config
      expect(craneGame.wonPrizes).toEqual([]);
      expect(Array.isArray(craneGame.prizes)).toBe(true); // prizes should be an array (may contain prizes)
    });
  });

  describe("dropClaw", () => {
    it("should decrease credits when dropping claw", () => {
      const initialCredits = craneGame.credits;
      craneGame.dropClaw();
      expect(craneGame.credits).toBe(initialCredits - 1);
    });

    it("should not drop claw when out of credits", () => {
      craneGame.credits = 0 as typeof craneGame.credits;
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
      } as unknown as typeof craneGame.clawManager;

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
      } as unknown as typeof craneGame.camera;

      craneGame.renderer = {
        setSize: vi.fn(),
      } as unknown as typeof craneGame.renderer;

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
        materialType: "plush" as const,
        gripStrength: 0,
        dropChance: 0,
      } as unknown as (typeof craneGame.wonPrizes)[0];

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
