export interface KeyboardControlMessage {
  type: string;
  enabled: boolean;
}

export function isKeyboardControlMessage(
  data: unknown
): data is KeyboardControlMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    'enabled' in data &&
    data.type === 'requestKeyboardControl' &&
    typeof data.enabled === 'boolean'
  );
}

export function requestKeyboardControl(enabled: boolean): void {
  if (window.parent !== window) {
    window.parent.postMessage(
      { type: 'requestKeyboardControl', enabled },
      window.location.origin
    );
  }
}

interface KeyboardEventMessage {
  type: string;
  eventType: string;
  key: string;
  code: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
}

function isKeyboardEventMessage(data: unknown): data is KeyboardEventMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    data.type === 'keyboardEvent' &&
    'eventType' in data &&
    'key' in data &&
    'code' in data &&
    typeof data.eventType === 'string' &&
    typeof data.key === 'string' &&
    typeof data.code === 'string'
  );
}

export function setupKeyboardControl(): () => void {
  requestKeyboardControl(true);

  const messageHandler = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (event.source !== window.parent) return;
    if (isKeyboardEventMessage(event.data)) {
      const { eventType, key, code, shiftKey, ctrlKey, altKey, metaKey } =
        event.data;

      const keyboardEvent = new KeyboardEvent(eventType, {
        key,
        code,
        shiftKey,
        ctrlKey,
        altKey,
        metaKey,
        bubbles: true,
        cancelable: true,
      });

      window.dispatchEvent(keyboardEvent);
    }
  };

  window.addEventListener('message', messageHandler);

  return () => {
    requestKeyboardControl(false);
    window.removeEventListener('message', messageHandler);
  };
}
