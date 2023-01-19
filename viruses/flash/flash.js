class Flash {
  canvas;
  screenWidth = null;
  screenHeight = null;
  canvasCtx;

  constructor() {
    this.canvas = document.createElement("canvas");
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
    document.getElementById("container").appendChild(this.canvas);
    this.canvas.width = this.screenWidth;
    this.canvas.height = this.screenHeight;
    this.canvasCtx = this.canvas.getContext("2d");

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

new Flash();
