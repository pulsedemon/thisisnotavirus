class RandomCharacters {
  text;
  characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()?;:[]{}<>,.+=~`/\\|-_"';
  charactersLength = this.characters.length;
  constructor(canvas, ystart) {
    this.canvas = canvas;
    this.yloc = ystart;
    this.xloc = 0;
  }

  randomString(length) {
    let string = "";
    for (let i = 0; i < length; i++) {
      string += this.characters.charAt(
        Math.floor(Math.random() * this.charactersLength)
      );
    }
    return string;
  }

  doAnimation() {
    requestAnimationFrame(() => this.doAnimation());
    this.drawText();
  }
  drawText() {
    let context = this.canvas.getContext("2d");
    context.font = "28px monospace";
    context.fillStyle = "#000000";
    this.text = this.randomString(200);
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.fillText(this.text, this.xloc, this.yloc);
  }
}

const canvasHeight = 40;
let numCanvases = Math.ceil(
  document.getElementById("container").clientHeight / canvasHeight
);

for (let i = 0; i < numCanvases; i++) {
  let canvas = document.createElement("canvas");
  canvas.height = canvasHeight;
  document.getElementById("container").appendChild(canvas);
  canvas.width = canvas.clientWidth;

  let m = new RandomCharacters(canvas, 28);
  m.doAnimation();
}
