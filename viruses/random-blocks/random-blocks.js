class RandomBlocks {
  screenWidth = null;
  screenHeight = null;
  locations = [];
  count = 0;
  numberOfBlocks = 0;
  blocksAppended = 0;

  canvasCtx;
  blockSize = 5;

  constructor() {
    const container = document.getElementById("container");
    this.canvas = document.createElement("canvas");
    document.getElementById("container").appendChild(this.canvas);
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;

    this.screenWidth = this.canvas.width;
    this.screenHeight = this.canvas.height;

    this.canvas.height = this.screenHeight;
    this.canvasCtx = this.canvas.getContext("2d");

    this.numberOfBlocks = this.calculateNumberOfBlocks();

    console.log("Blocks needed to fill screen: ", this.numberOfBlocks);

    this.update();
  }

  update() {
    for (let i = 0; i < 100; i++) this.add(this.blockSize);
    window.requestAnimationFrame(() => this.update());
  }

  calculateNumberOfBlocks() {
    let numBlocksAcross = this.screenWidth / this.blockSize;
    let numBlocksDown = this.screenHeight / this.blockSize;

    return Math.ceil(numBlocksAcross * numBlocksDown);
  }

  add(size) {
    let randomXNumber = this.randomXAxis(size);
    let randomYNumber = this.randomYAxis(size);

    let position = [randomXNumber, randomYNumber];
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

  randomXAxis(size) {
    return Math.round((Math.random() * this.screenWidth) / size) * size;
  }

  randomYAxis(size) {
    return Math.round((Math.random() * this.screenHeight) / size) * size;
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

new RandomBlocks();
