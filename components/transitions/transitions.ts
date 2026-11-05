export interface Transition {
  name: string;
  /** animates `incoming` over `outgoing`; the caller removes `outgoing` once every animation finishes */
  run(outgoing: HTMLElement, incoming: HTMLElement): Animation[];
  /**
   * shows the incoming slot over the outgoing one from its first frame, with
   * this query on its src, instead of hiding it until it loads
   */
  overlayQuery?: string;
}

interface Lids {
  /** how far each lid bows from the middle line, in % of height; negative bows down */
  upper: number;
  lower: number;
  /** half the corner-to-corner width, in % of width */
  halfWidth: number;
}

const STEPS = 16;

/** one lid edge from corner to corner, as polygon points in % */
function lidEdge(bow: number, halfWidth: number): string[] {
  return Array.from({ length: STEPS + 1 }, (_, i) => {
    const t = (2 * i) / STEPS - 1;
    return `${50 + t * halfWidth}% ${50 - bow * (1 - t * t)}%`;
  });
}

/** the almond opening between the lids, as in shell-game's eye */
function openingPoints({ upper, lower, halfWidth }: Lids): string[] {
  return [
    ...lidEdge(upper, halfWidth),
    ...lidEdge(-lower, halfWidth).reverse(),
  ];
}

const opening = (lids: Lids) => `polygon(${openingPoints(lids).join(', ')})`;

/**
 * everything but the opening. the frame starts and ends on the opening's left
 * corner line so the evenodd seam between the two rings has no area.
 */
function aroundOpening(lids: Lids): string {
  const frame = [
    '-5% 50%',
    '-5% -5%',
    '105% -5%',
    '105% 105%',
    '-5% 105%',
    '-5% 50%',
  ];
  return `polygon(evenodd, ${[...frame, ...openingPoints(lids)].join(', ')})`;
}

/** a strip that starts on a lid edge bowing `bow` and reaches `reach` % further out */
function lidBand(bow: number, reach: number, halfWidth: number): string {
  const inner = lidEdge(bow, halfWidth);
  const outer = lidEdge(bow + reach, halfWidth * 1.06);
  return `polygon(${[...inner, ...outer.reverse()].join(', ')})`;
}

// the opening clears the slot's corners when open
const FULL: Lids = { upper: 100, lower: 100, halfWidth: 75 };
const EYE: Lids = { upper: 16, lower: 12, halfWidth: 28 };
// shut lids meet in a curve sagging below the middle
const SHUT: Lids = { upper: -4, lower: 4, halfWidth: 28 };

// ms: narrow to an eye, shut fast, hold, open slower, widen back. the old
// virus is seen until the lids meet, the new one once they part
const SHUT_AT = 220;
const OPEN_AT = 270;
const TOTAL = 530;
const TIMELINE: [number, Lids][] = [
  [0, FULL],
  [150, EYE],
  [SHUT_AT, SHUT],
  [OPEN_AT, SHUT],
  [380, EYE],
  [TOTAL, FULL],
];

/**
 * keyframes for one layer across the whole blink. every layer shares the same
 * offsets and easing so the cutouts and the skin around them stay lined up.
 */
function keyframes(frame: (lids: Lids, at: number) => Keyframe): Keyframe[] {
  return TIMELINE.map(([at, lids]) => ({
    ...frame(lids, at),
    offset: at / TOTAL,
    easing: 'ease-in-out',
  }));
}

const TIMING = { duration: TOTAL };

/** a full-stage layer drawn over both slots for the length of the blink */
function layer(
  incoming: HTMLElement,
  className: string,
  frame: (lids: Lids, at: number) => Keyframe
): Animation {
  const el = document.createElement('div');
  el.className = `eye-layer ${className}`;
  incoming.parentElement?.appendChild(el);
  const animation = el.animate(keyframes(frame), TIMING);
  void animation.finished.then(() => el.remove());
  return animation;
}

export const transitions: Transition[] = [
  {
    name: 'blink',
    run: (outgoing, incoming) => [
      outgoing.animate(
        keyframes((lids, at) => ({
          clipPath: opening(at <= SHUT_AT ? lids : SHUT),
        })),
        { ...TIMING, fill: 'forwards' }
      ),
      incoming.animate(
        keyframes((lids, at) => ({
          clipPath: opening(at >= OPEN_AT ? lids : SHUT),
        })),
        TIMING
      ),
      // shading and a highlight make the virus in the opening read as an eyeball
      layer(incoming, 'eye-ball', (lids, at) => ({
        clipPath: opening(lids),
        opacity: at === 0 || at === TOTAL ? 0 : 1,
      })),
      layer(incoming, 'eye-skin', lids => ({ clipPath: aroundOpening(lids) })),
      layer(incoming, 'eye-crease', lids => ({
        clipPath: lidBand(lids.upper + 7, 1.5, lids.halfWidth),
      })),
      layer(incoming, 'eye-lashes', lids => ({
        clipPath: lidBand(lids.upper, 7, lids.halfWidth),
      })),
      layer(incoming, 'eye-lashes eye-lashes--lower', lids => ({
        clipPath: lidBand(-lids.lower, -3, lids.halfWidth),
      })),
    ],
  },
];

// random-shapes keeps its page transparent this long, so its shapes pile up
// on the old virus before its own background fills the gaps
const BURY_MS = 1000;

/** extra transitions offered only when the incoming virus is the key */
const virusTransitions: Record<string, Transition[]> = {
  'random-shapes': [
    {
      name: 'bury',
      overlayQuery: `bury=${BURY_MS}`,
      // the shapes do the burying; this only holds the old virus underneath
      run: (_outgoing, incoming) => [
        incoming.animate(null, { duration: BURY_MS }),
      ],
    },
  ],
};

/** null means the loading cover; the `previous` transition never runs twice in a row */
export function pickTransition(
  previous: string | null,
  incoming: string
): Transition | null {
  const pool = [
    null,
    ...transitions,
    ...(virusTransitions[incoming] ?? []),
  ].filter(t => !t || t.name !== previous);
  return pool[Math.floor(Math.random() * pool.length)];
}
