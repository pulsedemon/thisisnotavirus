class RandomCharacters {
  text;
  randomStringLength = 150;
  characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()?;:[]{}<>,.+=~`/\\|-_"✖◕‿↼';
  emojis = [..."🔪💊👾🤘✌🧠👁🦠🍷🍺🔥💧🎉🎮♥"];
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

    string = this.insertRandomEmoji(string);
    string = this.insertRandomEmoji(string);
    string = this.insertRandomEmoji(string);

    return string;
  }

  insertRandomEmoji(string) {
    let pos = Math.floor(Math.random() * string.length);
    string =
      string.slice(0, pos) +
      this.emojis[Math.floor(Math.random() * this.emojis.length)] +
      string.slice(pos);
    return string;
  }

  doAnimation() {
    requestAnimationFrame(() => this.doAnimation());
    this.drawText();
  }
  drawText() {
    let context = this.canvas.getContext("2d");
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
  document.getElementById("container").clientHeight / canvasHeight
);

for (let i = 0; i < numCanvases; i++) {
  let canvas = document.createElement("canvas");
  canvas.height = canvasHeight;
  document.getElementById("container").appendChild(canvas);
  canvas.width = canvas.clientWidth;

  let m = new RandomCharacters(canvas, 15);
  m.doAnimation();
}
