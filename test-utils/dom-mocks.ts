import { vi } from "vitest";

/**
 * Creates a mock DOM element with common properties
 *
 * @param tagName - The HTML tag name for the element (default: "div")
 * @returns A mock DOM element with common properties and methods
 */
export function createMockElement(tagName = "div") {
  return {
    className: "",
    textContent: "",
    innerHTML: "",
    innerText: "",
    tagName,
    appendChild: vi.fn(),
    remove: vi.fn(),
    getContext: vi.fn().mockReturnValue({
      fillStyle: "",
      fillRect: vi.fn(),
      strokeStyle: "",
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
  document.getElementById = vi.fn().mockReturnValue(createMockElement());
  document.createElement = vi.fn().mockImplementation(createMockElement);
  document.body = {
    appendChild: vi.fn(),
  } as unknown as HTMLBodyElement;
}
