import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isMobile } from '../../utils/misc';

vi.mock('../../utils/misc', () => ({
  isMobile: vi.fn(() => false),
}));

vi.mock('../../utils/gtag', () => ({
  safeGtag: vi.fn(),
}));

vi.mock('@sentry/browser', () => ({
  captureException: vi.fn(),
}));

function setupDOM(): void {
  const menu = document.createElement('div');
  menu.id = 'menu';
  const controls = document.createElement('div');
  controls.className = 'controls';
  menu.appendChild(controls);
  document.body.appendChild(menu);

  const labBtn = document.createElement('div');
  labBtn.id = 'lab-btn';
  document.body.appendChild(labBtn);

  const thumbBtn = document.createElement('div');
  thumbBtn.id = 'thumbnail-btn';
  document.body.appendChild(thumbBtn);

  const sourceCode = document.createElement('div');
  sourceCode.id = 'source-code';
  document.body.appendChild(sourceCode);
}

function clearDOM(): void {
  document.body.replaceChildren();
}

describe('initFullscreen', () => {
  beforeEach(() => {
    vi.mocked(isMobile).mockReturnValue(false);
    setupDOM();
  });

  afterEach(() => {
    clearDOM();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('should not create fullscreen button on mobile', async () => {
    vi.mocked(isMobile).mockReturnValue(true);

    const { initFullscreen } = await import('../fullscreen');
    initFullscreen();

    expect(document.getElementById('fullscreen')).toBeNull();
  });

  it('should create fullscreen button on desktop', async () => {
    const { initFullscreen } = await import('../fullscreen');
    initFullscreen();

    const btn = document.getElementById('fullscreen');
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toBe('fullscreen');
    expect(btn?.className).toBe('material-symbols-outlined');
    expect(btn?.title).toBe('Toggle Fullscreen');
  });

  it('should append button to #menu .controls', async () => {
    const { initFullscreen } = await import('../fullscreen');
    initFullscreen();

    const controls = document.querySelector('#menu .controls');
    const btn = controls?.querySelector('#fullscreen');
    expect(btn).not.toBeNull();
  });

  it('should not create button if #menu .controls is missing', async () => {
    clearDOM();
    const menu = document.createElement('div');
    menu.id = 'menu';
    document.body.appendChild(menu);

    const { initFullscreen } = await import('../fullscreen');
    initFullscreen();

    expect(document.getElementById('fullscreen')).toBeNull();
  });
});
