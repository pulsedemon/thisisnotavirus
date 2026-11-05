export type Transition =
  | {
      name: string;
      /** animates `incoming` over `outgoing`; the caller removes `outgoing` once every animation finishes */
      run(outgoing: HTMLElement, incoming: HTMLElement): Animation[];
    }
  | {
      name: string;
      /** the incoming iframe joins the outgoing slot and draws over the still-running virus */
      overlay: true;
    };

/**
 * an almond eye opening, as in shell-game: two lid curves meeting in sharp
 * corners. `upper` and `lower` are how far each lid bows from the middle line,
 * in % of height (negative bows down). open lids clear the slot's corners; a
 * shut eye is one curve sagging below the middle.
 */
function eye(upper: number, lower: number, halfWidth: number): string {
  const steps = 16;
  const lid = (bow: number, i: number) => {
    const t = (2 * i) / steps - 1;
    return `${50 + t * halfWidth}% ${50 - bow * (1 - t * t)}%`;
  };
  const indexes = Array.from({ length: steps + 1 }, (_, i) => i);
  return `polygon(${[
    ...indexes.map(i => lid(upper, i)),
    ...indexes.reverse().map(i => lid(-lower, i)),
  ].join(', ')})`;
}

const EYE_OPEN = { clipPath: eye(100, 100, 75) };
// the lower lid snaps nearly shut first, so the upper lid does the blinking
const EYE_LOWER_UP = { clipPath: eye(85, 25, 55) };
const EYE_SHUT = { clipPath: eye(-15, 15, 40) };

export const transitions: Transition[] = [
  {
    name: 'blink',
    run: (outgoing, incoming) => [
      outgoing.animate([EYE_OPEN, { ...EYE_LOWER_UP, offset: 0.3 }, EYE_SHUT], {
        duration: 90,
        easing: 'ease-in',
        fill: 'forwards',
      }),
      // shut for 60ms, then the new virus opens the same way in reverse
      incoming.animate([EYE_SHUT, { ...EYE_LOWER_UP, offset: 0.7 }, EYE_OPEN], {
        duration: 110,
        delay: 150,
        easing: 'ease-out',
        fill: 'backwards',
      }),
    ],
  },
];

/** extra transitions offered only when the incoming virus is the key */
export const virusTransitions: Record<string, Transition[]> = {
  'random-shapes': [{ name: 'bury', overlay: true }],
};

/** null means the loading cover; overlay entries are left out when `allowOverlay` is false */
export function pickTransition(
  incoming: string,
  allowOverlay: boolean
): Transition | null {
  const pool: (Transition | null)[] = [
    null,
    ...transitions,
    ...(virusTransitions[incoming] ?? []),
  ].filter(t => allowOverlay || !(t && 'overlay' in t));
  return pool[Math.floor(Math.random() * pool.length)];
}
