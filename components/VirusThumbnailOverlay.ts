import { VirusMix } from '../types/VirusMix';
import { VirusLoaderInterface } from '../types/VirusLoaderInterface';
import { escapeHtml } from '../utils/escapeHtml';
import { formatVirusName, isMobile } from '../utils/misc';
import { safeGtag } from '../utils/gtag';
import Playlist from './Playlist';

function formatMixEntry(mix: VirusMix, type: string, prefix: string) {
  const mixRatioPercent = Math.round(mix.mixRatio * 100);
  const label = `${formatVirusName(mix.primary)} / ${formatVirusName(mix.secondary)} (${mixRatioPercent}%)`;
  return {
    value: escapeHtml(`${prefix}:${type === 'premixed' ? mix.name : mix.id}`),
    label: escapeHtml(label),
    type,
    mix: {
      ...mix,
      primary: escapeHtml(mix.primary),
      secondary: escapeHtml(mix.secondary),
      mixRatioPercent,
    },
  };
}

function renderMixSection(
  title: string,
  cssClass: string,
  typeLabel: string,
  items: ReturnType<typeof formatMixEntry>[]
) {
  if (items.length === 0) return '';
  return `
        <div class="virus-section ${cssClass}">
          <h3 class="virus-section-title">${title}</h3>
          <div class="virus-thumbnail-grid ${isMobile() ? 'mobile' : ''}">
            ${items
              .map(
                virus => `
              <div class="virus-thumbnail-item custom-virus" data-virus="${virus.value}" tabindex="0" role="button" aria-label="Select ${virus.label} ${typeLabel} virus">
                <div class="virus-thumbnail-preview custom-preview">
                  <div class="custom-virus-display">
                    <div class="custom-virus-info">
                      <div class="custom-virus-components">
                        <span class="primary-virus">${virus.mix.primary}</span>
                        <span class="mix-symbol">\u26A1</span>
                        <span class="secondary-virus">${virus.mix.secondary}</span>
                      </div>
                      <div class="mix-ratio">${virus.mix.mixRatioPercent}%</div>
                    </div>
                  </div>
                  <div class="virus-thumbnail-overlay-hover">
                    <span class="play-icon">\u25B6</span>
                  </div>
                </div>
                <div class="virus-label custom-label">${virus.label}</div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
        `;
}

function trackVirusSelect(label: string, virus: string) {
  safeGtag('event', 'virus_select', {
    event_category: 'engagement',
    event_label: label,
    animation_name: virus,
  });
}

function trackOverlayClose(label: string) {
  safeGtag('event', 'virus_overlay_close', {
    event_category: 'engagement',
    event_label: label,
  });
}

interface VirusThumbnailOverlayOptions {
  onSelect: (virus: string) => void;
  onClose: () => void;
  virusLoader?: VirusLoaderInterface;
}

export class VirusThumbnailOverlay {
  private overlay: HTMLDivElement;
  private searchInput: HTMLInputElement;
  private filteredItems: HTMLElement[];
  private currentFocusIndex = -1;
  private abortController: AbortController;
  private observer: MutationObserver;
  private onSelect: (virus: string) => void;
  private onClose: () => void;
  private virusLoader?: VirusLoaderInterface;
  private touchStartY = 0;
  private isScrolling = false;
  private _destroyed = false;

  private premixedViruses: ReturnType<typeof formatMixEntry>[];
  private customViruses: ReturnType<typeof formatMixEntry>[];

  constructor(options: VirusThumbnailOverlayOptions) {
    this.onSelect = options.onSelect;
    this.onClose = options.onClose;
    this.virusLoader = options.virusLoader;
    this.abortController = new AbortController();

    // Track overlay open event
    safeGtag('event', 'virus_overlay_open', {
      event_category: 'engagement',
      event_label: 'virus_thumbnail_overlay',
    });

    // Remove any existing overlay
    const existing = document.getElementById('virus-thumbnail-overlay');
    if (existing) existing.remove();

    // Get virus list
    const playlist = new Playlist();
    const viruses = playlist.viruses.map(virus => ({
      value: virus,
      label: formatVirusName(virus),
      type: 'builtin',
    }));

    // Get premixed viruses (default mixes), filtering out any without a name
    this.premixedViruses = playlist.premixes
      .filter(mix => mix.name)
      .map(mix => formatMixEntry(mix, 'premixed', 'premix'));

    // Get custom viruses (saved mixes), filtering out any without an id
    this.customViruses = playlist.savedMixes
      .filter(mix => mix.id)
      .map(mix => formatMixEntry(mix, 'custom', 'mixed'));

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'virus-thumbnail-overlay';
    this.overlay.className = 'virus-overlay';
    this.overlay.innerHTML = this.buildOverlayHTML(viruses);

    // Get references to key elements
    this.searchInput = this.overlay.querySelector(
      '.virus-search'
    ) as HTMLInputElement;

    const thumbnailItems = this.overlay.querySelectorAll(
      '.virus-thumbnail-item'
    );
    this.filteredItems = Array.from(thumbnailItems) as HTMLElement[];

    // Set up all event listeners
    this.setupEventListeners();

    // Focus search input initially
    setTimeout(() => {
      this.searchInput.focus();
    }, 100);

    // Add overlay to DOM
    document.body.appendChild(this.overlay);

    // Prevent body scroll when overlay is open
    document.body.style.overflow = 'hidden';

    // Auto-cleanup when overlay is removed externally
    this.observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.removedNodes.forEach(node => {
          if (node === this.overlay) {
            this.destroy();
          }
        });
      });
    });
    this.observer.observe(document.body, { childList: true });
  }

  private buildOverlayHTML(
    viruses: { value: string; label: string; type: string }[]
  ): string {
    return `
    <div class="virus-overlay-header">
      <h2 class="virus-overlay-title">Select Virus</h2>
      <button class="virus-thumbnail-close" aria-label="Close overlay">
        X
      </button>
    </div>

    <div class="virus-overlay-content">
      <div class="virus-search-container">
        <input
          type="text"
          class="virus-search"
          placeholder="Search viruses..."
          aria-label="Search viruses"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
        />
        <span class="virus-search-icon">\uD83D\uDD0D</span>
      </div>

      <div class="virus-sections">
        <div class="virus-section">
          <div class="virus-section-title-wrapper">
            <h3 class="virus-section-title">Viruses</h3>
          </div>
          <div class="virus-thumbnail-grid ${isMobile() ? 'mobile' : ''}">
            ${viruses
              .map(
                virus => `
              <div class="virus-thumbnail-item" data-virus="${virus.value}" tabindex="0" role="button" aria-label="Select ${virus.label} virus">
                <div class="virus-thumbnail-preview">
                  <iframe
                    src="/viruses/${virus.value}/"
                    title="${virus.label} preview"
                    frameborder="0"
                    loading="lazy"
                    importance="low"
                  ></iframe>
                  <div class="virus-thumbnail-overlay-hover">
                    <span class="play-icon">\u25B6</span>
                  </div>
                </div>
                <div class="virus-label">${virus.label}</div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        ${renderMixSection('Premixed', 'premixed-viruses', 'premixed', this.premixedViruses)}

        ${renderMixSection('Mixes', 'custom-viruses', 'custom', this.customViruses)}
      </div>
    </div>
  `;
  }

  private setupEventListeners(): void {
    const signal = this.abortController.signal;

    const closeBtn = this.overlay.querySelector(
      '.virus-thumbnail-close'
    ) as HTMLButtonElement;

    // Search input
    this.searchInput.addEventListener(
      'input',
      (e: Event) => {
        const target = e.target as HTMLInputElement;
        this.filterItems(target.value);
      },
      { signal }
    );

    // Keyboard navigation on overlay
    this.overlay.addEventListener(
      'keydown',
      (e: KeyboardEvent) => {
        this.handleKeyNavigation(e);
      },
      { signal }
    );

    // Close button
    closeBtn.addEventListener(
      'click',
      (e: MouseEvent) => {
        e.stopPropagation();
        this.destroy();
        trackOverlayClose('close_button');
        this.onClose();
      },
      { signal }
    );

    // Background click
    this.overlay.addEventListener(
      'click',
      (e: MouseEvent) => {
        if (e.target === this.overlay) {
          this.destroy();
          trackOverlayClose('background_click');
          this.onClose();
        }
      },
      { signal }
    );

    // Thumbnail click, keydown, and touch events
    const thumbnailItems = this.overlay.querySelectorAll(
      '.virus-thumbnail-item'
    );
    thumbnailItems.forEach(thumbWrapper => {
      const htmlWrapper = thumbWrapper as HTMLElement;

      htmlWrapper.addEventListener(
        'click',
        (e: MouseEvent) => {
          e.stopPropagation();
          const virus = htmlWrapper.getAttribute('data-virus')!;
          this.handleVirusSelect(virus, 'thumbnail_click');
        },
        { signal }
      );

      htmlWrapper.addEventListener(
        'keydown',
        (e: KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const virus = htmlWrapper.getAttribute('data-virus')!;
            this.handleVirusSelect(virus, 'keyboard_select');
          }
        },
        { signal }
      );

      htmlWrapper.addEventListener(
        'touchstart',
        (e: TouchEvent) => {
          this.touchStartY = e.touches[0].clientY;
          this.isScrolling = false;
        },
        { signal }
      );

      htmlWrapper.addEventListener(
        'touchmove',
        (e: TouchEvent) => {
          const touchY = e.touches[0].clientY;
          const diff = this.touchStartY - touchY;
          if (Math.abs(diff) > 10) {
            this.isScrolling = true;
          }
        },
        { signal }
      );

      htmlWrapper.addEventListener(
        'touchend',
        () => {
          if (!this.isScrolling) {
            const virus = htmlWrapper.getAttribute('data-virus')!;
            this.handleVirusSelect(virus, 'touch_select');
          }
        },
        { signal }
      );
    });
  }

  private filterItems(searchTerm: string): void {
    const term = searchTerm.toLowerCase().trim();
    this.filteredItems = [];

    const allItems = this.overlay.querySelectorAll('.virus-thumbnail-item');
    allItems.forEach(item => {
      const htmlItem = item as HTMLElement;
      const virus = htmlItem.getAttribute('data-virus')!;
      let matches = false;

      if (virus.startsWith('mixed:') || virus.startsWith('premix:')) {
        // For mix viruses (custom or official), search in the label and component virus names
        const mixEntry = virus.startsWith('premix:')
          ? this.premixedViruses.find(om => om.value === virus)
          : this.customViruses.find(cv => cv.value === virus);
        if (mixEntry) {
          const label = mixEntry.label.toLowerCase();
          const primaryVirus = formatVirusName(
            mixEntry.mix.primary
          ).toLowerCase();
          const secondaryVirus = formatVirusName(
            mixEntry.mix.secondary
          ).toLowerCase();

          matches =
            label.includes(term) ||
            primaryVirus.includes(term) ||
            secondaryVirus.includes(term) ||
            mixEntry.mix.primary.toLowerCase().includes(term) ||
            mixEntry.mix.secondary.toLowerCase().includes(term);
        }
      } else {
        // For built-in viruses, search in formatted name and virus name
        const label = formatVirusName(virus).toLowerCase();
        matches = label.includes(term) || virus.toLowerCase().includes(term);
      }

      if (matches) {
        htmlItem.classList.remove('filtered-out');
        htmlItem.style.removeProperty('display');
        this.filteredItems.push(htmlItem);
      } else {
        htmlItem.classList.add('filtered-out');
      }
    });
  }

  private handleVirusSelect(virus: string, trackLabel: string): void {
    this.destroy();

    // Close lab if it's open
    if (this.virusLoader && this.virusLoader.virusLab) {
      this.virusLoader.toggleLab();
    }

    trackVirusSelect(trackLabel, virus);
    this.onSelect(virus);
  }

  private handleKeyNavigation(e: KeyboardEvent): void {
    if (this.filteredItems.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.currentFocusIndex =
          (this.currentFocusIndex + 1) % this.filteredItems.length;
        this.updateFocus(this.currentFocusIndex);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.currentFocusIndex =
          this.currentFocusIndex <= 0
            ? this.filteredItems.length - 1
            : this.currentFocusIndex - 1;
        this.updateFocus(this.currentFocusIndex);
        break;
      case 'ArrowRight': {
        if (document.activeElement === this.searchInput) return;
        e.preventDefault();
        const nextIndex = Math.min(
          this.currentFocusIndex + Math.floor(this.filteredItems.length / 4) ||
            1,
          this.filteredItems.length - 1
        );
        this.updateFocus(nextIndex);
        break;
      }
      case 'ArrowLeft': {
        if (document.activeElement === this.searchInput) return;
        e.preventDefault();
        const prevIndex = Math.max(
          this.currentFocusIndex - Math.floor(this.filteredItems.length / 4) ||
            1,
          0
        );
        this.updateFocus(prevIndex);
        break;
      }
      case 'Enter':
        if (
          this.currentFocusIndex >= 0 &&
          this.filteredItems[this.currentFocusIndex]
        ) {
          const virus =
            this.filteredItems[this.currentFocusIndex].getAttribute(
              'data-virus'
            )!;
          this.handleVirusSelect(virus, 'keyboard_enter');
        }
        break;
      case 'Escape':
        this.destroy();
        trackOverlayClose('escape_key');
        this.onClose();
        break;
      case '/':
        if (document.activeElement !== this.searchInput) {
          e.preventDefault();
          this.searchInput.focus();
        }
        break;
    }
  }

  private updateFocus(index: number): void {
    this.filteredItems.forEach((item, i) => {
      if (i === index) {
        item.focus();
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
    this.currentFocusIndex = index;
  }

  destroy(): void {
    if (this._destroyed) return;
    this._destroyed = true;
    this.abortController.abort();
    this.observer.disconnect();
    document.body.style.overflow = '';
    this.overlay.remove();
  }
}

export function showVirusThumbnailOverlay(options: {
  onSelect: (virus: string) => void;
  onClose: () => void;
  virusLoader?: VirusLoaderInterface;
}): VirusThumbnailOverlay {
  return new VirusThumbnailOverlay(options);
}
