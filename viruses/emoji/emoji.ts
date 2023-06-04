import "./emoji.scss";
import { isMobile } from "../../utils/misc";
import Random from "../../utils/random";

const size = isMobile ? 40 : 50;
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
  document.body.style.backgroundColor = bgColors[Random.int(bgColors.length)];
  let emoji = emojis[Random.int(emojis.length)];
  const useAllEmoji = Random.numberBetween(1, 10) % 2 === 0 ? true : false;
  const interval = setInterval(() => {
    const randomClass = Random.numberBetween(1, 100) % 2 === 0 ? "wider" : "";
    if (useAllEmoji) emoji = emojis[Random.int(emojis.length)];
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
    container.innerHTML = container.innerHTML.slice(0, -(13 * 2));
    if (container.innerHTML.length === 0) {
      clearInterval(interval);
      forwards();
    }
  }, 1);
}

forwards();
