import "./faces.scss";
import Random from "../../utils/random";

class Faces {
  eyes = document.querySelectorAll<HTMLElement>(".eye");
  mouth = document.getElementById("mouth")!;

  eyeClasses = ["x", "pupil"];
  mouthClasses = ["smile", "monster", "bear"];

  constructor() {
    const eyeClass = Random.itemInArray(this.eyeClasses);
    const mouthClass = Random.itemInArray(this.mouthClasses);
    this.eyes.forEach((e) => {
      e.classList.add(eyeClass);
    });

    this.mouth.classList.add(mouthClass);
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
setTimeout(() => {
  faces.blink().then(() => faces.blink());
}, 700);

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
