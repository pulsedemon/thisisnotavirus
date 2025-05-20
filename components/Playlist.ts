import { shuffle } from "../utils/misc";

interface VirusMix {
  primary: string;
  secondary: string;
  mixRatio: number;
  id?: number;
  name?: string;
}

export default class Playlist {
  viruses = [
    "random-shapes",
    "sphere",
    "uzumaki",
    "random-characters",
    "buttons",
    "faces",
    "doors",
    "emoji",
    "cubes",
  ];

  playlist: string[] = [];
  currentIndex = 0;
  savedMixes: VirusMix[] = [];

  constructor() {
    this.loadSavedMixes();
    this.generatePlaylist();
  }

  loadSavedMixes() {
    const savedMixesStr = localStorage.getItem("savedVirusMixes");
    try {
      this.savedMixes = JSON.parse(savedMixesStr || "[]");
    } catch (e) {
      console.error("Error parsing saved mixes:", e);
      this.savedMixes = [];
    }
    // Regenerate playlist when saved mixes change
    this.generatePlaylist();
  }

  generatePlaylist() {
    // Create a list of all available items (viruses + mixes)
    const allItems: string[] = [...this.viruses];

    // Add saved mixes to the available items
    if (this.savedMixes.length > 0) {
      const mixIds = this.savedMixes
        .map((mix) => {
          if (!mix.id) {
            console.error("Mix missing ID:", mix);
            return null;
          }
          return `mixed:${mix.id}`;
        })
        .filter((id): id is string => id !== null);
      allItems.push(...mixIds);
    }

    // Generate playlist by shuffling all items
    this.playlist = [];
    for (let i = 0; i < 10; i++) {
      const shuffledItems = shuffle([...allItems]);
      const lastItemInPlaylist = this.playlist[this.playlist.length - 1];
      if (lastItemInPlaylist === shuffledItems[0]) {
        const firstItem = shuffledItems.shift();
        shuffledItems.push(firstItem!);
      }
      this.playlist.push(...shuffledItems);
    }
  }

  current(): string {
    if (typeof this.playlist[this.currentIndex] === "undefined") {
      this.currentIndex = 0;
    }
    const current = this.playlist[this.currentIndex];
    return current;
  }

  prev(): string {
    let prevIndex = this.currentIndex - 1;
    if (prevIndex === -1) {
      prevIndex = this.playlist.length - 1;
    }
    this.currentIndex = prevIndex;
    return this.current();
  }

  next(): string {
    const nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.playlist.length) {
      this.currentIndex = 0;
    } else {
      this.currentIndex = nextIndex;
    }
    return this.current();
  }

  isMixedVirus(virus: string): boolean {
    const isMixed = virus.startsWith("mixed:");
    return isMixed;
  }

  getMixById(id: string): VirusMix | undefined {
    const mixId = parseInt(id.replace("mixed:", ""));
    const mix = this.savedMixes.find((mix) => mix.id === mixId);
    return mix;
  }
}
