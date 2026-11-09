import { showVirusThumbnailOverlay } from '../components/VirusThumbnailOverlay';
import Playlist from '../components/Playlist';
import { VirusLoaderInterface } from '../types/VirusLoaderInterface';

export function createLabButton(
  virusLoader: VirusLoaderInterface
): HTMLButtonElement {
  const labButton = document.createElement('button');
  labButton.id = 'lab-btn';
  labButton.textContent = '🧪';
  labButton.title = 'Virus Lab';
  labButton.className = 'lab-button';
  labButton.setAttribute('aria-label', 'Open Virus Lab');
  document.body.appendChild(labButton);

  labButton.addEventListener('click', () => virusLoader.toggleLab());

  return labButton;
}

export function createThumbnailButton(
  virusLoader: VirusLoaderInterface,
  playlist: Playlist
): HTMLButtonElement {
  const thumbBtn = document.createElement('button');
  thumbBtn.id = 'thumbnail-btn';
  thumbBtn.title = 'Gallery';
  thumbBtn.className = 'lab-button';
  thumbBtn.setAttribute('aria-label', 'Open Gallery');

  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined';
  icon.textContent = 'grid_view';
  thumbBtn.appendChild(icon);

  document.body.appendChild(thumbBtn);

  thumbBtn.onclick = () => {
    showVirusThumbnailOverlay({
      onSelect: virus => {
        virusLoader.pauseRandomization();
        playlist.loadSavedMixes();
        playlist.setCurrentVirus(virus);
        virusLoader.loadVirus(virus);
      },
      onClose: () => {
        // closing without a pick leaves rotation as it was
      },
      virusLoader: virusLoader,
    });
  };

  return thumbBtn;
}
