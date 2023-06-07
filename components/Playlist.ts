import { shuffle } from "../utils/misc";

export default class Playlist {
  viruses = [
    "random-blocks",
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
  currentIndex: number = 0;

  constructor() {
    this.generatePlaylist();
  }

  generatePlaylist() {
    for (let i = 0; i < 10; i++) {
      let shuffledItems = shuffle(this.viruses);
      const lastItemInPlaylist = this.playlist[this.playlist.length - 1];
      if (lastItemInPlaylist === shuffledItems[0]) {
        const firstItem = shuffledItems.shift();
        shuffledItems.push(firstItem);
      }
      this.playlist.push(...shuffledItems);
    }
  }

  current(): string {
    if (typeof this.playlist[this.currentIndex] === "undefined")
      this.currentIndex = 0;
    return this.playlist[this.currentIndex];
  }

  prev(): string {
    let prevIndex = this.currentIndex - 1;
    if (prevIndex === -1) prevIndex = this.playlist.length - 1;
    this.currentIndex = prevIndex;
    return this.current();
  }

  next(): string {
    const nextIndex = this.currentIndex + 1;
    this.currentIndex = nextIndex;
    return this.current();
  }
}
