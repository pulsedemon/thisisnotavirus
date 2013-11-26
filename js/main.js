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
  'random-blocks.js',
];

var load_this = Math.floor((Math.random() * viruses.length));
console.log(load_this);

var shit = [
  'Yo',
  "How's it going?",
  'THISISNOTAVIRUS',
  'Radical',
  "I don't care",
  "Uzumaki"
];

Detect.device();

$(document).ready(function(){
  load_shit();
});
$('#menu').on('click', load_shit);

function load_shit(){
  var load_shit = Math.floor((Math.random() * shit.length));
  log(shit[load_shit]);
  return false;
}

var random_times = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000, 13000, 14000, 15000];
var this_time = Math.floor((Math.random() * random_times.length));

var reload = setInterval(function(){
  log('test');
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

});

define("main", function(){});
