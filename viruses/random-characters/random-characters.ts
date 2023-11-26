import "./random-characters.scss";
import Random from "../../utils/random";

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
      string += this.characters.charAt(Random.int(this.characters.length));
    }

    string = this.insertRandomEmoji(string);
    string = this.insertRandomEmoji(string);
    string = this.insertRandomEmoji(string);

    return string;
  }

  insertRandomEmoji(string: string): string {
    const pos = Random.int(string.length);
    string =
      string.slice(0, pos) +
      this.emojis[Random.int(this.emojis.length)] +
      string.slice(pos);
    return string;
  }

  doAnimation() {
    requestAnimationFrame(() => this.doAnimation());
    this.drawText();
  }

  drawText() {
    const context = this.canvas.getContext("2d")!;
    context.font = "25px monospace";
    context.fillStyle = "#000000";
    context.textBaseline = "middle";
    this.text = this.randomString(this.randomStringLength);
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.fillText(this.text, this.xloc, this.yloc);
  }
}

const canvasHeight = 28;

appendCanvases();

function appendCanvases() {
  const numCanvases = Math.ceil(
    document.getElementById("container")!.clientHeight / canvasHeight
  );
  for (let i = 0; i < numCanvases; i++) {
    const canvas = document.createElement("canvas");
    canvas.height = canvasHeight;
    document.getElementById("container")!.appendChild(canvas);
    canvas.width = canvas.clientWidth;

    const rc = new RandomCharacters(canvas, 15);
    rc.doAnimation();
  }
}

let resizeStop: any;
window.addEventListener(
  "resize",
  () => {
    clearTimeout(resizeStop);
    resizeStop = setTimeout(() => {
      const currentCanvases = document.querySelectorAll("#container canvas");
      currentCanvases.forEach((el) => {
        el.remove();
      });
      appendCanvases();
    }, 200);
  },
  false
);
