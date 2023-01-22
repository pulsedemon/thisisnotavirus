import "./faces.scss";

class Faces {
  eyes = document.querySelectorAll<HTMLElement>(".eye");

  blink() {
    return new Promise((resolve, reject) => {
      this.eyes.forEach((el, key) => {
        el.classList.add("blink");
      });
      setTimeout(() => {
        this.eyes.forEach((el, key) => {
          el.classList.remove("blink");
        });
      }, 200);
      setTimeout(() => {
        resolve(this);
      }, 300);
    });
  }
}

const faces = new Faces();
setInterval(() => {
  setTimeout(() => {
    faces.blink().then(() => faces.blink());
  }, 1000);
}, 2000);
