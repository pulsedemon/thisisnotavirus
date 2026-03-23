import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  requestKeyboardControl,
  setupKeyboardControl,
} from '../keyboard-control';

describe('Keyboard Control', () => {
  describe('requestKeyboardControl', () => {
    let postMessageSpy: ReturnType<typeof vi.fn>;
    let originalParent: Window;

    beforeEach(() => {
      originalParent = window.parent;
      postMessageSpy = vi.fn();
    });

    afterEach(() => {
      // Restore window.parent
      Object.defineProperty(window, 'parent', {
        value: originalParent,
        writable: true,
        configurable: true,
      });
    });

    it('should post a message to parent when in an iframe', () => {
      const mockParent = {
        postMessage: postMessageSpy,
      } as unknown as Window;
      Object.defineProperty(window, 'parent', {
        value: mockParent,
        writable: true,
        configurable: true,
      });

      requestKeyboardControl(true);

      expect(postMessageSpy).toHaveBeenCalledWith(
        { type: 'requestKeyboardControl', enabled: true },
        window.location.origin
      );
    });

    it('should send enabled=false when disabling', () => {
      const mockParent = {
        postMessage: postMessageSpy,
      } as unknown as Window;
      Object.defineProperty(window, 'parent', {
        value: mockParent,
        writable: true,
        configurable: true,
      });

      requestKeyboardControl(false);

      expect(postMessageSpy).toHaveBeenCalledWith(
        { type: 'requestKeyboardControl', enabled: false },
        window.location.origin
      );
    });

    it('should not post message when window.parent === window (not in iframe)', () => {
      Object.defineProperty(window, 'parent', {
        value: window,
        writable: true,
        configurable: true,
      });

      const spy = vi.spyOn(window, 'postMessage');
      requestKeyboardControl(true);

      // Should not call postMessage since parent is self
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('setupKeyboardControl', () => {
    let postMessageSpy: ReturnType<typeof vi.fn>;
    let originalParent: Window;

    beforeEach(() => {
      originalParent = window.parent;
      postMessageSpy = vi.fn();

      const mockParent = {
        postMessage: postMessageSpy,
      } as unknown as Window;
      Object.defineProperty(window, 'parent', {
        value: mockParent,
        writable: true,
        configurable: true,
      });
    });

    afterEach(() => {
      Object.defineProperty(window, 'parent', {
        value: originalParent,
        writable: true,
        configurable: true,
      });
    });

    it('should call requestKeyboardControl(true) on setup', () => {
      const cleanup = setupKeyboardControl();

      expect(postMessageSpy).toHaveBeenCalledWith(
        { type: 'requestKeyboardControl', enabled: true },
        window.location.origin
      );

      cleanup();
    });

    it('should return a cleanup function', () => {
      const cleanup = setupKeyboardControl();
      expect(typeof cleanup).toBe('function');
      cleanup();
    });

    it('should call requestKeyboardControl(false) when cleanup is called', () => {
      const cleanup = setupKeyboardControl();
      postMessageSpy.mockClear();

      cleanup();

      expect(postMessageSpy).toHaveBeenCalledWith(
        { type: 'requestKeyboardControl', enabled: false },
        window.location.origin
      );
    });

    it('should ignore messages from a different origin', () => {
      const cleanup = setupKeyboardControl();
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      const messageEvent = new MessageEvent('message', {
        data: {
          type: 'keyboardEvent',
          eventType: 'keydown',
          key: 'a',
          code: 'KeyA',
          shiftKey: false,
          ctrlKey: false,
          altKey: false,
          metaKey: false,
        },
        origin: 'https://evil.com',
      });
      window.dispatchEvent(messageEvent);

      const keyboardDispatches = dispatchSpy.mock.calls.filter(
        call => call[0] instanceof KeyboardEvent
      );
      expect(keyboardDispatches).toHaveLength(0);

      dispatchSpy.mockRestore();
      cleanup();
    });

    it('should dispatch keyboard events from same origin', () => {
      const cleanup = setupKeyboardControl();
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      const messageEvent = new MessageEvent('message', {
        data: {
          type: 'keyboardEvent',
          eventType: 'keydown',
          key: 'a',
          code: 'KeyA',
          shiftKey: false,
          ctrlKey: false,
          altKey: false,
          metaKey: false,
        },
        origin: window.location.origin,
      });
      window.dispatchEvent(messageEvent);

      const keyboardDispatches = dispatchSpy.mock.calls.filter(
        call => call[0] instanceof KeyboardEvent
      );
      expect(keyboardDispatches).toHaveLength(1);

      dispatchSpy.mockRestore();
      cleanup();
    });

    it('should add and remove message event listener', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');

      const cleanup = setupKeyboardControl();

      expect(addSpy).toHaveBeenCalledWith('message', expect.any(Function));

      cleanup();

      expect(removeSpy).toHaveBeenCalledWith('message', expect.any(Function));

      // The same handler reference should be used for add and remove
      const addedHandler = addSpy.mock.calls.find(
        call => call[0] === 'message'
      )![1];
      const removedHandler = removeSpy.mock.calls.find(
        call => call[0] === 'message'
      )![1];
      expect(addedHandler).toBe(removedHandler);

      addSpy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
