import "./faces.scss";
import Random from "../../utils/random";

class Faces {
  eyes = document.querySelectorAll<HTMLElement>(".eye");

  eyeClasses = ["x", "pupil"];

  constructor() {
    const eyeClass = Random.itemInArray(this.eyeClasses);
    this.eyes.forEach((e) => {
      e.classList.add(eyeClass);
    });
  }

  blink(eye?: any) {
    if (!eye) eye = this.eyes;
    else eye = [eye];

    return new Promise((resolve, reject) => {
      eye.forEach((el: HTMLElement) => {
        el.classList.add("blink");
      });
      setTimeout(() => {
        eye.forEach((el: HTMLElement) => {
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
faces.blink().then(() => faces.blink());

setInterval(() => {
  setTimeout(() => {
    faces.blink().then(() => faces.blink());
  }, 1000);
}, 5000);

document.querySelectorAll("#face .eye").forEach((eye) => {
  eye.addEventListener("click", (e) => {
    faces.blink(e.target);
  });
});
