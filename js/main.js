var WIDTH = window.innerWidth,
    HEIGHT = window.innerHeight;
var $container = $('#container');
var $menu = $('#menu');

function load_css(url) {
    var link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = url;
    document.getElementsByTagName("head")[0].appendChild(link);
}

var viruses = [
  'snow-storm.js',
  'uzumaki.js',
  'random-blocks.js'
];

function setLastVirus(virus) {
  document.cookie="lastVirus=" + virus;
}

function getLastVirus() {
  var name = "lastVirus=";
  var ca = document.cookie.split(';');
  for(var i=0; i<ca.length; i++) {
    var c = ca[i].trim();
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

var load_this = Math.floor((Math.random() * viruses.length));
while (getLastVirus() == viruses[load_this]) {
  load_this = Math.floor((Math.random() * viruses.length));
}
console.log(load_this);

Detect.device();

var random_times = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000];
var this_time = Math.floor((Math.random() * random_times.length));

var reload = setInterval(function(){
  location.reload(true);
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

require([viruses[load_this]], function($) {
  setLastVirus(viruses[load_this]);
});

define("main", function(){});
