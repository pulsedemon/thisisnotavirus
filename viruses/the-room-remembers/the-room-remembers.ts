import './the-room-remembers.scss';
import {
  randomBool,
  randomFloat,
  randomIntBetween,
  randomItem,
} from '../../utils/random';

type Point = readonly [number, number];

interface Room {
  chairs: { x: number; y: number; scale: number; reversed: boolean }[];
  doors: boolean[];
  corridors: boolean[];
  corridorReach: number;
  nested: boolean;
  columns: number;
  rows: number;
  floorPattern: 'checker' | 'stripes' | 'grid';
}

const canvas = document.querySelector('canvas')!;
const ctx = canvas.getContext('2d')!;
let width = 0;
let height = 0;
let pixelRatio = 1;
let animationId = 0;
let startedAt: number | undefined;
let currentRoom: Room = {
  chairs: [{ x: 408, y: 480, scale: 1, reversed: false }],
  doors: [false],
  corridors: [],
  corridorReach: 1,
  nested: false,
  columns: 10,
  rows: 7,
  floorPattern: 'checker',
};
let nextRoom = createRoom(currentRoom);
let movingRight = true;
let stillDuration = 400;
let sweepDuration = 1400;
let cycleDuration = 2300;

function createRoom(previous: Room): Room {
  const doors = randomItem([[false], [true], [false, true]]);
  return {
    chairs: Array.from({ length: randomIntBetween(1, 4) }, (_, index) => ({
      x: 310 + index * 125 + randomFloat(0, 65),
      y: randomFloat(475, 535),
      scale: randomFloat(0.65, 1.35),
      reversed: randomBool(),
    })).sort((a, b) => a.y - b.y),
    doors,
    corridors: doors.filter(() => randomBool()),
    corridorReach: randomFloat(0.6, 1),
    nested: randomBool(),
    columns: randomItem(
      [6, 8, 10, 14, 18].filter(count => count !== previous.columns)
    ),
    rows: randomItem([4, 7, 11]),
    floorPattern: randomItem(['checker', 'stripes', 'grid']),
  };
}

function polygon(points: readonly Point[], fill: string, stroke = '#000') {
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function line(points: readonly Point[], color = '#000') {
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.stroke();
}

function floorPoint(x: number, depth: number): Point {
  const perspective = depth / (2 - depth);
  return [
    300 - 180 * perspective + x * (400 + 360 * perspective),
    510 + 150 * perspective,
  ];
}

function drawFloor(room: Room) {
  for (let row = 0; row < room.rows; row++) {
    for (let col = 0; col < room.columns; col++) {
      const white =
        room.floorPattern === 'grid' ||
        (room.floorPattern === 'stripes' ? row : row + col) % 2 === 0;
      polygon(
        [
          floorPoint(col / room.columns, row / room.rows),
          floorPoint((col + 1) / room.columns, row / room.rows),
          floorPoint((col + 1) / room.columns, (row + 1) / room.rows),
          floorPoint(col / room.columns, (row + 1) / room.rows),
        ],
        white ? '#fff' : '#000'
      );
    }
  }
}

function drawChair(x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 2;
  polygon(
    [
      [0, 0],
      [48, -18],
      [83, 3],
      [35, 23],
    ],
    '#fff'
  );
  polygon(
    [
      [0, 0],
      [0, -72],
      [48, -90],
      [48, -18],
    ],
    '#000',
    '#fff'
  );
  polygon(
    [
      [0, -72],
      [6, -76],
      [54, -94],
      [48, -90],
    ],
    '#fff'
  );
  polygon(
    [
      [35, 23],
      [43, 20],
      [43, 78],
      [35, 81],
    ],
    '#000',
    '#fff'
  );
  polygon(
    [
      [76, 6],
      [83, 3],
      [83, 57],
      [76, 61],
    ],
    '#000',
    '#fff'
  );
  polygon(
    [
      [0, 0],
      [7, 4],
      [7, 57],
      [0, 53],
    ],
    '#000',
    '#fff'
  );
  ctx.restore();
}

function drawDoor(right: boolean) {
  ctx.save();
  if (right) {
    ctx.translate(1000, 0);
    ctx.scale(-1, 1);
  }
  polygon(
    [
      [189, 300],
      [253, 337],
      [253, 549],
      [189, 601],
    ],
    '#000'
  );
  line(
    [
      [197, 596],
      [197, 315],
      [253, 347],
    ],
    '#fff'
  );
  ctx.restore();
}

function drawCorridor(right: boolean, reach: number) {
  ctx.save();
  if (!right) {
    ctx.translate(1000, 0);
    ctx.scale(-1, 1);
  }
  const mouth: readonly Point[] = [
    [747, 337],
    [811, 300],
    [811, 601],
    [747, 549],
  ];
  const destination: readonly Point[] = [
    [905, 70],
    [969, 33],
    [969, 183],
    [905, 220],
  ];
  const end = mouth.map(
    ([x, y], index): Point => [
      x + (destination[index][0] - x) * reach,
      y + (destination[index][1] - y) * reach,
    ]
  );
  polygon([mouth[0], end[0], end[1], mouth[1]], '#000', '#fff');
  polygon([mouth[1], end[1], end[2], mouth[2]], '#fff');
  polygon([mouth[3], mouth[2], end[2], end[3]], '#000', '#fff');
  for (let step = 1; step <= 8; step++) {
    const t = step / 8;
    const corners = mouth.map(
      ([x, y], index): Point => [
        x + (end[index][0] - x) * t,
        y + (end[index][1] - y) * t,
      ]
    );
    line([corners[0], corners[1], corners[2], corners[3]], '#000');
    line([corners[3], corners[2]], '#fff');
  }
  polygon(end, '#000', '#fff');
  line([mouth[0], end[0], end[3], mouth[3]], '#fff');
  line([mouth[1], end[1], end[2], mouth[2]], '#fff');
  line(
    [
      [779, 575],
      [(end[2][0] + end[3][0]) / 2, (end[2][1] + end[3][1]) / 2],
    ],
    '#fff'
  );
  ctx.restore();
}

function drawRoom(room: Room, allowNested = true) {
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'miter';
  polygon(
    [
      [120, 140],
      [300, 250],
      [300, 510],
      [120, 660],
    ],
    '#fff'
  );
  polygon(
    [
      [700, 250],
      [880, 140],
      [880, 660],
      [700, 510],
    ],
    '#fff'
  );
  polygon(
    [
      [300, 250],
      [700, 250],
      [700, 510],
      [300, 510],
    ],
    '#000',
    '#fff'
  );
  drawFloor(room);

  // the shadow stays here after the chair moves. attaching it to the chair removes the contradiction.
  polygon(
    [
      [409, 544],
      [478, 519],
      [560, 543],
      [588, 584],
      [517, 592],
    ],
    '#000',
    '#fff'
  );
  line(
    [
      [478, 519],
      [499, 549],
      [588, 584],
    ],
    '#fff'
  );

  room.doors.forEach(drawDoor);
  room.corridors.forEach(right => drawCorridor(right, room.corridorReach));

  if (room.nested && allowNested) {
    polygon(
      [
        [367, 282],
        [633, 282],
        [633, 494],
        [367, 494],
      ],
      '#fff'
    );
    ctx.save();
    ctx.translate(369, 283);
    ctx.scale(0.262, 0.262);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 1000, 800);
    drawRoom(room, false);
    ctx.restore();
    line(
      [
        [367, 494],
        [300, 510],
      ],
      '#fff'
    );
    line(
      [
        [633, 494],
        [700, 510],
      ],
      '#fff'
    );
  }

  room.chairs.forEach(chair => {
    ctx.save();
    ctx.translate(chair.x, chair.y);
    ctx.scale(chair.reversed ? -chair.scale : chair.scale, chair.scale);
    drawChair(0, 0);
    ctx.restore();
  });

  ctx.lineWidth = 2.5;
  line(
    [
      [120, 660],
      [120, 140],
      [880, 140],
      [880, 660],
      [120, 660],
    ],
    '#fff'
  );
  line(
    [
      [120, 140],
      [300, 250],
      [700, 250],
      [880, 140],
    ],
    '#fff'
  );
  line(
    [
      [300, 250],
      [300, 510],
    ],
    '#fff'
  );
  line(
    [
      [700, 250],
      [700, 510],
    ],
    '#fff'
  );
  line(
    [
      [120, 671],
      [880, 671],
    ],
    '#fff'
  );
}

