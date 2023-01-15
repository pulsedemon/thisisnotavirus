import { shuffle } from "../../util.js";

class Buttons {
  container = document.getElementById("container");
  width = container.clientWidth;
  height = container.clientHeight;
  buttonClasses = ["button-54", "button-74"];
  imagesUsed = [];

  constructor() {
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
    // button.classList.add('')
  }

  addRandomImage() {
    let image = document.createElement("img");
    this.images = shuffle(this.images);
    console.log("this.imagesUsed", this.imagesUsed);
    if (this.imagesUsed.length === this.images.length) this.imagesUsed = [];
    if (this.imagesUsed.includes(this.images[0])) return this.addRandomImage();
    image.src = this.images[0];
    let coords = b.getRandomCoords();
    image.style.top = `${coords.y}px`;
    image.style.left = `${coords.x}px`;

    if (image.src.includes("troll-face")) {
      image.classList.add("wobble");
    }

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

document.addEventListener("click", function (e) {
  if (e.target.type === "button") {
    console.log("button clicked");
    b.addRandomImage();
    b.addRandomImage();
    b.addRandomImage();
    b.addRandomImage();
    b.addRandomImage();
    b.addRandomImage();
    b.addRandomImage();
    b.addRandomImage();
    b.addRandomImage();
    b.addRandomImage();
    e.target.parentNode.removeChild(e.target);
  }
});

let b = new Buttons();

b.addRandomButton();
b.addRandomButton();
b.addRandomButton();
b.addRandomButton();
b.addRandomButton();
b.addRandomButton();
b.addRandomButton();
b.addRandomButton();
b.addRandomButton();
b.addRandomButton();

setInterval(() => {
  b.addRandomButton();
}, 1000);
