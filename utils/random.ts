export function randomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

/** Returns a random integer in [min, max] (inclusive of both bounds). */
export function randomIntBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomRgbColor(): string {
  return (
    '' +
    (Math.round(Math.random() * 256) +
      ',' +
      Math.round(Math.random() * 256) +
      ',' +
      Math.round(Math.random() * 256))
  );
}

export function randomBool(): boolean {
  return Math.random() < 0.5;
}

export function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}
