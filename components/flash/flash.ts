export default class Flash {
  canvas: HTMLCanvasElement;
  screenWidth: number;
  screenHeight: number;
  canvasCtx: CanvasRenderingContext2D;

  constructor(el: HTMLCanvasElement) {
    this.canvas = el;
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
    this.canvas.width = this.screenWidth;
    this.canvas.height = this.screenHeight;
    this.canvasCtx = this.canvas.getContext("2d")!;

    this.update();
  }

  update() {
    const randomColor = this.randomColor();
    this.canvasCtx.fillStyle = "rgb(" + randomColor + ")";
    this.canvasCtx.fillRect(0, 0, this.screenWidth, this.screenHeight);
    window.requestAnimationFrame(() => this.update());
  }

  randomColor() {
    return (
      "" +
      (Math.round(Math.random() * 256) +
        "," +
        Math.round(Math.random() * 256) +
        "," +
        Math.round(Math.random() * 256))
    );
  }
}
