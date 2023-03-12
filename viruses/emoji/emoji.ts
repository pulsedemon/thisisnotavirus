import "./emoji.scss";
import UAParser from "ua-parser-js";
import { randomInt, randomNumberBetween } from "../../util";

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
  "🖕",
  "✌️",
  "🍺",
  "🤤",
];

function forwards() {
  document.body.style.backgroundColor = bgColors[randomInt(bgColors.length)];
  let emoji = emojis[randomInt(emojis.length)];
  const useAllEmoji = randomNumberBetween(1, 10) % 2 === 0 ? true : false;
  const interval = setInterval(() => {
    const randomClass = randomNumberBetween(1, 100) % 2 === 0 ? "wider" : "";
    if (useAllEmoji) emoji = emojis[randomInt(emojis.length)];
    container.innerHTML += `<span class="${randomClass}">${emoji}</span>`;
    if (container.clientHeight > document.body.clientHeight + 70) {
      clearInterval(interval);
      setTimeout(() => {
        backwards();
      }, 300);
    }
  }, 1);
}

function backwards() {
  const interval = setInterval(() => {
    container.innerHTML = container.innerHTML.slice(0, -13);
    if (container.innerHTML.length === 0) {
      clearInterval(interval);
      forwards();
    }
  }, 1);
}

forwards();
