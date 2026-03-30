import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from 'vitest';
import Playlist from '../Playlist';
import VirusLab from '../VirusLab';

function priv(lab: VirusLab): Record<string, unknown> {
  return lab as unknown as Record<string, unknown>;
}

vi.mock('../../utils/iframe', () => ({
  createStyledIframe: vi.fn(() => {
    const iframe = document.createElement('iframe');
    return iframe;
  }),
}));

vi.mock('../../utils/savedMixes', () => ({
  loadSavedMixes: vi.fn(() => []),
  saveMixes: vi.fn(() => true),
}));

vi.mock('../../utils/misc', () => ({
  shuffle: vi.fn((arr: string[]) => arr),
  formatVirusName: vi.fn((name: string) =>
    name.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
  ),
}));

vi.mock('../templates/virus-lab-controls.hbs', () => ({
  default: vi.fn(
    () => `
      <div class="control-group">
        <select id="primary-virus"></select>
        <select id="secondary-virus"></select>
        <input id="mix-ratio" type="range" value="0.5" min="0" max="1" step="0.1" />
        <button id="save-mix" type="button">Save</button>
        <div id="saved-mixes-list"></div>
      </div>
    `
  ),
}));

describe('VirusLab', () => {
  let container: HTMLElement;
  let playlist: Playlist;
  let loadSavedMixesMock: Mock;
  let saveMixesMock: Mock;

  beforeEach(async () => {
    vi.useFakeTimers();

    container = document.createElement('div');
    document.body.appendChild(container);

    // Create a Playlist instance (shuffle is mocked so order is predictable)
    playlist = new Playlist();

    // Get mock references
    const savedMixesModule = await import('../../utils/savedMixes');
    loadSavedMixesMock = savedMixesModule.loadSavedMixes as Mock;
    saveMixesMock = savedMixesModule.saveMixes as Mock;

    // Reset mocks
    loadSavedMixesMock.mockReturnValue([]);
    saveMixesMock.mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.textContent = '';
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it("should set container className to 'virus-lab'", () => {
      new VirusLab(container, playlist, true);
      expect(container.className).toBe('virus-lab');
    });

    it('should create primary and secondary iframes', () => {
      new VirusLab(container, playlist, true);
      const iframes = container.querySelectorAll('iframe');
      expect(iframes.length).toBe(2);
    });

    it('should set initial mix to current and next virus', () => {
      const lab = new VirusLab(container, playlist, true);
      const currentVirus = playlist.viruses[0]; // shuffle is identity
      const nextVirus = playlist.viruses[1];

      // The iframes should be set to the current and next viruses
      const iframes = container.querySelectorAll('iframe');
      expect(iframes[0].src).toContain(`/viruses/${currentVirus}/`);
      expect(iframes[1].src).toContain(`/viruses/${nextVirus}/`);

      // getCurrentMix returns undefined since no id is set
      expect(lab.getCurrentMix()).toBeUndefined();
    });
  });

  describe('applyMix', () => {
    it('should set iframe src URLs for primary and secondary viruses', () => {
      new VirusLab(container, playlist, true);

      const iframes = container.querySelectorAll('iframe');
      const primaryVirus = playlist.viruses[0];
      const secondaryVirus = playlist.viruses[1];

      expect(iframes[0].src).toContain(`/viruses/${primaryVirus}/`);
      expect(iframes[1].src).toContain(`/viruses/${secondaryVirus}/`);
    });

    it('should set mix blend mode and opacity on secondary iframe', () => {
      new VirusLab(container, playlist, true);

      const iframes = container.querySelectorAll('iframe');
      const secondaryIframe = iframes[1];

      expect(secondaryIframe.style.mixBlendMode).toBe('screen');
      expect(secondaryIframe.style.opacity).toBe('0.5');
    });
  });

  describe('saveMix', () => {
    it('should save a new mix to localStorage', () => {
      const lab = new VirusLab(container, playlist, true);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (lab as any).saveMix();

      expect(saveMixesMock).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            primary: playlist.viruses[0],
            secondary: playlist.viruses[1],
            mixRatio: 0.5,
          }),
        ])
      );
    });

    it('should show error for duplicate mixes', () => {
      const existingMix = {
        primary: playlist.viruses[0],
        secondary: playlist.viruses[1],
        mixRatio: 0.5,
        id: 1,
      };
      loadSavedMixesMock.mockReturnValue([existingMix]);

      const lab = new VirusLab(container, playlist, true);

      // saveMix calls loadSavedMixesFromStorage again to check for duplicates
      loadSavedMixesMock.mockReturnValue([existingMix]);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (lab as any).saveMix();

      // Should NOT call saveMixes because it's a duplicate
      expect(saveMixesMock).not.toHaveBeenCalled();

      // Should show error message
      const errorMessage = container.querySelector('.save-message.error');
      expect(errorMessage).not.toBeNull();
      expect(errorMessage!.textContent).toBe(
        'This mix has already been saved!'
      );
    });

    it('should handle storage failure', () => {
      saveMixesMock.mockReturnValue(false);

      const lab = new VirusLab(container, playlist, true);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (lab as any).saveMix();

      expect(saveMixesMock).toHaveBeenCalled();

      // Should show storage error message
      const errorMessage = container.querySelector('.save-message.error');
      expect(errorMessage).not.toBeNull();
      expect(errorMessage!.textContent).toBe(
        'Failed to save mix. Storage may be full.'
      );
    });
  });

  describe('loadMix', () => {
    it('should update current mix and apply it', () => {
      const lab = new VirusLab(container, playlist, true);

      const mix = {
        primary: 'doors',
        secondary: 'emoji',
        mixRatio: 0.7,
        id: 42,
      };
      lab.loadMix(mix);

      const iframes = container.querySelectorAll('iframe');
      expect(iframes[0].src).toContain('/viruses/doors/');
      expect(iframes[1].src).toContain('/viruses/emoji/');
      expect(iframes[1].style.opacity).toBe('0.7');
    });

    it('should sync cached control refs when loading a saved mix in interactive mode', () => {
      const lab = new VirusLab(container, playlist);

      const mix = {
        primary: 'doors',
        secondary: 'emoji',
        mixRatio: 0.7,
        id: 42,
      };
      lab.loadMix(mix);

      const primarySelect = container.querySelector(
        '#primary-virus'
      ) as HTMLSelectElement;
      const secondarySelect = container.querySelector(
        '#secondary-virus'
      ) as HTMLSelectElement;
      const mixRatioInput = container.querySelector(
        '#mix-ratio'
      ) as HTMLInputElement;

      expect(primarySelect.value).toBe('doors');
      expect(secondarySelect.value).toBe('emoji');
      expect(mixRatioInput.value).toBe('0.7');
    });
  });

  describe('interactive controls', () => {
    it('should update the active mix when cached controls fire events', () => {
      const lab = new VirusLab(container, playlist);

      const primarySelect = container.querySelector(
        '#primary-virus'
      ) as HTMLSelectElement;
      const secondarySelect = container.querySelector(
        '#secondary-virus'
      ) as HTMLSelectElement;
      const mixRatioInput = container.querySelector(
        '#mix-ratio'
      ) as HTMLInputElement;

      primarySelect.value = 'doors';
      primarySelect.dispatchEvent(new Event('change'));
      secondarySelect.value = 'emoji';
      secondarySelect.dispatchEvent(new Event('change'));
      mixRatioInput.value = '0.7';
      mixRatioInput.dispatchEvent(new Event('input'));

      expect(priv(lab).currentMix).toMatchObject({
        primary: 'doors',
        secondary: 'emoji',
        mixRatio: 0.7,
      });
    });
  });

  describe('getCurrentMix', () => {
    it('should return a copy of current mix with id', () => {
      const lab = new VirusLab(container, playlist, true);

      const mix = {
        primary: 'sphere',
        secondary: 'cubes',
        mixRatio: 0.5,
        id: 123,
      };
      lab.loadMix(mix);

      const result = lab.getCurrentMix();
      expect(result).toEqual(mix);

      // Should be a copy, not the same reference
      expect(result).not.toBe(mix);
    });

    it('should return undefined if mix has no id', () => {
      const lab = new VirusLab(container, playlist, true);

      // The initial mix has no id
      const result = lab.getCurrentMix();
      expect(result).toBeUndefined();
    });
  });

  describe('deleteMix', () => {
    it('should remove mix from saved mixes', () => {
      const savedMixes = [
        { primary: 'sphere', secondary: 'cubes', mixRatio: 0.5, id: 1 },
        { primary: 'doors', secondary: 'emoji', mixRatio: 0.7, id: 2 },
      ];
      loadSavedMixesMock.mockReturnValue(savedMixes);

      const lab = new VirusLab(container, playlist, true);

      // Delete mix with id 1
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (lab as any).deleteMix(1);

      expect(saveMixesMock).toHaveBeenCalledWith([
        { primary: 'doors', secondary: 'emoji', mixRatio: 0.7, id: 2 },
      ]);
    });
  });

  describe('cleanup', () => {
    it('should clear cached control refs on cleanup', () => {
      const lab = new VirusLab(container, playlist);

      lab.cleanup();

      expect(priv(lab).primarySelect).toBeNull();
      expect(priv(lab).secondarySelect).toBeNull();
      expect(priv(lab).mixRatioInput).toBeNull();
    });

    it('should remove event listeners and iframes', () => {
      const lab = new VirusLab(container, playlist, true);

      const iframesBefore = container.querySelectorAll('iframe');
      expect(iframesBefore.length).toBe(2);

      lab.cleanup();

      const iframesAfter = container.querySelectorAll('iframe');
      expect(iframesAfter.length).toBe(0);
    });

    it('should clear container', () => {
      const lab = new VirusLab(container, playlist, true);

      expect(container.childNodes.length).toBeGreaterThan(0);

      lab.cleanup();

      expect(container.childNodes.length).toBe(0);
    });
  });
});
