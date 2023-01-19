import { shuffle } from "../../util.js";

class Buttons {
  container;
  width;
  height;
  buttonClasses = ["button-54", "button-49"];
  imagesUsed: Array<string> = [];
  images: Array<string>;

  constructor() {
    this.container = document.getElementById("container");
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    fetch("/viruses/buttons/images.json")
      .then((response) => response.json())
      .then((data) => {
        this.images = data.images;
      });
  }

  addRandomButton() {
    let button = document.createElement("button");
    button.type = "button";
    let coords = b.getRandomCoords();
    button.style.top = `${coords.y}px`;
    button.style.left = `${coords.x}px`;
    button.innerText = "Click Me";
    button.classList.add(
      this.buttonClasses[Math.floor(Math.random() * this.buttonClasses.length)]
    );
    this.container.appendChild(button);
  }

  addRandomImage() {
    let image = document.createElement("img");
    this.images = shuffle(this.images);
    if (this.imagesUsed.length === this.images.length) this.imagesUsed = [];
    if (this.imagesUsed.includes(this.images[0])) return this.addRandomImage();
    image.src = this.images[0];
    let coords = b.getRandomCoords();
    image.style.top = `${coords.y}px`;
    image.style.left = `${coords.x}px`;

    let filename = image.src.split("/").slice(-1)[0].split(".")[0];

    image.classList.add(filename);

    this.container.appendChild(image);
    this.imagesUsed.push(this.images[0]);
  }

  getRandomCoords() {
    const randomX = Math.floor(Math.random() * this.width);
    const randomY = Math.floor(Math.random() * this.height);

    return {
      x: randomX - 15,
      y: randomY - 15,
    };
  }
}

let b = new Buttons();

let numInitialButtons = 0;
function initButtons() {
  setTimeout(function () {
    numInitialButtons++;
    b.addRandomButton();
    if (numInitialButtons < 10) {
      initButtons();
    }
  }, 200);
}
initButtons();

setInterval(() => {
  b.addRandomButton();
}, 3000);

let explosions: Array<string> = [
  "/viruses/buttons/explosions/nukeexplosion1.gif",
  "/viruses/buttons/explosions/explosion1.gif",
  "/viruses/buttons/explosions/nukeexplosion2.gif",
  "/viruses/buttons/explosions/explosion2.gif",
  "/viruses/buttons/explosions/nukeexplosion3.gif",
  "/viruses/buttons/explosions/explosion3.gif",
  "/viruses/buttons/explosions/nukeexplosion4.gif",
  "/viruses/buttons/explosions/explosion4.gif",
  "/viruses/buttons/explosions/nukeexplosion5.gif",
  "/viruses/buttons/explosions/explosion5.gif",
];

document.addEventListener("click", function (e: any) {
  if (!e.target) return;
  if (e.target.type === "button") {
    for (let x = 0; x < 10; x++) {
      b.addRandomImage();
    }

    let explode = document.createElement("img");
    explode.src = explosions[0];
    explode.style.top = `${
      parseInt(e.target.style.top.replace("px", "")) - 25
    }px`;
    explode.style.left = `${
      parseInt(e.target.style.left.replace("px", "")) +
      Math.floor(e.target.clientWidth / 2) -
      78 / 2
    }px`;

    b.container.appendChild(explode);

    explosions.push(explosions.shift()!);

    let fadeEffect = setInterval(() => {
      if (!e.target.style.opacity) {
        e.target.style.opacity = 1;
      }
      if (e.target.style.opacity > 0) {
        e.target.style.opacity -= 0.1;
      } else {
        clearInterval(fadeEffect);
        try {
          b.container.removeChild(e.target);
        } catch {
          console.error("trouble removing button?");
        }

        setTimeout(function () {
          b.container.removeChild(explode);
        }, 500);
      }
    }, 80);
  }
});
