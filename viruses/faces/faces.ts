import "./faces.scss";

class Faces {
  eyes = document.querySelectorAll<HTMLElement>(".eye");

  blink(eye?) {
    if (!eye) eye = this.eyes;
    else eye = [eye];

    return new Promise((resolve, reject) => {
      eye.forEach((el) => {
        el.classList.add("blink");
      });
      setTimeout(() => {
        eye.forEach((el) => {
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
