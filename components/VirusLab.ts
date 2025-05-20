import Playlist from "./Playlist";

interface VirusMix {
  primary: string;
  secondary: string;
  mixRatio: number;
  id?: number;
  name?: string;
}

export default class VirusLab {
  private container: HTMLElement;
  private playlist: Playlist;
  private currentMix: VirusMix;
  private primaryIframe: HTMLIFrameElement;
  private secondaryIframe: HTMLIFrameElement;
  private savedMixes: VirusMix[] = [];
  private displayOnly: boolean;
  private eventListeners: {
    element: HTMLElement;
    type: string;
    handler: EventListener;
  }[] = [];

  constructor(container: HTMLElement, playlist: Playlist, displayOnly = false) {
    this.container = container;
    this.playlist = playlist;
    this.displayOnly = displayOnly;

    // Set container styles
    this.container.className = "virus-lab";
    this.container.style.position = "absolute";
    this.container.style.top = "0";
    this.container.style.left = "0";
    this.container.style.width = "100%";
    this.container.style.height = "100%";
    this.container.style.zIndex = "1";

    // Create iframes
    this.primaryIframe = document.createElement("iframe");
    this.secondaryIframe = document.createElement("iframe");

    // Style iframes
    [this.primaryIframe, this.secondaryIframe].forEach((iframe) => {
      iframe.style.width = "100%";
      iframe.style.height = "100%";
      iframe.style.border = "none";
      iframe.style.position = "absolute";
      iframe.style.top = "0";
      iframe.style.left = "0";
      iframe.style.background = "#000";
    });

    // Set specific styles for secondary iframe
    this.secondaryIframe.style.mixBlendMode = "screen";
    this.secondaryIframe.style.opacity = "0.5"; // Default opacity
    this.secondaryIframe.className = "secondary-virus";

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

    // Clear container
    this.container.innerHTML = "";
  }

  private loadSavedMixes() {
    this.savedMixes = JSON.parse(
      localStorage.getItem("savedVirusMixes") || "[]"
    );
  }

  private initializeUI() {
    const controls = document.createElement("div");
    controls.className = "virus-lab-controls";
    controls.innerHTML = `
      <div class="control-group">
        <label>Primary Virus</label>
        <select id="primary-virus"></select>
      </div>
      <div class="control-group">
        <label>Secondary Virus</label>
        <select id="secondary-virus"></select>
      </div>
      <div class="control-group">
        <label>Mix Ratio</label>
        <input type="range" id="mix-ratio" min="0" max="1" step="0.1" value="0.5">
      </div>
      <button id="save-mix">Save Mix</button>
      <div class="saved-mixes">
        <h3>Saved Mixes</h3>
        <div id="saved-mixes-list"></div>
      </div>
    `;

    this.container.appendChild(controls);
    this.setupEventListeners();
    this.populateVirusSelects();
    this.updateSavedMixesList();
  }

  private setupEventListeners() {
    const primarySelect = document.getElementById(
      "primary-virus"
    ) as HTMLSelectElement;
    const secondarySelect = document.getElementById(
      "secondary-virus"
    ) as HTMLSelectElement;
    const mixRatio = document.getElementById("mix-ratio") as HTMLInputElement;
    const saveButton = document.getElementById("save-mix");

    const primaryHandler = () => {
      this.currentMix.primary = primarySelect.value;
      this.applyMix();
    };
    const secondaryHandler = () => {
      this.currentMix.secondary = secondarySelect.value;
      this.applyMix();
    };
    const mixRatioHandler = () => {
      this.currentMix.mixRatio = parseFloat(mixRatio.value);
      this.secondaryIframe.style.mixBlendMode = "screen";
      this.secondaryIframe.style.opacity = this.currentMix.mixRatio.toString();
    };
    const saveHandler = () => this.saveMix();

    primarySelect.addEventListener("change", primaryHandler);
    secondarySelect.addEventListener("change", secondaryHandler);
    mixRatio.addEventListener("input", mixRatioHandler);
    saveButton?.addEventListener("click", saveHandler);

    this.eventListeners.push(
      { element: primarySelect, type: "change", handler: primaryHandler },
      { element: secondarySelect, type: "change", handler: secondaryHandler },
      { element: mixRatio, type: "input", handler: mixRatioHandler }
    );
    if (saveButton) {
      this.eventListeners.push({
        element: saveButton,
        type: "click",
        handler: saveHandler,
      });
    }
  }

