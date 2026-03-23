import { VirusMix } from '../types/VirusMix';
import { shuffle } from '../utils/misc';
import { loadSavedMixes as loadSavedMixesFromStorage } from '../utils/savedMixes';

export default class Playlist {
  viruses = [
    'random-shapes',
    'sphere',
    'uzumaki',
    'random-characters',
    'buttons',
    'faces',
    'doors',
    'emoji',
    'cubes',
    'static',
    'shitstorm',
    'void',
    'crane-game',
    'sky',
  ];

  premixes: VirusMix[] = [
    {
      primary: 'sphere',
      secondary: 'uzumaki',
      mixRatio: 0.5,
      name: 'sphere-uzumaki',
    },
  ];

  playlist: string[] = [];
  currentIndex = 0;
  savedMixes: VirusMix[] = [];

  constructor() {
    this.loadSavedMixes();
  }

  loadSavedMixes() {
    this.savedMixes = loadSavedMixesFromStorage();
    // Regenerate playlist when saved mixes change
    this.generatePlaylist();
  }

  private getAllItems(): string[] {
    const allItems: string[] = [...this.viruses];

    const premixIds = this.premixes
      .map(mix => (mix.name ? `premix:${mix.name}` : null))
      .filter((id): id is string => id !== null);
    allItems.push(...premixIds);

    if (this.savedMixes.length > 0) {
      const mixIds = this.savedMixes
        .map(mix => {
          if (!mix.id) {
            console.error('Mix missing ID:', mix);
            return null;
          }
          return `mixed:${mix.id}`;
        })
        .filter((id): id is string => id !== null);
      allItems.push(...mixIds);
    }

    return allItems;
  }

  private appendBatch() {
    // Trim played items to prevent unbounded growth
    if (this.currentIndex > 0) {
      this.playlist = this.playlist.slice(this.currentIndex);
      this.currentIndex = 0;
    }

    const shuffledItems = shuffle([...this.getAllItems()]);
    const lastItemInPlaylist = this.playlist[this.playlist.length - 1];
    if (lastItemInPlaylist === shuffledItems[0]) {
      const firstItem = shuffledItems.shift();
      shuffledItems.push(firstItem!);
    }
    this.playlist.push(...shuffledItems);
  }

  generatePlaylist() {
    this.playlist = [];
    this.currentIndex = 0;
    this.appendBatch();
  }

  current(): string {
    if (this.playlist.length === 0) {
      this.generatePlaylist();
    }
    if (typeof this.playlist[this.currentIndex] === 'undefined') {
      this.currentIndex = 0;
    }
    const current = this.playlist[this.currentIndex];
    return current;
  }

  prev(): string {
    if (this.playlist.length === 0) {
      this.generatePlaylist();
    }
    let prevIndex = this.currentIndex - 1;
    if (prevIndex === -1) {
      prevIndex = this.playlist.length - 1;
    }
    this.currentIndex = prevIndex;
    return this.current();
  }

  next(): string {
    if (this.playlist.length === 0) {
      this.generatePlaylist();
    }
    this.currentIndex++;
    if (this.currentIndex >= this.playlist.length) {
      this.appendBatch();
    }
    return this.current();
  }

  isMixedVirus(virus: string): boolean {
    return virus.startsWith('mixed:') || virus.startsWith('premix:');
  }

  getMixById(id: string): VirusMix | undefined {
    const mixId = parseInt(id.replace('mixed:', ''));
    if (isNaN(mixId)) return undefined;
    return this.savedMixes.find(mix => mix.id === mixId);
  }

  getPremixByName(name: string): VirusMix | undefined {
    const mixName = name.replace('premix:', '');
    return this.premixes.find(mix => mix.name === mixName);
  }

  /**
   * Sets the current virus in the playlist directly
   * This allows the mix to be properly referenced by playlist.current()
   */
  setCurrentVirus(virusId: string): void {
    // Find the index of this virus in the playlist
    const index = this.playlist.indexOf(virusId);

    if (index !== -1) {
      this.currentIndex = index;
    } else {
      this.playlist.splice(this.currentIndex, 0, virusId);
    }
  }
}
