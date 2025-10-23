// TVStaticLoading.js - Refactored for DRYness and maintainability

export interface TVStaticConfig {
  bufferW?: number;
  bufferH?: number;
  fadeSpeed?: number;
  watermarkBaseAlpha?: number;
  watermarkRevealAlpha?: number;
  watermarkStep?: number;
}

export default class TVStaticLoading {
  private canvas: HTMLCanvasElement;
  private _animationFrame: number | null = null;
  private _resizeHandler: () => void;
  private _isShown = false;
  private _effectTimer: number | null = null;
  private _effect: null | keyof typeof this.effectHandlers = null;
  private _effectProgress = 0;
  private _lastFrameTime = 0;
  private _buffer: HTMLCanvasElement;
  private _bufferCtx: CanvasRenderingContext2D;
  private config: Required<TVStaticConfig>;
  private watermark = {
    fade: 0,
    clickCount: 0,
    baseAlpha: 0.18,
    revealAlpha: 0.7,
    step: 0.1,
    currentWord: "",
  };

  private readonly WORDS = [
    "VIRUS",
    "404",
    "HELLO",
    "混沌",
    "FAKE",
    "PAIN",
    "DANCE",
    "DEATH",
    "666",
    "NUMBERS",
    "悪魔",
    "ANIMAL",
    "THIS",
    "SHOULD",
    "BE",
    "RANDOM",
  ];

  private readonly DEFAULTS = {
    bufferW: 320,
    bufferH: 180,
    fadeSpeed: 0.02,
    watermarkBaseAlpha: 0.18,
    watermarkRevealAlpha: 0.7,
    watermarkStep: 0.1,
  };

  private effectHandlers: Record<string, () => void>;

  constructor(cfg: TVStaticConfig = {}) {
    this.config = { ...this.DEFAULTS, ...cfg };
    this.canvas = document.createElement("canvas");
    this.canvas.className = "tv-static-canvas";
    this.canvas.style.position = "fixed";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100vw";
    this.canvas.style.height = "100vh";
    this.canvas.style.zIndex = "9999";
    this.canvas.style.pointerEvents = "auto";
    this.canvas.style.background = "black";
    this._resizeHandler = this._resize.bind(this);
    this._buffer = document.createElement("canvas");
    this._buffer.width = this.config.bufferW;
    this._buffer.height = this.config.bufferH;
    this._bufferCtx = this._buffer.getContext("2d", {
      willReadFrequently: true,
    })!;
    this.watermark.baseAlpha = this.config.watermarkBaseAlpha;
    this.watermark.revealAlpha = this.config.watermarkRevealAlpha;
    this.watermark.step = this.config.watermarkStep;
    this.effectHandlers = {
      scramble: this._handleScrambleEffect.bind(this),
      roll: this._handleRollEffect.bind(this),
      flash: this._handleFlashEffect.bind(this),
      bar: this._handleBarEffect.bind(this),
      glitch: this._handleGlitchEffect.bind(this),
    };
  }

  private withContext(ctx: CanvasRenderingContext2D, fn: () => void) {
    ctx.save();
    fn();
    ctx.restore();
  }

  private _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private _drawBackgroundVirusText() {
    const ctx = this._bufferCtx;
    const width = this.config.bufferW;
    const height = this.config.bufferH;
    this.withContext(ctx, () => {
      const alpha =
        this.watermark.baseAlpha +
        (this.watermark.revealAlpha - this.watermark.baseAlpha) *
          this.watermark.fade;
      ctx.globalAlpha = alpha;

      if (!this.watermark.currentWord) {
        const randomIndex = Math.floor(Math.random() * this.WORDS.length);
        this.watermark.currentWord = this.WORDS[randomIndex];
        console.log(`Your fortune: "${this.watermark.currentWord}" `);
      }
      const randomWord = this.watermark.currentWord;

      let fontSize = height;
      ctx.font = `bold ${fontSize}px 'Roboto', monospace`;
      let metrics = ctx.measureText(randomWord);
      const textWidth = metrics.width;
      if (textWidth > width * 0.98) {
        fontSize = (fontSize * (width * 0.98)) / textWidth;
        ctx.font = `bold ${fontSize}px 'Roboto', monospace`;
        metrics = ctx.measureText(randomWord);
      }
      const actualHeight =
        metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
      if (actualHeight > height * 0.98) {
        fontSize = (fontSize * (height * 0.98)) / actualHeight;
        ctx.font = `bold ${fontSize}px 'Roboto', monospace`;
        metrics = ctx.measureText(randomWord);
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#fff";
      if (this.watermark.fade > 0.1) {
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 4 * this.watermark.fade;
      }
      const y =
        height / 2 +
        (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) /
          2;
      ctx.fillText(randomWord, width / 2, y);
    });
  }

  private _drawStatic(color = false, blocky = false) {
    const ctx = this._bufferCtx;
    const width = this.config.bufferW;
    const height = this.config.bufferH;
    let pixelSize = blocky ? Math.floor(Math.random() * 3) + 2 : 1;
    for (let y = 0; y < height; y += pixelSize) {
      for (let x = 0; x < width; x += pixelSize) {
        let r: number, g: number, b: number;
        if (color && Math.random() < 0.15) {
          r = (Math.random() * 255) | 0;
          g = (Math.random() * 255) | 0;
          b = (Math.random() * 255) | 0;
        } else {
          r = g = b = (Math.random() * 255) | 0;
        }
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, pixelSize, pixelSize);
      }
    }
  }