  private populateVirusSelects() {
    const primarySelect = document.getElementById(
      "primary-virus"
    ) as HTMLSelectElement;
    const secondarySelect = document.getElementById(
      "secondary-virus"
    ) as HTMLSelectElement;

    this.playlist.viruses.forEach((virus) => {
      const option = document.createElement("option");
      option.value = virus;
      option.textContent = virus
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

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
    this.secondaryIframe.style.mixBlendMode = "screen";
    this.secondaryIframe.style.opacity = this.currentMix.mixRatio.toString();
  }

  private saveMix() {
    const savedMixes = JSON.parse(
      localStorage.getItem("savedVirusMixes") || "[]"
    );

    // Format virus names for display
    const formatVirusName = (name: string) => {
      return name.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    };

    // Check for duplicates
    const isDuplicate = savedMixes.some(
      (mix: VirusMix) =>
        mix.primary === this.currentMix.primary &&
        mix.secondary === this.currentMix.secondary &&
        mix.mixRatio === this.currentMix.mixRatio
    );

    if (isDuplicate) {
      // Show error message
      const message = document.createElement("div");
      message.className = "save-message error";
      message.textContent = "This mix has already been saved!";
      this.container.appendChild(message);
      setTimeout(() => message.remove(), 2000);
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
    localStorage.setItem("savedVirusMixes", JSON.stringify(savedMixes));
    this.savedMixes = savedMixes;
    this.updateSavedMixesList();
    this.playlist.loadSavedMixes();

    // Show success message
    const message = document.createElement("div");
    message.className = "save-message";
    message.textContent = "Mix saved successfully!";
    this.container.appendChild(message);
    setTimeout(() => message.remove(), 2000);
  }

  private updateSavedMixesList() {
    const savedMixesList = document.getElementById("saved-mixes-list");
    if (!savedMixesList) return;

    savedMixesList.innerHTML = "";

    this.savedMixes.forEach((mix) => {
      const mixElement = document.createElement("div");
      mixElement.className = "saved-mix";
      mixElement.innerHTML = `
        <span>${mix.name}</span>
        <div class="saved-mix-actions">
          <button class="load-mix" data-id="${mix.id}">Load</button>
          <button class="delete-mix" data-id="${mix.id}">Delete</button>
        </div>
      `;

      // Add event listeners
      const loadButton = mixElement.querySelector(".load-mix");
      const deleteButton = mixElement.querySelector(".delete-mix");

      loadButton?.addEventListener("click", () => this.loadMix(mix));
      deleteButton?.addEventListener("click", () => this.deleteMix(mix.id!));

      savedMixesList.appendChild(mixElement);
    });
  }

  loadMix(mix: VirusMix) {
    this.currentMix = { ...mix };

    if (!this.displayOnly) {
      // Update UI
      const primarySelect = document.getElementById(
        "primary-virus"
      ) as HTMLSelectElement;
      const secondarySelect = document.getElementById(
        "secondary-virus"
      ) as HTMLSelectElement;
      const mixRatio = document.getElementById("mix-ratio") as HTMLInputElement;

      primarySelect.value = mix.primary;
      secondarySelect.value = mix.secondary;
      mixRatio.value = mix.mixRatio.toString();
    }

    // Apply the mix
    this.applyMix();
  }

  private deleteMix(mixId: number) {
    const savedMixes = this.savedMixes.filter((mix) => mix.id !== mixId);
    localStorage.setItem("savedVirusMixes", JSON.stringify(savedMixes));
    this.savedMixes = savedMixes;
    this.updateSavedMixesList();
    this.playlist.loadSavedMixes();
  }
}
