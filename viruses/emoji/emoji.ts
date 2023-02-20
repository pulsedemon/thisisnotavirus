import "./emoji.scss";

const size = 70;
const container = document.getElementById("container")!;
container.style.lineHeight = `${size}px`;
container.style.fontSize = `${size}px`;

function forwards() {
  const interval = setInterval(() => {
    container.innerHTML += "🙂";
    if (container.clientHeight > document.body.clientHeight + 70) {
      clearInterval(interval);
      backwards();
    }
  }, 1);
}

function backwards() {
  const interval = setInterval(() => {
    container.innerHTML = container.innerHTML.slice(0, -2);
    if (container.innerHTML.length === 0) {
      clearInterval(interval);
      forwards();
    }
  }, 1);
}

forwards();
