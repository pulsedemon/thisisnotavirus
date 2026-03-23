import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLabButton, createThumbnailButton } from '../floating-buttons';
import Playlist from '../../components/Playlist';

vi.mock('../../components/VirusThumbnailOverlay', () => ({
  showVirusThumbnailOverlay: vi.fn(),
}));

describe('floating-buttons', () => {
  const mockVirusLoader = {
    virusLab: null,
    loadRandomInterval: 0 as unknown as ReturnType<typeof setInterval>,
    loadVirus: vi.fn(),
    toggleLab: vi.fn(),
  };

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createLabButton', () => {
    it("should create button with id 'lab-btn'", () => {
      const button = createLabButton(mockVirusLoader);
      expect(button.id).toBe('lab-btn');
    });

    it('should append to document.body', () => {
      createLabButton(mockVirusLoader);
      const button = document.getElementById('lab-btn');
      expect(button).not.toBeNull();
      expect(document.body.contains(button)).toBe(true);
    });

    it('should call toggleLab on click', () => {
      const button = createLabButton(mockVirusLoader);
      button.click();
      expect(mockVirusLoader.toggleLab).toHaveBeenCalledOnce();
    });
  });

  describe('createThumbnailButton', () => {
    it("should create button with id 'thumbnail-btn'", () => {
      const playlist = {} as Playlist;
      const button = createThumbnailButton(mockVirusLoader, playlist);
      expect(button.id).toBe('thumbnail-btn');
    });

    it('should append to document.body', () => {
      const playlist = {} as Playlist;
      createThumbnailButton(mockVirusLoader, playlist);
      const button = document.getElementById('thumbnail-btn');
      expect(button).not.toBeNull();
      expect(document.body.contains(button)).toBe(true);
    });
  });
});
