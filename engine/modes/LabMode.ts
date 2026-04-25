import type Playlist from '../../components/Playlist';
import type { VirusMix } from '../../types/VirusMix';
import { formatVirusName } from '../../utils/misc';
import {
  loadSavedMixes as loadSavedMixesFromStorage,
  saveMixes,
} from '../../utils/savedMixes';
import controlsTemplate from '../../components/templates/virus-lab-controls.hbs';
import type {
  LayerBlend,
  VirusKeyboardEvent,
  VirusModule,
} from '../modules/VirusModule';
import IframeVirusModule from '../modules/IframeVirusModule';
import type { Mode, ModeContext, ModeEnterOptions } from './Mode';

/**
 * LabMode replicates the existing Virus Lab UX inside the unified engine:
 *   - Two iframe-backed modules side by side (primary + secondary)
 *   - A floating control panel for picking viruses and mix ratio
 *   - Persists user mixes to localStorage via `utils/savedMixes`
 *
 * Both modules share the Layer2D DOM root; the secondary iframe sits on top
 * with `mix-blend-mode: screen` and an opacity tied to the slider, identical
 * to the legacy VirusLab behaviour.
 */
export default class LabMode implements Mode {
  readonly name = 'lab';
  private ctx: ModeContext | null = null;
  private playlist: Playlist;
  private mix: VirusMix;
  private primary: IframeVirusModule | null = null;
  private secondary: IframeVirusModule | null = null;
  private controlsEl: HTMLElement | null = null;
  private listeners: { el: EventTarget; type: string; fn: EventListener }[] =
    [];
  private savedMixes: VirusMix[] = [];

  constructor(playlist: Playlist) {
    this.playlist = playlist;
    this.mix = {
      primary: playlist.current(),
      secondary: playlist.next(),
      mixRatio: 0.5,
    };
  }

  enter(ctx: ModeContext, _opts?: ModeEnterOptions): Promise<void> {
    this.ctx = ctx;
    ctx.setBlend({ layer2D: 1, layer3D: 0 });

    this.savedMixes = loadSavedMixesFromStorage();
    this.applyMix();
    this.buildControls();
    return Promise.resolve();
  }

  exit(): Promise<void> {
    this.tearDownControls();
    this.primary?.unmount();
    this.secondary?.unmount();
    this.primary = null;
    this.secondary = null;
    this.ctx = null;
    return Promise.resolve();
  }

  private applyMix(): void {
    if (!this.ctx) return;
    const layer2D = this.ctx.getLayer2DContext();

    this.primary?.unmount();
    this.secondary?.unmount();

    this.primary = new IframeVirusModule(this.mix.primary, {
      src: `/viruses/${this.mix.primary}/`,
      className: 'virus-iframe iframe-module lab-primary',
    });
    this.secondary = new IframeVirusModule(this.mix.secondary, {
      src: `/viruses/${this.mix.secondary}/`,
      className: 'virus-iframe iframe-module lab-secondary',
    });

    this.primary.mount({
      layer2D,
      clock: { elapsed: 0, delta: 0 },
    });
    this.secondary.mount({
      layer2D,
      clock: { elapsed: 0, delta: 0 },
    });

    this.applySecondaryStyling();
  }

  private applySecondaryStyling(): void {
    const iframe = this.secondary?.['iframe'] as HTMLIFrameElement | undefined;
    if (!iframe) return;
    iframe.style.mixBlendMode = 'screen';
    iframe.style.opacity = String(this.mix.mixRatio);
    iframe.style.zIndex = '2';
  }

  private buildControls(): void {
    if (!this.ctx) return;
    const root = this.ctx.getLayer2DContext().domRoot;
    const controls = document.createElement('div');
    controls.className = 'virus-lab-controls';
    // controlsTemplate() is a build-time Handlebars import — trusted source.
    controls.innerHTML = controlsTemplate();
    controls.style.pointerEvents = 'auto';
    controls.style.zIndex = '1000';
    controls.style.position = 'absolute';
    root.appendChild(controls);
    this.controlsEl = controls;

    const primarySelect =
      controls.querySelector<HTMLSelectElement>('#primary-virus');
    const secondarySelect =
      controls.querySelector<HTMLSelectElement>('#secondary-virus');
    const ratioInput = controls.querySelector<HTMLInputElement>('#mix-ratio');
    const saveBtn = controls.querySelector<HTMLElement>('#save-mix');

    if (!primarySelect || !secondarySelect || !ratioInput) return;

    this.populateSelect(primarySelect);
    this.populateSelect(secondarySelect);
    primarySelect.value = this.mix.primary;
    secondarySelect.value = this.mix.secondary;
    ratioInput.value = String(this.mix.mixRatio);

    const onPrimary = () => {
      this.mix.primary = primarySelect.value;
      this.applyMix();
    };
    const onSecondary = () => {
      this.mix.secondary = secondarySelect.value;
      this.applyMix();
    };
    const onRatio = () => {
      this.mix.mixRatio = parseFloat(ratioInput.value);
      this.applySecondaryStyling();
    };
    const onSave = () => this.saveCurrentMix();

    this.bind(primarySelect, 'change', onPrimary);
    this.bind(secondarySelect, 'change', onSecondary);
    this.bind(ratioInput, 'input', onRatio);
    if (saveBtn) this.bind(saveBtn, 'click', onSave);

    this.renderSavedMixes();
  }

