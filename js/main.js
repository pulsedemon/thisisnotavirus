let WIDTH = window.innerWidth,
    HEIGHT = window.innerHeight;
const $container = $('#container');

function load_css(url) {
    var link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = url;
    document.getElementsByTagName("head")[0].appendChild(link);
}

const viruses = [
  'snow-storm.js',
  'uzumaki.js',
  'random-blocks.js',
  'flash.js',
];

function setLastVirus(virus) {
  document.cookie="lastVirus=" + virus;
}

function getLastVirus() {
  const name = "lastVirus=";
  const ca = document.cookie.split(';');
  for(let i=0; i<ca.length; i++) {
    const c = ca[i].trim();
    if (c.indexOf(name) === 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

let load_this = Math.floor((Math.random() * viruses.length));
while (getLastVirus() === viruses[load_this]) {
  load_this = Math.floor((Math.random() * viruses.length));
}
console.log(load_this);

Detect.device();

const random_times = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000];
const this_time = Math.floor((Math.random() * random_times.length));

setInterval(function(){
  window.location.reload(true);
}, random_times[this_time]);

define('snow-storm.js', function(){
  load_css('css/snow-storm.css');
  require(['js/' + viruses[load_this]]);
  log('loaded snow storm');
});

define('uzumaki.js', function(){
  load_css('css/uzumaki.css');
  require(['js/' + viruses[load_this]]);
  log('loaded uzumaki');
});

define('random-blocks.js', function(){
  load_css('css/random-blocks.css');
  require(['js/' + viruses[load_this]]);
  log('loaded random blocks');
});

define('flash.js', function(){
  load_css('css/flash.css');
  require(['js/' + viruses[load_this]]);
  log('loaded flash');
});

require([viruses[load_this]], function($) {
  setLastVirus(viruses[load_this]);
});

define("main", function(){});
