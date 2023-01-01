const colors = ["#ff0000", "#00ffff", "#ffffff"];
const randomColor = colors[Math.floor(Math.random() * colors.length)];
console.log(randomColor);

document.body.style.backgroundColor = randomColor;
