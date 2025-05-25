// TVStaticLoading.js - Plain JavaScript TV static loading animation
// Usage: const tvStatic = new TVStaticLoading(); tvStatic.show(); tvStatic.hide();

export default class TVStaticLoading {
  canvas: HTMLCanvasElement;
  _animationFrame: number | null;
  _resizeHandler: () => void;
  _isShown: boolean;
  _effectTimer: number | null;
  _effect: null | "roll" | "flash" | "bar" | "glitch" | "scramble";
  _effectProgress: number;
  _lastFrameTime: number;
  _buffer: HTMLCanvasElement;
  _bufferCtx: CanvasRenderingContext2D;
  _bufferW: number;
  _bufferH: number;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "tv-static-canvas";
    this.canvas.style.position = "fixed";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100vw";
    this.canvas.style.height = "100vh";
    this.canvas.style.zIndex = "9999";
    this.canvas.style.pointerEvents = "none";
    this.canvas.style.background = "black";
    this._animationFrame = null;
    this._resizeHandler = this._resize.bind(this);
    this._isShown = false;
    this._effectTimer = null;
    this._effect = null;
    this._effectProgress = 0;
    this._lastFrameTime = 0;
    this._bufferW = 320;
    this._bufferH = 180;
    this._buffer = document.createElement("canvas");
    this._buffer.width = this._bufferW;
    this._buffer.height = this._bufferH;
    this._bufferCtx = this._buffer.getContext("2d")!;
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  _drawBackgroundVirusText(alpha = 0.13) {
    const ctx = this._bufferCtx;
    const width = this._bufferW;
    const height = this._bufferH;
    ctx.save();
    ctx.globalAlpha = alpha;
    // Dynamically size font to fill buffer
    let fontSize = height; // Start with height
    ctx.font = `bold ${fontSize}px monospace`;
    let metrics = ctx.measureText("VIRUS");
    // Adjust font size to fit width as well
    const textWidth = metrics.width;
    if (textWidth > width * 0.98) {
      fontSize = (fontSize * (width * 0.98)) / textWidth;
      ctx.font = `bold ${fontSize}px monospace`;
      metrics = ctx.measureText("VIRUS");
    }
    // If text is still too tall, shrink to fit height
    const actualHeight =
      metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
    if (actualHeight > height * 0.98) {
      fontSize = (fontSize * (height * 0.98)) / actualHeight;
      ctx.font = `bold ${fontSize}px monospace`;
      metrics = ctx.measureText("VIRUS");
    }
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#fff";
    // Calculate perfect vertical center using bounding box
    const y =
      height / 2 +
      (metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;
    ctx.fillText("VIRUS", width / 2, y);
    ctx.restore();
  }

  _drawStatic(color = false, blocky = false) {
    const ctx = this._bufferCtx;
    const width = this._bufferW;
    const height = this._bufferH;
    // Remove watermark from here
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

  _drawScanlines() {
    const ctx = this._bufferCtx;
    const width = this._bufferW;
    const height = this._bufferH;
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#000";
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }
    ctx.restore();
  }

  _drawBandShift() {
    const ctx = this._bufferCtx;
    const width = this._bufferW;
    const height = this._bufferH;
    const bandHeight = Math.floor(height / (6 + Math.random() * 6));
    for (let y = 0; y < height; y += bandHeight) {
      const shift = (Math.random() - 0.5) * 20;
      ctx.save();
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
        bandHeight
      );
      ctx.restore();
    }
  }

  _drawWavyDistortion() {
    const ctx = this._bufferCtx;
    const width = this._bufferW;
    const height = this._bufferH;
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

  _drawColorBars() {
    const ctx = this._bufferCtx;
    const width = this._bufferW;
    const height = this._bufferH;
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

  _drawRollingLines() {
    const ctx = this._bufferCtx;
    const width = this._bufferW;
    const height = this._bufferH;
    for (let i = 0; i < 2; i++) {
      const y = Math.floor(Math.random() * height);
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = `rgb(${(Math.random() * 255) | 0},${
        (Math.random() * 255) | 0
      },${(Math.random() * 255) | 0})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      ctx.restore();
    }
  }

  _drawNoSignalBar() {
    const ctx = this._bufferCtx;
    const width = this._bufferW;
    const height = this._bufferH;
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#fff";
    const barHeight = Math.max(4, Math.floor(height * 0.08));
    const y = Math.floor(Math.random() * (height - barHeight));
    ctx.fillRect(0, y, width, barHeight);
    ctx.restore();
  }

  _drawBlockyGlitch() {
    const ctx = this._bufferCtx;
    const width = this._bufferW;
    const height = this._bufferH;
    ctx.save();
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
    ctx.restore();
  }

  _animate() {
    // Throttle to 20fps
    const now = performance.now();
    if (now - this._lastFrameTime < 50) {
      this._animationFrame = requestAnimationFrame(this._animate.bind(this));
      return;
    }
    this._lastFrameTime = now;
    const ctx = this._bufferCtx;
    ctx.clearRect(0, 0, this._bufferW, this._bufferH);
    let colorStatic = Math.random() < 0.15;
    let blocky = false;

    // Handle effects
    if (this._effect) {
      this._effectProgress++;
      if (this._effect === "scramble") {
        blocky = true;
        this._drawStatic(true, true);
        this._drawBandShift();
        this._drawWavyDistortion();
        if (Math.random() < 0.3) this._drawColorBars();
        if (Math.random() < 0.5) this._drawRollingLines();
      } else if (this._effect === "roll") {
        this._drawStatic(colorStatic);
        ctx.save();
        const rollAmount = Math.sin(this._effectProgress / 5) * 10;
        if (Math.random() < 0.5) {
          ctx.translate(0, rollAmount);
        } else {
          ctx.translate(rollAmount, 0);
        }
        ctx.drawImage(this._buffer, 0, 0);
        ctx.restore();
      } else if (this._effect === "flash") {
        this._drawStatic(colorStatic);
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, this._bufferW, this._bufferH);
        ctx.restore();
      } else if (this._effect === "bar") {
        this._drawStatic(colorStatic);
        this._drawNoSignalBar();
      } else if (this._effect === "glitch") {
        this._drawStatic(colorStatic);
        this._drawBlockyGlitch();
      }
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
        this._effectTimer = window.setTimeout(() => {
          const effects = ["roll", "flash", "bar", "glitch", "scramble"];
          this._effect = effects[
            Math.floor(Math.random() * effects.length)
          ] as any;
          this._effectProgress = 0;
          this._effectTimer = null;
        }, 1000 + Math.random() * 1000);
      }
    }
    this._drawScanlines();
    // Draw watermark on top of everything
    this._drawBackgroundVirusText(0.18);
    // Draw buffer to main canvas, scaled up
    const mainCtx = this.canvas.getContext("2d")!;
    mainCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    mainCtx.imageSmoothingEnabled = false;
    mainCtx.drawImage(
      this._buffer,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );
    this._animationFrame = requestAnimationFrame(this._animate.bind(this));
  }

  show() {
    if (this._isShown) return;
    this._isShown = true;
    document.body.appendChild(this.canvas);
    this._resize();
    window.addEventListener("resize", this._resizeHandler);
    this._animate();
  }

  hide() {
    if (!this._isShown) return;
    this._isShown = false;
    window.removeEventListener("resize", this._resizeHandler);
    if (this._animationFrame) cancelAnimationFrame(this._animationFrame);
    if (this._effectTimer) clearTimeout(this._effectTimer);
    this._effect = null;
    this._effectProgress = 0;
    if (this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);
  }
}
