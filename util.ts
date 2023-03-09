export function preloadImage(url: string) {
  let img = new Image();
  img.src = url;
}

export function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

export function shuffle(array: any[]): any[] {
  let currentIndex = array.length,
    randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {
    // Pick a remaining element.
    randomIndex = randomInt(currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex],
      array[currentIndex],
    ];
  }

  return array;
}

export function randomNumberBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min);
}
