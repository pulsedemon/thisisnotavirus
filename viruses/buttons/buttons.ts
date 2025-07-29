import "./buttons.scss";

import { draggable, isMobile, preloadImage, shuffle } from "../../utils/misc";
import Random from "../../utils/random";

class Buttons {
  container: HTMLElement;
  width: number;
  height: number;
  buttonClasses = ["button-54", "button-49", "button-triangle"];
  grid: string[] = [];
  imageGridSize = 55;
  gridCols: number;
  gridRows: number;
  imagesUsed: string[] = [];
  images: string[] = [];
  topzIndex = 2;
  buttonText = [
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

  constructor() {
    this.container = document.getElementById("container")!;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.gridCols = Math.ceil(this.width / this.imageGridSize);
    this.gridRows = Math.ceil(this.height / this.imageGridSize);

    void fetch("/viruses/buttons/images.json")
      .then((response) => response.json())
      .then((data: { images: string[] }) => {
        this.images = data.images;
        this.images.forEach((i) => preloadImage(i));
        this.assignImages();
      });
  }

  addRandomButton() {
    const coords = b.getRandomCoords();
    const button = document.createElement("button");
    button.type = "button";
    button.style.top = `${coords.y}px`;
    button.style.left = `${coords.x}px`;
    button.innerText = this.buttonText[Random.int(this.buttonText.length)];
    button.classList.add(
      this.buttonClasses[Random.int(this.buttonClasses.length)]
    );
    this.container.appendChild(button);
  }

  assignImages() {
    const totalCells = this.gridRows * this.gridCols;

    for (let i = 0; i < totalCells; i++) {
      this.grid.push(this.getRandomImage());
    }
  }

  appendImages(): void {
    this.grid.forEach((imgSrc, i) => {
      const image = document.createElement("img");
      image.src = imgSrc;

      const coords = this.getRandomCoordsForCell(i + 1);
      image.style.top = `${coords.y}px`;
      image.style.left = `${coords.x}px`;

      const filename = image.src.split("/").slice(-1)[0].split(".")[0];
      image.classList.add(filename);
      this.container.appendChild(image);

      draggable(image);

      image.addEventListener(isMobile ? "touchstart" : "mousedown", (e) => {
        this.bringToTop(e.target);
      });
    });
  }

  bringToTop(el: EventTarget | null) {
    const element = el as HTMLElement;
    element.style.zIndex = `${(this.topzIndex += 1)}`;
  }

  getRandomImage(): string {
    this.images = shuffle(this.images);
    if (this.imagesUsed.length === this.images.length) this.imagesUsed = [];
    if (this.imagesUsed.includes(this.images[0])) return this.getRandomImage();
    this.imagesUsed.push(this.images[0]);
    return this.images[0];
  }

  getRandomCoords() {
    const randomX = Random.int(this.width);
    const randomY = Random.int(this.height);

    return {
      x: randomX - 40,
      y: randomY - 40,
    };
  }

  getRandomCoordsForCell(cell: number) {
    const col = cell % this.gridCols == 0 ? 1 : cell % this.gridCols;
    const row = Math.ceil(cell / this.gridCols);

    const startingX = col * this.imageGridSize - this.imageGridSize;
    const endingX = startingX + this.imageGridSize;

    const startingY = row * this.imageGridSize - this.imageGridSize;
    const endingY = startingY + this.imageGridSize;

    return {
      x: Random.numberBetween(startingX, endingX) - 40,
      y: Random.numberBetween(startingY, endingY) - 40,
    };
  }
}

const b = new Buttons();

let initialButtonCount = 450;
if (b.width <= 700) {
  initialButtonCount = 300;
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

const explosions: string[] = [
  "/viruses/buttons/explosions/nukeexplosion1.gif",
  "/viruses/buttons/explosions/explosion1.gif",
];

document.addEventListener("click", function (e) {
  if (!e.target) return;
  const target = e.target as HTMLButtonElement;
  if (target.type !== "button") return;

  continueAddingButtons = false;

  requestAnimationFrame(() => {
    b.appendImages();
  });

  const buttons = document.querySelectorAll<HTMLElement>("button[type=button]");
  requestAnimationFrame(() => {
    buttons.forEach((el) => {
      const explode = document.createElement("img");
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
        buttons.forEach((buttonEl) => buttonEl.remove());
      }, 1000);
    });
  });

  setTimeout(() => {
    const css = "img { z-index: 2; }";
    const styleSheet = document.createElement("style");
    styleSheet.innerText = css;
    document.head.appendChild(styleSheet);
  }, 1000);
});
