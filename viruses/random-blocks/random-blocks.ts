import { randomNumberBetween } from "../../util";

class RandomBlocks {
  screenWidth!: number;
  screenHeight!: number;
  locations: any = [];
  count: number = 0;
  numberOfBlocks: number = 0;
  blocksAppended: number = 0;
  canvas!: HTMLCanvasElement;

  canvasCtx!: CanvasRenderingContext2D;
  blockSize = randomNumberBetween(4, 10);
  container = document.getElementById("container")!;
  bgColors = ["black", "white", "aqua", "red"];

  constructor() {
    document.body.style.backgroundColor =
      this.bgColors[randomNumberBetween(0, this.bgColors.length)];
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
    this.numberOfBlocks = this.calculateNumberOfBlocks();
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

  calculateNumberOfBlocks(): number {
    let numBlocksAcross = this.screenWidth / this.blockSize;
    let numBlocksDown = this.screenHeight / this.blockSize;

    return Math.ceil(numBlocksAcross * numBlocksDown);
  }

  add(size: number) {
    let randomXNumber = this.randomXAxis(size);
    let randomYNumber = this.randomYAxis(size);

    const position: number[] = [randomXNumber, randomYNumber];
    if (!~this.locations.indexOf(position.join(""))) {
      let randomColor = this.randomColor();
      let xPosition = position[0];
      let yPosition = position[1];

      this.canvasCtx.fillStyle = "rgb(" + randomColor + ")";
      this.canvasCtx.fillRect(xPosition, yPosition, size, size);

      this.blocksAppended++;

      this.locations.push(position);
      this.count++;
    }
  }

  randomXAxis(size: number): number {
    return Math.round((Math.random() * this.screenWidth) / size) * size;
  }

  randomYAxis(size: number): number {
    return Math.round((Math.random() * this.screenHeight) / size) * size;
  }

  randomColor(): string {
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

new RandomBlocks();
