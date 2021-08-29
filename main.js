const viruses = [
  "/viruses/random-blocks/index.html",
  "/viruses/uzumaki/index.html",
  "/viruses/snow-storm/index.html",
  "/viruses/flash/index.html",
];
document.getElementById("container").src =
  viruses[Math.floor(Math.random() * viruses.length)];
