import { vi } from "vitest";
import { createThreeMocks } from "./test-utils/create-three-mocks";

// Type for requestAnimationFrame callback
type FrameRequestCallback = (time: number) => void;

// Mock Three.js modules using shared mock factories
vi.mock("three", async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  const actual = (await vi.importActual("three")) as any;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const mocks = createThreeMocks();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...actual,
    ...mocks,
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
    tagName,
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
} as unknown as Document;

global.window =
  global.window ||
  ({
    innerWidth: 1920,
    innerHeight: 1080,
    devicePixelRatio: 1,
    addEventListener: vi.fn(),
    requestAnimationFrame: vi.fn((cb: FrameRequestCallback) => {
      setTimeout(() => cb(0), 16);
      return 1;
    }),
  } as unknown as Window);
