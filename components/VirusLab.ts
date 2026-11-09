import { VirusMix } from '../types/VirusMix';
import { createStyledIframe } from '../utils/iframe';
import { formatVirusName } from '../utils/misc';
import { randomItem } from '../utils/random';
import {
  loadSavedMixes as loadSavedMixesFromStorage,
  saveMixes,
} from '../utils/savedMixes';
import Playlist from './Playlist';
import controlsTemplate from './templates/virus-lab-controls.hbs';

export default class VirusLab {
  private container: HTMLElement;
  private playlist: Playlist;
  private currentMix: VirusMix;
  private primaryIframe: HTMLIFrameElement;
  private secondaryIframe: HTMLIFrameElement;
  private savedMixes: VirusMix[] = [];
  private primarySelect: HTMLSelectElement | null = null;
  private secondarySelect: HTMLSelectElement | null = null;
  private mixRatioInput: HTMLInputElement | null = null;

  constructor(container: HTMLElement, playlist: Playlist) {
    this.container = container;
    this.playlist = playlist;

    this.container.className = 'virus-lab';

    this.primaryIframe = createStyledIframe();
    this.secondaryIframe = createStyledIframe(true);
    this.secondaryIframe.style.opacity = '0.5';

    this.primaryIframe.style.pointerEvents = 'none';
    this.secondaryIframe.style.pointerEvents = 'none';

    this.container.appendChild(this.primaryIframe);
    this.container.appendChild(this.secondaryIframe);

    // the playlist also holds mix ids, which can't be mixed again
    const { viruses } = this.playlist;
    const current = this.playlist.current();
    const primary = viruses.includes(current) ? current : randomItem(viruses);
    this.currentMix = {
      primary,
      secondary: randomItem(viruses.filter(virus => virus !== primary)),
      mixRatio: 0.5,
    };

    this.loadSavedMixes();
    this.initializeUI();
    this.applyMix();
  }

  private loadSavedMixes() {
    this.savedMixes = loadSavedMixesFromStorage();
  }

  private initializeUI() {
    const controls = document.createElement('div');
    controls.className = 'virus-lab-controls';
    controls.innerHTML = controlsTemplate();

    controls.style.pointerEvents = 'auto';
    controls.style.zIndex = '1000';
    controls.style.position = 'absolute';

    this.container.appendChild(controls);
    this.primarySelect = document.getElementById(
      'primary-virus'
    ) as HTMLSelectElement | null;
    this.secondarySelect = document.getElementById(
      'secondary-virus'
    ) as HTMLSelectElement | null;
    this.mixRatioInput = document.getElementById(
      'mix-ratio'
    ) as HTMLInputElement | null;

    if (!this.primarySelect || !this.secondarySelect || !this.mixRatioInput) {
      console.error(
        'VirusLab: control elements not found after template render'
      );
      return;
    }

    this.setupEventListeners();
    this.populateVirusSelects();
    this.updateSavedMixesList();
  }

  private setupEventListeners() {
    const primarySelect = this.primarySelect!;
    const secondarySelect = this.secondarySelect!;
    const mixRatioInput = this.mixRatioInput!;

    primarySelect.addEventListener('change', () => {
      this.currentMix.primary = primarySelect.value;
      this.applyMix();
    });
    secondarySelect.addEventListener('change', () => {
      this.currentMix.secondary = secondarySelect.value;
      this.applyMix();
    });
    mixRatioInput.addEventListener('input', () => {
      this.currentMix.mixRatio = parseFloat(mixRatioInput.value);
      this.secondaryIframe.style.mixBlendMode = 'screen';
      this.secondaryIframe.style.opacity = this.currentMix.mixRatio.toString();
    });
    document
      .getElementById('save-mix')
      ?.addEventListener('click', () => this.saveMix());
  }