  private _drawScanlines() {
    const ctx = this._bufferCtx;
    const width = this.config.bufferW;
    const height = this.config.bufferH;
    this.withContext(ctx, () => {
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#000";
      for (let y = 0; y < height; y += 3) {
        ctx.fillRect(0, y, width, 1);
      }
    });
  }

  private _drawBandShift() {
    const ctx = this._bufferCtx;
    const width = this.config.bufferW;
    const height = this.config.bufferH;
    const bandHeight = Math.floor(height / (6 + Math.random() * 6));
    for (let y = 0; y < height; y += bandHeight) {
      const shift = (Math.random() - 0.5) * 20;
      this.withContext(ctx, () => {
        ctx.globalAlpha = 0.9;
        ctx.drawImage(
          this._buffer,
          0,
          y,
          width,
          bandHeight,
          shift,
          y,
          width,
          bandHeight,
        );
      });
    }
  }

  private _drawWavyDistortion() {
    const ctx = this._bufferCtx;
    const width = this.config.bufferW;
    const height = this.config.bufferH;
    const imageData = ctx.getImageData(0, 0, width, height);
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext("2d")!;
    tempCtx.putImageData(imageData, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (let y = 0; y < height; y += 4) {
      const wave = Math.sin(y / 12 + Date.now() / 200) * 4;
      ctx.drawImage(tempCanvas, 0, y, width, 4, wave, y, width, 4);
    }
  }

  private _drawColorBars() {
    const ctx = this._bufferCtx;
    const width = this.config.bufferW;
    const height = this.config.bufferH;
    const barCount = 6 + Math.floor(Math.random() * 4);
    const barHeight = Math.floor(height / barCount);
    const colors = [
      "#fff",
      "#f00",
      "#0f0",
      "#00f",
      "#ff0",
      "#0ff",
      "#f0f",
      "#222",
    ];
    for (let i = 0; i < barCount; i++) {
      ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.globalAlpha = 0.5 + Math.random() * 0.3;
      ctx.fillRect(0, i * barHeight, width, barHeight);
    }
    ctx.globalAlpha = 1.0;
  }

  private _drawRollingLines() {
    const ctx = this._bufferCtx;
    const width = this.config.bufferW;
    const height = this.config.bufferH;
    for (let i = 0; i < 2; i++) {
      const y = Math.floor(Math.random() * height);
      this.withContext(ctx, () => {
        ctx.globalAlpha = 0.7;
        ctx.strokeStyle = `rgb(${(Math.random() * 255) | 0},${
          (Math.random() * 255) | 0
        },${(Math.random() * 255) | 0})`;
        ctx.lineWidth = 1 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      });
    }
  }

  private _drawNoSignalBar() {
    const ctx = this._bufferCtx;
    const width = this.config.bufferW;
    const height = this.config.bufferH;
    this.withContext(ctx, () => {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#fff";
      const barHeight = Math.max(4, Math.floor(height * 0.08));
      const y = Math.floor(Math.random() * (height - barHeight));
      ctx.fillRect(0, y, width, barHeight);
    });
  }

  private _drawBlockyGlitch() {
    const ctx = this._bufferCtx;
    const width = this.config.bufferW;
    const height = this.config.bufferH;
    this.withContext(ctx, () => {
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < 4; i++) {
        const w = Math.random() * (width * 0.2) + 8;
        const h = Math.random() * (height * 0.1) + 4;
        const x = Math.random() * (width - w);
        const y = Math.random() * (height - h);
        ctx.fillStyle = `rgb(${(Math.random() * 255) | 0},${
          (Math.random() * 255) | 0
        },${(Math.random() * 255) | 0})`;
        ctx.fillRect(x, y, w, h);
      }
    });
  }

