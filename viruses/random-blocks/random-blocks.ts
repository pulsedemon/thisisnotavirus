import Random from "../../utils/random";

class RandomBlocks {
  screenWidth!: number;
  screenHeight!: number;
  locations: string[] = [];
  count = 0;
  blocksAppended = 0;
  canvas!: HTMLCanvasElement;

  canvasCtx!: CanvasRenderingContext2D;
  blockSize = Random.numberBetween(4, 20);
  container = document.getElementById("container")!;
  bgColors = ["black", "white", "aqua", "red"];

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
    const randomXNumber = this.randomXAxis(size) as unknown as string;
    const randomYNumber = this.randomYAxis(size) as unknown as string;

    const position: string[] = [randomXNumber, randomYNumber];
    if (!~this.locations.indexOf(position.join(""))) {
      const randomColor = Random.rgbColor();
      const xPosition = position[0] as unknown as number;
      const yPosition = position[1] as unknown as number;

      this.canvasCtx.fillStyle = "rgb(" + randomColor + ")";
      this.canvasCtx.fillRect(xPosition, yPosition, size, size);

      this.blocksAppended++;

      this.locations.push(position as unknown as string);
      this.count++;
    }
  }

  randomXAxis(size: number): number {
    return Math.round((Math.random() * this.screenWidth) / size) * size;
  }

  randomYAxis(size: number): number {
    return Math.round((Math.random() * this.screenHeight) / size) * size;
  }
}

new RandomBlocks();
