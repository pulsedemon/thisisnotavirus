export function requestKeyboardControl(enabled: boolean): void {
  if (window.parent !== window) {
    window.parent.postMessage({ type: "requestKeyboardControl", enabled }, "*");
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
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "keyboardEvent" &&
    "eventType" in data &&
    "key" in data &&
    "code" in data &&
    typeof data.eventType === "string" &&
    typeof data.key === "string" &&
    typeof data.code === "string"
  );
}

export function setupKeyboardControl(): () => void {
  requestKeyboardControl(true);

  const messageHandler = (event: MessageEvent) => {
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

  window.addEventListener("message", messageHandler);

  return () => {
    requestKeyboardControl(false);
    window.removeEventListener("message", messageHandler);
  };
}