  private _drawVignette() {
    const ctx = this._bufferCtx;
    const width = this.config.bufferW;
    const height = this.config.bufferH;
    this.withContext(ctx, () => {
      const cx = width / 2;
      const cy = height / 2;
      const maxRadius = Math.sqrt(cx * cx + cy * cy);
      const grad = ctx.createRadialGradient(
        cx,
        cy,
        width * 0.3,
        cx,
        cy,
        maxRadius,
      );
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.32)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    });
  }

  private _handleScrambleEffect() {
    this._drawStatic(true, true);
    this._drawBandShift();
    this._drawWavyDistortion();
    if (Math.random() < 0.04) this._drawColorBars();
    if (Math.random() < 0.5) this._drawRollingLines();
  }

  private _handleRollEffect() {
    const ctx = this._bufferCtx;
    const colorStatic = Math.random() < 0.15;
    this._drawStatic(colorStatic);
    this.withContext(ctx, () => {
      const rollAmount = Math.sin(this._effectProgress / 5) * 10;
      if (Math.random() < 0.5) {
        ctx.translate(0, rollAmount);
      } else {
        ctx.translate(rollAmount, 0);
      }
      ctx.drawImage(this._buffer, 0, 0);
    });
  }

  private _handleFlashEffect() {
    const ctx = this._bufferCtx;
    const colorStatic = Math.random() < 0.15;
    this._drawStatic(colorStatic);
    this.withContext(ctx, () => {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, this.config.bufferW, this.config.bufferH);
    });
  }

  private _handleBarEffect() {
    const colorStatic = Math.random() < 0.15;
    this._drawStatic(colorStatic);
    this._drawNoSignalBar();
  }

  private _handleGlitchEffect() {
    const colorStatic = Math.random() < 0.15;
    this._drawStatic(colorStatic);
    this._drawBlockyGlitch();
  }

  private _onUserReveal = () => {
    this.watermark.clickCount++;
    this.watermark.fade = Math.min(
      1,
      this.watermark.fade + this.watermark.step,
    );
  };

  private _animate = () => {
    // Throttle to 20fps
    const now = performance.now();
    if (now - this._lastFrameTime < 50) {
      this._animationFrame = requestAnimationFrame(this._animate);
      return;
    }
    this._lastFrameTime = now;
    if (this.watermark.fade > 0) {
      this.watermark.fade = Math.max(
        0,
        this.watermark.fade - this.config.fadeSpeed,
      );
      if (this.watermark.fade === 0) {
        this.watermark.clickCount = 0;
        this.watermark.currentWord = "";
      }
    }
    const ctx = this._bufferCtx;
    ctx.clearRect(0, 0, this.config.bufferW, this.config.bufferH);
    const colorStatic = Math.random() < 0.15;
    if (this._effect && this.effectHandlers[this._effect]) {
      this._effectProgress++;
      this.effectHandlers[this._effect]();
      if (
        (this._effect === "scramble" &&
          this._effectProgress > 8 + Math.random() * 6) ||
        (this._effect !== "scramble" &&
          this._effectProgress > 10 + Math.random() * 10)
      ) {
        this._effect = null;
        this._effectProgress = 0;
      }
    } else {
      this._drawStatic(colorStatic);
      if (!this._effectTimer) {
        this._effectTimer = window.setTimeout(
          () => {
            const effects = Object.keys(this.effectHandlers);
            this._effect = effects[Math.floor(Math.random() * effects.length)];
            this._effectProgress = 0;
            this._effectTimer = null;
          },
          1000 + Math.random() * 1000,
        );
      }
    }
    this._drawScanlines();
    this._drawVignette();
    this._drawBackgroundVirusText();
    // Draw buffer to main canvas, scaled up
    const mainCtx = this.canvas.getContext("2d")!;
    mainCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    mainCtx.imageSmoothingEnabled = false;
    mainCtx.drawImage(
      this._buffer,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
    this._animationFrame = requestAnimationFrame(this._animate);
  };

  public show() {
    if (this._isShown) return;
    this._isShown = true;
    document.body.appendChild(this.canvas);
    this._resize();
    window.addEventListener("resize", this._resizeHandler);
    this.canvas.addEventListener("click", this._onUserReveal);
    this.canvas.addEventListener("touchstart", this._onUserReveal);
    this._animate();
  }

  public hide() {
    if (!this._isShown) return;
    this._isShown = false;
    window.removeEventListener("resize", this._resizeHandler);
    this.canvas.removeEventListener("click", this._onUserReveal);
    this.canvas.removeEventListener("touchstart", this._onUserReveal);
    if (this._animationFrame) cancelAnimationFrame(this._animationFrame);
    if (this._effectTimer) clearTimeout(this._effectTimer);
    this._effect = null;
    this._effectProgress = 0;
    this.watermark.fade = 0;
    this.watermark.clickCount = 0;
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  }
}
