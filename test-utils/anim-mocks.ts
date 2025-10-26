import { vi } from "vitest";

// Type for requestAnimationFrame callback
type FrameRequestCallback = (time: number) => void;

let timeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Sets up mock requestAnimationFrame to prevent animation loops in tests
 *
 * This prevents infinite animation loops from running during tests by
 * converting requestAnimationFrame to a simple timeout. Call this once
 * at the module level or in beforeAll().
 */
export function setupAnimationFrameMocks() {
  global.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
    timeoutId = setTimeout(() => cb(0), 16);
    return 1; // Return a number like the real requestAnimationFrame
  });

  global.cancelAnimationFrame = vi.fn(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  });
}

/**
 * Cleans up animation frame mocks and pending timeouts
 *
 * Call this in afterEach() to ensure no pending animation frames
 * leak between tests.
 */
export function cleanupAnimationFrameMocks() {
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
}