  private populateSelect(sel: HTMLSelectElement): void {
    for (const v of this.playlist.viruses) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = formatVirusName(v);
      sel.appendChild(opt);
    }
  }

  private renderSavedMixes(): void {
    const list =
      this.controlsEl?.querySelector<HTMLElement>('#saved-mixes-list');
    if (!list) return;
    // Clear by removing all children — avoid innerHTML to prevent XSS via
    // saved mix names which originate from localStorage (user-controlled).
    while (list.firstChild) list.removeChild(list.firstChild);

    for (const m of this.savedMixes) {
      const item = document.createElement('div');
      item.className = 'saved-mix';

      const label = document.createElement('span');
      label.textContent =
        m.name ??
        `${formatVirusName(m.primary)} / ${formatVirusName(m.secondary)}`;

      const actions = document.createElement('div');
      actions.className = 'saved-mix-actions';

      const loadBtn = document.createElement('button');
      loadBtn.className = 'load-mix';
      loadBtn.textContent = 'Load';
      this.bind(loadBtn, 'click', () => this.loadMix(m));

      const delBtn = document.createElement('button');
      delBtn.className = 'delete-mix';
      delBtn.textContent = 'Delete';
      if (m.id !== undefined) {
        const id = m.id;
        this.bind(delBtn, 'click', () => this.deleteMix(id));
      }

      actions.appendChild(loadBtn);
      actions.appendChild(delBtn);
      item.appendChild(label);
      item.appendChild(actions);
      list.appendChild(item);
    }
  }

  private saveCurrentMix(): void {
    const all = loadSavedMixesFromStorage();
    const dup = all.some(
      m =>
        m.primary === this.mix.primary &&
        m.secondary === this.mix.secondary &&
        m.mixRatio === this.mix.mixRatio
    );
    if (dup) {
      this.flashMessage('This mix has already been saved!', true);
      return;
    }
    const newMix: VirusMix = {
      ...this.mix,
      id: Date.now(),
      name: `${formatVirusName(this.mix.primary)} / ${formatVirusName(
        this.mix.secondary
      )} (${Math.round(this.mix.mixRatio * 100)}%)`,
    };
    all.push(newMix);
    if (!saveMixes(all)) {
      this.flashMessage('Failed to save mix. Storage may be full.', true);
      return;
    }
    this.savedMixes = all;
    this.playlist.loadSavedMixes();
    this.renderSavedMixes();
    this.flashMessage('Mix saved successfully!', false);
  }

  private deleteMix(id: number): void {
    const next = this.savedMixes.filter(m => m.id !== id);
    if (!saveMixes(next)) {
      this.flashMessage('Failed to delete mix.', true);
      return;
    }
    this.savedMixes = next;
    this.playlist.loadSavedMixes();
    this.renderSavedMixes();
  }

  private loadMix(mix: VirusMix): void {
    this.mix = { ...mix };
    const primarySelect =
      this.controlsEl?.querySelector<HTMLSelectElement>('#primary-virus');
    const secondarySelect =
      this.controlsEl?.querySelector<HTMLSelectElement>('#secondary-virus');
    const ratio =
      this.controlsEl?.querySelector<HTMLInputElement>('#mix-ratio');
    if (primarySelect) primarySelect.value = mix.primary;
    if (secondarySelect) secondarySelect.value = mix.secondary;
    if (ratio) ratio.value = String(mix.mixRatio);
    this.applyMix();
  }

  private flashMessage(text: string, isError: boolean): void {
    if (!this.controlsEl) return;
    const message = document.createElement('div');
    message.className = isError ? 'save-message error' : 'save-message';
    message.textContent = text;
    this.controlsEl.appendChild(message);
    setTimeout(() => message.remove(), 2000);
  }

  private bind(el: EventTarget, type: string, fn: EventListener): void {
    el.addEventListener(type, fn);
    this.listeners.push({ el, type, fn });
  }

  private tearDownControls(): void {
    for (const { el, type, fn } of this.listeners)
      el.removeEventListener(type, fn);
    this.listeners = [];
    this.controlsEl?.remove();
    this.controlsEl = null;
  }

  tick(dt: number, _elapsed: number): void {
    const blend: LayerBlend = { layer2D: 1, layer3D: 0 };
    this.primary?.update(dt, blend);
    this.secondary?.update(dt, blend);
  }

  advance(_id: string): Promise<void> {
    /* lab is user-driven; playlist advance does nothing while lab is open. */
    return Promise.resolve();
  }

  onKeyboard(_event: VirusKeyboardEvent): void {
    /* lab consumes UI input directly; iframes don't receive forwarded keys. */
  }

  currentId(): string | null {
    return null;
  }

  activeModule(): VirusModule | null {
    return null;
  }

  getCurrentMix(): VirusMix {
    return { ...this.mix };
  }

  resize(_w: number, _h: number): void {
    /* iframes scale via CSS */
  }
}
