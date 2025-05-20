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
    console.log("Initializing Playlist");
    this.loadSavedMixes();
    this.generatePlaylist();
  }

  loadSavedMixes() {
    const savedMixesStr = localStorage.getItem("savedVirusMixes");
    console.log("Raw saved mixes from localStorage:", savedMixesStr);
    try {
      this.savedMixes = JSON.parse(savedMixesStr || "[]");
      console.log("Successfully parsed saved mixes:", this.savedMixes);
      if (this.savedMixes.length > 0) {
        console.log("First saved mix:", this.savedMixes[0]);
      }
    } catch (e) {
      console.error("Error parsing saved mixes:", e);
      this.savedMixes = [];
    }
    // Regenerate playlist when saved mixes change
    this.generatePlaylist();
  }

  generatePlaylist() {
    console.log(
      "Generating playlist with",
      this.savedMixes.length,
      "saved mixes"
    );

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

    console.log("Final playlist length:", this.playlist.length);
  }

  current(): string {
    if (typeof this.playlist[this.currentIndex] === "undefined") {
      console.log("Current index out of bounds, resetting to 0");
      this.currentIndex = 0;
    }
    const current = this.playlist[this.currentIndex];
    console.log("Current virus:", current, "at index:", this.currentIndex);
    return current;
  }

  prev(): string {
    let prevIndex = this.currentIndex - 1;
    if (prevIndex === -1) {
      console.log("Reached start of playlist, wrapping to end");
      prevIndex = this.playlist.length - 1;
    }
    this.currentIndex = prevIndex;
    return this.current();
  }

  next(): string {
    const nextIndex = this.currentIndex + 1;
    if (nextIndex >= this.playlist.length) {
      console.log("Reached end of playlist, wrapping to start");
      this.currentIndex = 0;
    } else {
      this.currentIndex = nextIndex;
    }
    return this.current();
  }

  isMixedVirus(virus: string): boolean {
    const isMixed = virus.startsWith("mixed:");
    console.log("Checking if mixed virus:", virus, isMixed);
    return isMixed;
  }

  getMixById(id: string): VirusMix | undefined {
    const mixId = parseInt(id.replace("mixed:", ""));
    console.log(
      "Looking for mix with ID:",
      mixId,
      "in saved mixes:",
      this.savedMixes
    );
    const mix = this.savedMixes.find((mix) => mix.id === mixId);
    console.log("Found mix:", mix);
    return mix;
  }
}
