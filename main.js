const viruses = [
  "/viruses/random-blocks/index.html",
  "/viruses/uzumaki/index.html",
  "/viruses/snow-storm/index.html",
  "/viruses/flash/index.html",
];

const random_times = [
  1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
  13000, 14000, 15000,
];

let loadRandomInterval;
const loadRandom = () => {
  document.getElementById("container").src =
    viruses[Math.floor(Math.random() * viruses.length)];

  clearInterval(loadRandomInterval);

  let this_time = Math.floor(Math.random() * random_times.length);
  loadRandomInterval = setInterval(function () {
    loadRandom();
  }, random_times[this_time]);
};

loadRandom();
