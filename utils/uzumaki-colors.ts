import { randomBool, randomItem } from './random';

const UZUMAKI_COLORS: readonly string[] = [
  '#ff0000',
  '#00ffff',
  '#ffffff',
  '#ff80ed',
  '#ffd700',
  '#00ff00',
  '#00ff7f',
  '#ffff66',
  '#8a2be2',
  '#ccff00',
  '#8458b3',
  '#ff1d58',
  '#f75990',
];

export function startUzumakiBackground(): void {
  if (randomBool()) {
    setInterval(() => {
      document.body.style.backgroundColor = randomItem(UZUMAKI_COLORS);
    }, 200);
  } else {
    document.body.style.backgroundColor = randomItem(UZUMAKI_COLORS);
  }
}
