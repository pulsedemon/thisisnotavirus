const viruses = ["random-blocks", "uzumaki", "snow-storm", "flash", "waves"];

const random_times = [
  1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000,
  13000, 14000, 15000,
];

let loadRandomInterval;
const loadRandomVirus = () => {
  const randomVirus = viruses[Math.floor(Math.random() * viruses.length)];

  if (getLastVirusLoaded() === randomVirus) return loadRandomVirus();

  document.getElementById(
    "container"
  ).src = `/viruses/${randomVirus}/index.html`;

  setLastVirusLoaded(randomVirus);

  clearInterval(loadRandomInterval);

  let this_time = Math.floor(Math.random() * random_times.length);
  loadRandomInterval = setInterval(function () {
    return loadRandomVirus();
  }, random_times[this_time]);
};

const getLastVirusLoaded = () => {
  return localStorage.getItem("lastVirusLoaded");
};

const setLastVirusLoaded = (virus) => {
  return localStorage.setItem("lastVirusLoaded", virus);
};

loadRandomVirus();

window.addEventListener("orientationchange", function(event) {
  loadRandomVirus();
});
