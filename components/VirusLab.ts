import { VirusMix } from '../types/VirusMix';
import { createStyledIframe } from '../utils/iframe';
import { formatVirusName } from '../utils/misc';
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
  private displayOnly: boolean;
  private primarySelect: HTMLSelectElement | null = null;
  private secondarySelect: HTMLSelectElement | null = null;
  private mixRatioInput: HTMLInputElement | null = null;
  private eventListeners: {
    element: HTMLElement;
    type: string;
    handler: EventListener;
  }[] = [];

  constructor(container: HTMLElement, playlist: Playlist, displayOnly = false) {
    this.container = container;
    this.playlist = playlist;
    this.displayOnly = displayOnly;

    this.container.className = 'virus-lab';

    // Create iframes using utility functions
    this.primaryIframe = createStyledIframe();
    this.secondaryIframe = createStyledIframe(true);
    this.secondaryIframe.style.opacity = '0.5'; // Default opacity

    // Ensure iframes don't block interactions
    this.primaryIframe.style.pointerEvents = 'none';
    this.secondaryIframe.style.pointerEvents = 'none';

    // Add iframes to container
    this.container.appendChild(this.primaryIframe);
    this.container.appendChild(this.secondaryIframe);

    this.currentMix = {
      primary: this.playlist.current(),
      secondary: this.playlist.next(),
      mixRatio: 0.5,
    };

    // Load saved mixes
    this.loadSavedMixes();

    if (!this.displayOnly) {
      this.initializeUI();
    }
    this.applyMix();
  }

  cleanup() {
    // Remove event listeners
    this.eventListeners.forEach(({ element, type, handler }) => {
      element.removeEventListener(type, handler);
    });
    this.eventListeners = [];

    // Remove iframes
    if (this.primaryIframe.parentNode) {
      this.primaryIframe.parentNode.removeChild(this.primaryIframe);
    }
    if (this.secondaryIframe.parentNode) {
      this.secondaryIframe.parentNode.removeChild(this.secondaryIframe);
    }

    // Clear cached refs
    this.primarySelect = null;
    this.secondarySelect = null;
    this.mixRatioInput = null;

    // Clear container
    this.container.innerHTML = '';
  }

  private loadSavedMixes() {
    this.savedMixes = loadSavedMixesFromStorage();
  }

  private initializeUI() {
    const controls = document.createElement('div');
    controls.className = 'virus-lab-controls';
    controls.innerHTML = controlsTemplate();

    // Ensure controls are interactive and properly positioned
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
    this.setupEventListeners();
    this.populateVirusSelects();
    this.updateSavedMixesList();
  }

  private setupEventListeners() {
    const { primarySelect, secondarySelect, mixRatioInput } = this;
    const saveButton = document.getElementById('save-mix');

    if (!primarySelect || !secondarySelect || !mixRatioInput) return;

    const primaryHandler = () => {
      this.currentMix.primary = primarySelect.value;
      this.applyMix();
    };
    const secondaryHandler = () => {
      this.currentMix.secondary = secondarySelect.value;
      this.applyMix();
    };
    const mixRatioHandler = () => {
      this.currentMix.mixRatio = parseFloat(mixRatioInput.value);
      this.secondaryIframe.style.mixBlendMode = 'screen';
      this.secondaryIframe.style.opacity = this.currentMix.mixRatio.toString();
    };
    const saveHandler = () => this.saveMix();

    primarySelect.addEventListener('change', primaryHandler);
    secondarySelect.addEventListener('change', secondaryHandler);
    mixRatioInput.addEventListener('input', mixRatioHandler);
    saveButton?.addEventListener('click', saveHandler);

    this.eventListeners.push(
      { element: primarySelect, type: 'change', handler: primaryHandler },
      { element: secondarySelect, type: 'change', handler: secondaryHandler },
      { element: mixRatioInput, type: 'input', handler: mixRatioHandler }
    );
    if (saveButton) {
      this.eventListeners.push({
        element: saveButton,
        type: 'click',
        handler: saveHandler,
      });
    }
  }

  private populateVirusSelects() {
    const { primarySelect, secondarySelect } = this;

    if (!primarySelect || !secondarySelect) return;

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
    // Load both viruses
    this.primaryIframe.src = `/viruses/${this.currentMix.primary}/`;
    this.secondaryIframe.src = `/viruses/${this.currentMix.secondary}/`;

    // Set initial opacity and ensure mix-blend-mode is set
    this.secondaryIframe.style.mixBlendMode = 'screen';
    this.secondaryIframe.style.opacity = this.currentMix.mixRatio.toString();
  }

  private saveMix() {
    const savedMixes = loadSavedMixesFromStorage();

    // Check for duplicates
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
      mixElement.innerHTML = `
        <span>${mix.name}</span>
        <div class="saved-mix-actions">
          <button class="load-mix" data-id="${mix.id}">Load</button>
          <button class="delete-mix" data-id="${mix.id}">Delete</button>
        </div>
      `;

      const loadButton = mixElement.querySelector('.load-mix');
      const deleteButton = mixElement.querySelector('.delete-mix');

      loadButton?.addEventListener('click', () => this.loadMix(mix));
      deleteButton?.addEventListener('click', () => this.deleteMix(mix.id!));

      savedMixesList.appendChild(mixElement);
    });
  }

  loadMix(mix: VirusMix) {
    this.currentMix = { ...mix };

    if (!this.displayOnly) {
      if (this.primarySelect) this.primarySelect.value = mix.primary;
      if (this.secondarySelect) this.secondarySelect.value = mix.secondary;
      if (this.mixRatioInput)
        this.mixRatioInput.value = mix.mixRatio.toString();
    }

    this.applyMix();
  }

  getCurrentMix(): VirusMix | undefined {
    // Return a copy of the current mix, ensuring it has an ID
    if (this.currentMix && this.currentMix.id) {
      return { ...this.currentMix };
    }
    return undefined;
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
