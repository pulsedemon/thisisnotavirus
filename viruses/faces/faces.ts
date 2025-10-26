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

  blink(eye?: HTMLElement | HTMLElement[]) {
    if (!eye) eye = Array.from(this.eyes);
    else eye = Array.isArray(eye) ? eye : [eye];

    return new Promise((resolve) => {
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
  void faces.blink().then(() => faces.blink());
}, 700);

setInterval(() => {
  setTimeout(() => {
    void faces.blink().then(() => faces.blink());
  }, 1000);
}, 5000);

document.querySelectorAll("#face .eye").forEach((eye) => {
  eye.addEventListener("click", (e) => {
    void faces.blink(e.target as HTMLElement);
  });
});
