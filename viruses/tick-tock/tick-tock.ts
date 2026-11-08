import { isMobile } from '../../utils/misc';
import './tick-tock.scss';

const DESKTOP_SIZES = [160, 112, 80, 56, 40, 28, 20, 14, 10, 7, 5, 3];
const MOBILE_SIZES = [96, 72, 52, 38, 28, 20, 14, 10, 7, 5, 3];
const STAGE_MS = 1000;
const TICK_PERIOD_MS = 2000;

const sizes = isMobile() ? MOBILE_SIZES : DESKTOP_SIZES;

const container = document.getElementById('container')!;
const canvas = document.createElement('canvas');
container.appendChild(canvas);
const ctx = canvas.getContext('2d')!;

let cssW = 0;
let cssH = 0;
let stageIdx = 0;
let stageStart = performance.now();
let rafHandle = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  cssW = container.clientWidth;
  cssH = container.clientHeight;
  canvas.style.width = `${String(cssW)}px`;
  canvas.style.height = `${String(cssH)}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function fitGrid(target: number, w: number, h: number) {
  const cols = Math.max(1, Math.round(w / target));
  const cell = w / cols;
  const rows = Math.ceil(h / cell) + 1;
  const yOffset = (h - rows * cell) / 2;
  return { cell, cols, rows, yOffset };
}

function drawClock(cx: number, cy: number, cell: number, angle: number) {
  const radius = cell * 0.42;

  if (cell <= 4) {
    ctx.fillRect(Math.floor(cx), Math.floor(cy), 1, 1);
    return;
  }

  if (cell < 8) {
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.stroke();
    return;
  }

  if (cell < 14) {
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(angle) * radius * 0.85,
      cy + Math.sin(angle) * radius * 0.85
    );
    ctx.stroke();
    return;
  }

  ctx.lineWidth = Math.max(1, cell * 0.05);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = Math.max(1, cell * 0.07);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(
    cx + Math.cos(angle) * radius * 0.85,
    cy + Math.sin(angle) * radius * 0.85
  );
  ctx.stroke();

  const dot = cell >= 40 ? 2 : 1;
  const dotX = Math.round(cx - dot / 2);
  const dotY = Math.round(cy - dot / 2);
  ctx.fillRect(dotX, dotY, dot, dot);
}

function frame(now: number) {
  const elapsedStages = Math.floor((now - stageStart) / STAGE_MS);
  if (elapsedStages > 0) {
    stageIdx = (stageIdx + elapsedStages) % sizes.length;
    stageStart += elapsedStages * STAGE_MS;
  }

  const target = sizes[stageIdx];
  const { cell, cols, rows, yOffset } = fitGrid(target, cssW, cssH);
  const angle =
    ((now % TICK_PERIOD_MS) / TICK_PERIOD_MS) * Math.PI * 2 - Math.PI / 2;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';

  const half = cell / 2;
  for (let r = 0; r < rows; r++) {
    const cy = r * cell + half + yOffset;
    for (let c = 0; c < cols; c++) {
      drawClock(c * cell + half, cy, cell, angle);
    }
  }

  rafHandle = requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
window.addEventListener('pagehide', () => {
  cancelAnimationFrame(rafHandle);
});

resize();
rafHandle = requestAnimationFrame(frame);