  private populateVirusSelects() {
    const primarySelect = this.primarySelect!;
    const secondarySelect = this.secondarySelect!;

    this.playlist.viruses.forEach(virus => {
      const option = document.createElement('option');
      option.value = virus;
      option.textContent = formatVirusName(virus);

      primarySelect.appendChild(option.cloneNode(true));
      secondarySelect.appendChild(option);
    });

    primarySelect.value = this.currentMix.primary;
    secondarySelect.value = this.currentMix.secondary;
  }

  private applyMix() {
    this.primaryIframe.src = `/viruses/${this.currentMix.primary}/`;
    this.secondaryIframe.src = `/viruses/${this.currentMix.secondary}/`;

    this.secondaryIframe.style.mixBlendMode = 'screen';
    this.secondaryIframe.style.opacity = this.currentMix.mixRatio.toString();
  }

  private saveMix() {
    const savedMixes = loadSavedMixesFromStorage();

    const isDuplicate = savedMixes.some(
      (mix: VirusMix) =>
        mix.primary === this.currentMix.primary &&
        mix.secondary === this.currentMix.secondary &&
        mix.mixRatio === this.currentMix.mixRatio
    );

    if (isDuplicate) {
      this.showTemporaryMessage('This mix has already been saved!', true);
      return;
    }

    const newMix = {
      ...this.currentMix,
      id: Date.now(),
      name: `${formatVirusName(this.currentMix.primary)} / ${formatVirusName(
        this.currentMix.secondary
      )} (${Math.round(this.currentMix.mixRatio * 100)}%)`,
    };

    savedMixes.push(newMix);
    if (!saveMixes(savedMixes)) {
      this.showTemporaryMessage(
        'Failed to save mix. Storage may be full.',
        true
      );
      return;
    }
    this.savedMixes = savedMixes;
    this.updateSavedMixesList();
    this.playlist.loadSavedMixes();

    this.showTemporaryMessage('Mix saved successfully!');
  }

  private updateSavedMixesList() {
    const savedMixesList = document.getElementById('saved-mixes-list');
    if (!savedMixesList) return;

    savedMixesList.innerHTML = '';

    this.savedMixes.forEach(mix => {
      const mixElement = document.createElement('div');
      mixElement.className = 'saved-mix';

      const label = document.createElement('span');
      label.textContent = mix.name ?? '';

      const actions = document.createElement('div');
      actions.className = 'saved-mix-actions';

      const loadButton = document.createElement('button');
      loadButton.className = 'load-mix';
      loadButton.textContent = 'Load';
      loadButton.addEventListener('click', () => this.loadMix(mix));

      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-mix';
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => this.deleteMix(mix.id!));

      actions.append(loadButton, deleteButton);
      mixElement.append(label, actions);
      savedMixesList.appendChild(mixElement);
    });
  }

  loadMix(mix: VirusMix) {
    this.currentMix = { ...mix };

    if (this.primarySelect) this.primarySelect.value = mix.primary;
    if (this.secondarySelect) this.secondarySelect.value = mix.secondary;
    if (this.mixRatioInput) this.mixRatioInput.value = mix.mixRatio.toString();

    this.applyMix();
  }

  getCurrentMix(): VirusMix | undefined {
    return this.currentMix.id ? { ...this.currentMix } : undefined;
  }

  private showTemporaryMessage(text: string, isError = false): void {
    const message = document.createElement('div');
    message.className = isError ? 'save-message error' : 'save-message';
    message.textContent = text;
    this.container.appendChild(message);
    setTimeout(() => message.remove(), 2000);
  }

  private deleteMix(mixId: number) {
    const savedMixes = this.savedMixes.filter(mix => mix.id !== mixId);
    if (!saveMixes(savedMixes)) {
      this.showTemporaryMessage('Failed to delete mix.', true);
      return;
    }
    this.savedMixes = savedMixes;
    this.updateSavedMixesList();
    this.playlist.loadSavedMixes();
  }
}
