export default class Random {
  static int(max: number): number {
    return Math.floor(Math.random() * max);
  }

  static numberBetween(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
  }

  static rgbColor() {
    return (
      "" +
      (Math.round(Math.random() * 256) +
        "," +
        Math.round(Math.random() * 256) +
        "," +
        Math.round(Math.random() * 256))
    );
  }

  static bool() {
    return Math.random() < 0.5;
  }
}
