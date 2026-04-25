import type { VirusKeyboardEvent, VirusModule } from '../modules/VirusModule';
import { isKeyboardControlMessage } from '../../utils/keyboard-control';

type ActiveModuleProvider = () => VirusModule | null;

function noop(): void {
  /* default no-op for the optional control change listener */
}

/**
 * Routes keyboard events from the host page to the active virus module.
 *
 * - Native modules receive an `onKeyboard()` call directly.
 * - Iframe-backed modules continue using the existing `postMessage` protocol
 *   (set up by `IframeVirusModule` which surfaces an iframe whose
 *   `contentWindow` is what we forward to). The router itself doesn't know
 *   about iframes; modules that need DOM-level forwarding implement their
 *   own listener and call `setKeyboardControl(true)` via the dispatch hook.
 *
 * The router also listens for the `requestKeyboardControl` message a virus
 * uses to opt into receiving keyboard events.
 */
export default class KeyboardRouter {
  private getActiveModule: ActiveModuleProvider;
  private hasControl = false;
  private onControlChanged: (enabled: boolean) => void;
  private messageHandler = (ev: MessageEvent) => this.handleMessage(ev);
  private destroyed = false;

  constructor(
    getActiveModule: ActiveModuleProvider,
    onControlChanged: (enabled: boolean) => void = noop
  ) {
    this.getActiveModule = getActiveModule;
    this.onControlChanged = onControlChanged;
    window.addEventListener('message', this.messageHandler);
  }

  /** Surface keyboard control state to the controller (for iframe shim). */
  get keyboardControlEnabled(): boolean {
    return this.hasControl;
  }

  setKeyboardControl(enabled: boolean): void {
    if (this.hasControl === enabled) return;
    this.hasControl = enabled;
    this.onControlChanged(enabled);
  }

  /**
   * Routes a DOM keyboard event to the active module's `onKeyboard` if the
   * module declared `wantsKeyboard`, OR to the iframe shim via its own
   * forwarder. Returns true if the event was consumed by a module.
   */
  routeDom(event: KeyboardEvent, type: 'keydown' | 'keyup'): boolean {
    if (!this.hasControl) return false;
    const mod = this.getActiveModule();
    if (!mod) return false;
    const payload: VirusKeyboardEvent = {
      type,
      key: event.key,
      code: event.code,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
    };
    mod.onKeyboard?.(payload);
    return true;
  }

  private handleMessage(ev: MessageEvent): void {
    if (this.destroyed) return;
    if (ev.origin !== window.location.origin) return;
    if (isKeyboardControlMessage(ev.data)) {
      this.setKeyboardControl(ev.data.enabled);
    }
  }

  destroy(): void {
    this.destroyed = true;
    window.removeEventListener('message', this.messageHandler);
  }
}
