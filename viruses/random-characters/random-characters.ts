import { randomInt } from "../../util";

class RandomCharacters {
  text!: string;
  xloc = 0;
  yloc: number;
  randomStringLength = 170;
  characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()?;:[]{}<>,.+=≈~`/\\|-_"✖◕‿↼肉¿¡∞•ªº≠·■私';
  emojis = [..."🔪💊👾🤘✌🧠👁🦠🍷🍺🔥💧🎉🎮♥🩸🩻"];
  canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, ystart: number) {
    this.canvas = canvas;
    this.yloc = ystart;
  }

  randomString(length: number): string {
    let string = "";

    for (let i = 0; i < length; i++) {
      string += this.characters.charAt(randomInt(this.characters.length));
    }

    string = this.insertRandomEmoji(string);
    string = this.insertRandomEmoji(string);
    string = this.insertRandomEmoji(string);

    return string;
  }

  insertRandomEmoji(string: string): string {
    let pos = randomInt(string.length);
    string =
      string.slice(0, pos) +
      this.emojis[randomInt(this.emojis.length)] +
      string.slice(pos);
    return string;
  }

  doAnimation() {
    requestAnimationFrame(() => this.doAnimation());
    this.drawText();
  }

  drawText() {
    let context = this.canvas.getContext("2d")!;
    context.font = "25px monospace";
    context.fillStyle = "#000000";
    context.textBaseline = "middle";
    this.text = this.randomString(this.randomStringLength);
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.fillText(this.text, this.xloc, this.yloc);
  }
}

const canvasHeight = 28;
let numCanvases = Math.ceil(
  document.getElementById("container")!.clientHeight / canvasHeight
);

for (let i = 0; i < numCanvases; i++) {
  let canvas = document.createElement("canvas");
  canvas.height = canvasHeight;
  document.getElementById("container")!.appendChild(canvas);
  canvas.width = canvas.clientWidth;

  let rc = new RandomCharacters(canvas, 15);
  rc.doAnimation();
}
