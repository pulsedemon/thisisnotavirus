import { vi } from 'vitest';

/**
 * Creates a mock DOM element with common properties
 *
 * @param tagName - The HTML tag name for the element (default: "div")
 * @returns A mock DOM element with common properties and methods
 */
export function createMockElement(tagName = 'div') {
  return {
    className: '',
    textContent: '',
    innerHTML: '',
    innerText: '',
    tagName,
    appendChild: vi.fn(),
    remove: vi.fn(),
    getContext: vi.fn().mockReturnValue({
      fillStyle: '',
      fillRect: vi.fn(),
      strokeStyle: '',
      lineWidth: 0,
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    }),
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
    },
    style: {},
  };
}

/**
 * Sets up global DOM mocks for testing
 *
 * This function mocks common DOM APIs like document.getElementById,
 * document.createElement, and document.body to work in a test environment.
 * Call this in beforeEach() to ensure a clean DOM state for each test.
 */
export function setupDOMMocks() {
  // Use direct assignment instead of vi.spyOn so vi.clearAllMocks() won't
  // restore these to jsdom's originals (which would break async code that
  // calls getElementById after test cleanup)
  document.getElementById = vi
    .fn()
    .mockReturnValue(createMockElement()) as typeof document.getElementById;
  document.createElement = vi
    .fn()
    .mockImplementation(createMockElement) as typeof document.createElement;
  vi.spyOn(document.body, 'appendChild').mockImplementation(
    vi.fn() as typeof document.body.appendChild
  );
}
