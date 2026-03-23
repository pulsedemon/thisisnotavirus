import { randomBool, randomItem } from './random';

const UZUMAKI_COLORS: readonly string[] = [
  '#ff0000',
  '#00ffff',
  '#ffffff',
  '#FF80ED',
  '#FFD700',
  '#00FF00',
  '#00FF7F',
  '#FFFF66',
  '#8A2BE2',
  '#CCFF00',
  '#8458B3',
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
