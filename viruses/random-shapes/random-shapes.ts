import Random from "../../utils/random";

class RandomBlocks {
  screenWidth!: number;
  screenHeight!: number;
  locations: string[] = [];
  count = 0;
  blocksAppended = 0;
  canvas!: HTMLCanvasElement;
  maybe = Random.bool();

  canvasCtx!: CanvasRenderingContext2D;
  blockSize = Random.numberBetween(10, 30);
  container = document.getElementById("container")!;
  bgColors = ["black", "aqua", "red"];

  constructor() {
    document.body.style.backgroundColor =
      this.bgColors[Random.numberBetween(0, this.bgColors.length)];
    this.canvas = document.createElement("canvas");
    this.canvasCtx = this.canvas.getContext("2d")!;
    this.container.appendChild(this.canvas);
    this.setVariables();

    this.update();

    window.addEventListener("resize", () => this.onWindowResize(), false);
  }

  setVariables() {
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;
    this.screenWidth = this.canvas.width;
    this.screenHeight = this.canvas.height;
  }

  onWindowResize() {
    this.setVariables();
  }

  update() {
    for (let i = 0; i < 200; i++) this.add(this.blockSize);
    requestAnimationFrame(() => {
      this.update();
    });
  }

  add(size: number) {
    const randomXNumber = this.randomXAxis(size);
    const randomYNumber = this.randomYAxis(size);

    const position: number[] = [randomXNumber, randomYNumber];
    if (!~this.locations.indexOf(position.join(""))) {
      if (this.maybe) {
        this.triangle(position);
      } else {
        this.addSquare(position);
      }
    }

    this.blocksAppended++;

    this.locations.push(position as unknown as string);
    this.count++;
  }

  addSquare(position: number[]) {
    const randomColor = Random.rgbColor();
    const xPosition = position[0];
    const yPosition = position[1];

    this.canvasCtx.fillStyle = "rgb(" + randomColor + ")";
    this.canvasCtx.fillRect(
      xPosition,
      yPosition,
      this.blockSize,
      this.blockSize
    );

    this.blocksAppended++;

    this.locations.push(position as unknown as string);
    this.count++;
  }

  triangle(position: number[]) {
    const randomColor = Random.rgbColor();
    const xPosition = position[0];
    const yPosition = position[1];

    this.canvasCtx.fillStyle = `rgb(${randomColor})`;

    const path = new Path2D();
    path.moveTo(xPosition + this.blockSize, yPosition);
    path.lineTo(xPosition, yPosition - this.blockSize / 1);
    path.lineTo(xPosition - this.blockSize, yPosition);
    this.canvasCtx.fill(path);
  }

  randomXAxis(size: number): number {
    return Math.round((Math.random() * this.screenWidth) / size) * size;
  }

  randomYAxis(size: number): number {
    return Math.round((Math.random() * this.screenHeight) / size) * size;
  }
}

new RandomBlocks();
