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
 * an almond eye opening as a polygon. `lift` is how far each lid bows from the
 * middle line, in % of height: 100 clears the slot's corners, 0 is shut. the
 * eye's corners move in from past the sides as it closes, so a half-closed
 * eye shows its points.
 */
function eye(lift: number): string {
  const steps = 16;
  const halfWidth = 40 + 0.35 * lift;
  const lid = (i: number) => {
    const t = (2 * i) / steps - 1;
    return { x: 50 + t * halfWidth, bow: (1 - t * t) * lift };
  };
  const upper = Array.from({ length: steps + 1 }, (_, i) => lid(i)).map(
    p => `${p.x}% ${50 - p.bow}%`
  );
  const lower = Array.from({ length: steps + 1 }, (_, i) => lid(steps - i)).map(
    p => `${p.x}% ${50 + p.bow}%`
  );
  return `polygon(${[...upper, ...lower].join(', ')})`;
}

export const transitions: Transition[] = [
  {
    name: 'iris',
    run: (_outgoing, incoming) => {
      const at = `${Math.round(Math.random() * 100)}% ${Math.round(Math.random() * 100)}%`;
      return [
        incoming.animate(
          [
            { clipPath: `circle(0% at ${at})` },
            // 150% of the reference radius reaches every corner from any point
            { clipPath: `circle(150% at ${at})` },
          ],
          { duration: 800, easing: 'ease-in' }
        ),
      ];
    },
  },
  {
    name: 'blink',
    run: (outgoing, incoming) => {
      const open = { clipPath: eye(100) };
      const shut = { clipPath: eye(0) };
      return [
        outgoing.animate([open, shut], {
          duration: 100,
          easing: 'ease-in',
          fill: 'forwards',
        }),
        incoming.animate([shut, open], {
          duration: 120,
          delay: 100,
          easing: 'ease-out',
          fill: 'backwards',
        }),
      ];
    },
  },
];

/** extra transitions offered only when the incoming virus is the key */
export const virusTransitions: Record<string, Transition[]> = {};

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
