import "./emoji.scss";
import UAParser from "ua-parser-js";
import { randomInt } from "../../util";

const usparser = new UAParser();
const isMobile = usparser.getResult().device.type === "mobile" ? true : false;

const size = isMobile ? 50 : 70;
const container = document.getElementById("container")!;
container.style.lineHeight = `${size}px`;
container.style.fontSize = `${size}px`;

const bgColors = ["black", "red", "aqua"];
const emojis = [
  "👻",
  "🙂",
  "😎",
  "🔪",
  "👾",
  "🤘",
  "🙃",
  "🙁",
  "🥳",
  "😍",
  "✌🏻",
  "✌🏾",
  "🤘🏻",
  "🫀",
];

function forwards() {
  document.body.style.backgroundColor = bgColors[randomInt(bgColors.length)];
  const emoji = emojis[randomInt(emojis.length)];
  const interval = setInterval(() => {
    container.innerHTML += emoji;
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
