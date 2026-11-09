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

    // shuffle is mocked and random picks take the first candidate, so the
    // seeded mix is viruses[0] and viruses[1]
    vi.spyOn(Math, 'random').mockReturnValue(0);
    playlist = new Playlist();

    const savedMixesModule = await import('../../utils/savedMixes');
    loadSavedMixesMock = savedMixesModule.loadSavedMixes as Mock;
    saveMixesMock = savedMixesModule.saveMixes as Mock;

    loadSavedMixesMock.mockReturnValue([]);
    saveMixesMock.mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.textContent = '';
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it("should set container className to 'virus-lab'", () => {
      new VirusLab(container, playlist);
      expect(container.className).toBe('virus-lab');
    });

    it('should create primary and secondary iframes', () => {
      new VirusLab(container, playlist);
      const iframes = container.querySelectorAll('iframe');
      expect(iframes.length).toBe(2);
    });

    it('should seed the current virus with a different random one, without advancing the playlist', () => {
      const lab = new VirusLab(container, playlist);

      const iframes = container.querySelectorAll('iframe');
      expect(iframes[0].src).toContain('/viruses/random-shapes/');
      expect(iframes[1].src).toContain('/viruses/sphere/');
      expect(playlist.current()).toBe('random-shapes');

      expect(lab.getCurrentMix()).toBeUndefined();
    });

    it('should seed two registered viruses when the current entry is a mix', () => {
      playlist.setCurrentVirus('premix:sphere-uzumaki');
      new VirusLab(container, playlist);

      const iframes = container.querySelectorAll('iframe');
      expect(iframes[0].src).toContain('/viruses/random-shapes/');
      expect(iframes[1].src).toContain('/viruses/sphere/');
      expect(
        (document.getElementById('primary-virus') as HTMLSelectElement).value
      ).toBe('random-shapes');
      expect(
        (document.getElementById('secondary-virus') as HTMLSelectElement).value
      ).toBe('sphere');
      expect(playlist.current()).toBe('premix:sphere-uzumaki');
    });
  });

  describe('applyMix', () => {
    it('should set iframe src URLs for primary and secondary viruses', () => {
      new VirusLab(container, playlist);

      const iframes = container.querySelectorAll('iframe');
      const primaryVirus = playlist.viruses[0];
      const secondaryVirus = playlist.viruses[1];

      expect(iframes[0].src).toContain(`/viruses/${primaryVirus}/`);
      expect(iframes[1].src).toContain(`/viruses/${secondaryVirus}/`);
    });

    it('should set mix blend mode and opacity on secondary iframe', () => {
      new VirusLab(container, playlist);

      const iframes = container.querySelectorAll('iframe');
      const secondaryIframe = iframes[1];

      expect(secondaryIframe.style.mixBlendMode).toBe('screen');
      expect(secondaryIframe.style.opacity).toBe('0.5');
    });
  });

  describe('saveMix', () => {
    it('should save a new mix to localStorage', () => {
      const lab = new VirusLab(container, playlist);

      (priv(lab).saveMix as () => void)();

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

      const lab = new VirusLab(container, playlist);

      // saveMix calls loadSavedMixesFromStorage again to check for duplicates
      loadSavedMixesMock.mockReturnValue([existingMix]);

      (priv(lab).saveMix as () => void)();

      expect(saveMixesMock).not.toHaveBeenCalled();

      const errorMessage = container.querySelector('.save-message.error');
      expect(errorMessage).not.toBeNull();
      expect(errorMessage!.textContent).toBe(
        'This mix has already been saved!'
      );
    });

    it('should handle storage failure', () => {
      saveMixesMock.mockReturnValue(false);

      const lab = new VirusLab(container, playlist);

      (priv(lab).saveMix as () => void)();

      expect(saveMixesMock).toHaveBeenCalled();
      const errorMessage = container.querySelector('.save-message.error');
      expect(errorMessage).not.toBeNull();
      expect(errorMessage!.textContent).toBe(
        'Failed to save mix. Storage may be full.'
      );
    });

    it('should auto-remove the temporary message after 2 seconds', () => {
      saveMixesMock.mockReturnValue(false);
      const lab = new VirusLab(container, playlist);

      (priv(lab).saveMix as () => void)();

      expect(container.querySelector('.save-message')).not.toBeNull();
      vi.advanceTimersByTime(2000);
      expect(container.querySelector('.save-message')).toBeNull();
    });
  });

  describe('loadMix', () => {
    it('should update current mix and apply it', () => {
      const lab = new VirusLab(container, playlist);

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

    it('should sync cached control refs when loading a saved mix', () => {
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
      const lab = new VirusLab(container, playlist);

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
      const lab = new VirusLab(container, playlist);

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

      const lab = new VirusLab(container, playlist);

      (priv(lab).deleteMix as (id: number) => void)(1);

      expect(saveMixesMock).toHaveBeenCalledWith([
        { primary: 'doors', secondary: 'emoji', mixRatio: 0.7, id: 2 },
      ]);
    });

    it('should show error message when storage fails on delete', () => {
      const savedMixes = [
        { primary: 'sphere', secondary: 'cubes', mixRatio: 0.5, id: 1 },
      ];
      loadSavedMixesMock.mockReturnValue(savedMixes);

      const lab = new VirusLab(container, playlist);
      saveMixesMock.mockReturnValue(false);

      (priv(lab).deleteMix as (id: number) => void)(1);

      expect(saveMixesMock).toHaveBeenCalled();
      const errorMessage = container.querySelector('.save-message.error');
      expect(errorMessage).not.toBeNull();
      expect(errorMessage!.textContent).toBe('Failed to delete mix.');
    });
  });

  describe('updateSavedMixesList XSS regression', () => {
    it('should not execute HTML embedded in mix.name from localStorage', () => {
      const malicious = {
        primary: 'sphere',
        secondary: 'uzumaki',
        mixRatio: 0.5,
        id: 1,
        name: '<img src=x onerror="window.__xssFired=true">',
      };
      loadSavedMixesMock.mockReturnValue([malicious]);
      const w = window as Window & { __xssFired?: boolean };
      delete w.__xssFired;

      new VirusLab(container, playlist);

      expect(w.__xssFired).toBeUndefined();

      const label = container.querySelector('.saved-mix span');
      expect(label).not.toBeNull();
      expect(label!.textContent).toBe(malicious.name);
      expect(container.querySelector('.saved-mix img')).toBeNull();
    });
  });
});
