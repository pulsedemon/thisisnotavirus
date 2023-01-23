import { shuffle, preloadImage } from "../../util.js";

class Buttons {
  container: HTMLElement;
  width: number;
  height: number;
  buttonClasses = ["button-54", "button-49"];
  imagesUsed: Array<string> = [];
  images: Array<string>;

  constructor() {
    this.container = document.getElementById("container")!;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    fetch("/viruses/buttons/images.json")
      .then((response) => response.json())
      .then((data) => {
        this.images = data.images;
        this.images.forEach((i) => preloadImage(i));
      });
  }

  addRandomButton() {
    const buttonText = [
      "Click Me",
      "私をクリック", // japanese
      "点我", // chinese (simplified)
      "Haz click en mi", // spanish
      "натисніть мене", // ukrainian
      "klik my", // afrikaans
      "кликнете на мене", // macedonian
      "Klick mich", // german
      "클릭 해주세요", // korean
      "нажми на меня", // russian
      "clique moi", // french
      "Klikk på meg", // norwegian
      "Klicka här", // swedish
      "pindutin mo ako", // filipino
      "Kliknij", // polish
      "Klik hier", // dutch
      "cliccami", // italian
    ];

    let button = document.createElement("button");
    button.type = "button";
    let coords = b.getRandomCoords();
    button.style.top = `${coords.y}px`;
    button.style.left = `${coords.x}px`;
    button.innerText =
      buttonText[Math.floor(Math.random() * buttonText.length)];
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
      x: randomX - 40,
      y: randomY - 40,
    };
  }
}

let b = new Buttons();

let initialButtonCount = 600;
let numRandomImages = 350;
if (b.width <= 700) {
  initialButtonCount = 300;
  numRandomImages = 150;
}

let numInitialButtons = 0;
let continueAddingButtons = true;
function initButtons() {
  setTimeout(function () {
    numInitialButtons++;
    b.addRandomButton();
    if (numInitialButtons < initialButtonCount && continueAddingButtons) {
      initButtons();
    }
  }, 20);
}
initButtons();

let explosions: Array<string> = [
  "/viruses/buttons/explosions/nukeexplosion1.gif",
  "/viruses/buttons/explosions/explosion1.gif",
];

document.addEventListener("click", function (e: any) {
  if (!e.target) return;
  if (e.target.type !== "button") return;

  continueAddingButtons = false;

  for (let x = 0; x < numRandomImages; x++) {
    b.addRandomImage();
  }

  const buttons = document.querySelectorAll<HTMLElement>("button[type=button]");
  buttons.forEach((el, key) => {
    let explode = document.createElement("img");
    explode.src = explosions[0];
    explode.style.top = `${parseInt(el.style.top.replace("px", "")) - 25}px`;
    explode.style.left = `${
      parseInt(el.style.left.replace("px", "")) +
      Math.floor(el.clientWidth / 2) -
      78 / 2
    }px`;

    b.container.appendChild(explode);
    explosions.push(explosions.shift()!);

    el.classList.add("fade-out");
    setTimeout(function () {
      b.container.removeChild(explode);
    }, 1500);
  });

  setTimeout(() => {
    const css = "img { z-index: 2; }";
    let styleSheet = document.createElement("style");
    styleSheet.innerText = css;
    document.head.appendChild(styleSheet);
  }, 1000);
});
