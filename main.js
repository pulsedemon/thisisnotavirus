// const viruses = ["random-blocks", "uzumaki", "snow-storm", "flash", "waves"];
const viruses = ["random-blocks", "uzumaki", "snow-storm", "flash"];
let last_virus;

const random_times = [
  1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000,
];

let loadRandomInterval;
const loadRandomVirus = () => {
  const randomVirus = viruses[Math.floor(Math.random() * viruses.length)];

  if (randomVirus === last_virus) {
    return;
  }

  if (getLastVirusLoaded() === randomVirus) return loadRandomVirus();

  document.getElementById(
    "container"
  ).src = `/viruses/${randomVirus}/index.html`;

  setLastVirusLoaded(randomVirus);

  clearInterval(loadRandomInterval);

  let random_time;
  let this_time;
  if (randomVirus === 'flash') {
    random_time = 400;
  }
  else {
    this_time = Math.floor(Math.random() * random_times.length);
    random_time = random_times[this_time]
  }
  loadRandomInterval = setInterval(function () {
    return loadRandomVirus();
  }, random_time);
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
