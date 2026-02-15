import { vi } from 'vitest';
import { createThreeMocks } from './test-utils/create-three-mocks';

// Mock Three.js modules using shared mock factories
vi.mock('three', async () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  const actual = (await vi.importActual('three')) as any;
  const mocks = createThreeMocks();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...actual,
    ...mocks,
    ACESFilmicToneMapping: 0,
    PCFSoftShadowMap: 0,
    RepeatWrapping: 0,
    SRGBColorSpace: '',
  };
});

// Mock Rapier physics
vi.mock('@dimforge/rapier3d-compat', () => ({
  default: {
    init: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock global objects
Object.defineProperty(window, 'innerWidth', { value: 1920 });
Object.defineProperty(window, 'innerHeight', { value: 1080 });
Object.defineProperty(window, 'devicePixelRatio', { value: 1 });