function drawComposition(room: Room, clipLeft: number, clipRight: number) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(clipLeft, 0, Math.max(0, clipRight - clipLeft), height);
  ctx.clip();
  const scale = Math.min(width / 1060, height / 860);
  ctx.translate((width - 1000 * scale) / 2, (height - 800 * scale) / 2);
  ctx.scale(scale, scale);
  drawRoom(room);
  ctx.restore();
}

function frame(now: number) {
  startedAt ??= now;
  if (now - startedAt >= cycleDuration) {
    // sample only between sweeps. changing either room mid-sweep exposes the trick.
    currentRoom = nextRoom;
    nextRoom = createRoom(currentRoom);
    movingRight = randomBool();
    stillDuration = randomFloat(200, 650);
    sweepDuration = randomFloat(1100, 2300);
    cycleDuration = stillDuration + sweepDuration + randomFloat(250, 850);
    startedAt = now;
  }
  const phase = now - startedAt;
  const progress = Math.min(
    1,
    Math.max(0, (phase - stillDuration) / sweepDuration)
  );
  const slabWidth = width * 0.18;
  const position = movingRight ? progress : 1 - progress;
  const slabLeft = -slabWidth - 2 + position * (width + slabWidth + 4);
  const boundary = Math.max(0, Math.min(width, slabLeft + slabWidth / 2));

  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);

  // both compositions meet inside the opaque slab, so no changed edge can escape the cover.
  drawComposition(movingRight ? nextRoom : currentRoom, 0, boundary);
  drawComposition(movingRight ? currentRoom : nextRoom, boundary, width);
  ctx.fillStyle = '#000';
  ctx.fillRect(slabLeft, 0, slabWidth, height);
  ctx.lineWidth = 1;
  line(
    [
      [slabLeft, 0],
      [slabLeft, height],
    ],
    '#fff'
  );
  line(
    [
      [slabLeft + slabWidth, 0],
      [slabLeft + slabWidth, height],
    ],
    '#fff'
  );

  animationId = requestAnimationFrame(frame);
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
}

window.addEventListener('resize', resize);
window.addEventListener('pagehide', () => cancelAnimationFrame(animationId));
resize();
animationId = requestAnimationFrame(frame);
