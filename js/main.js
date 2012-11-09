var WIDTH = window.innerWidth,
    HEIGHT = window.innerHeight;
var $container = $('#container');

function load_css(url) {
    var link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = url;
    document.getElementsByTagName("head")[0].appendChild(link);
}

var viruses = [
  'snow-storm.js',
  'animate02.js'
];

var load_this = Math.floor((Math.random() * viruses.length));


define('snow-storm.js', function(){
  load_css('css/snow-storm.css');
  console.log('loaded snow-storm');
});

define('animate02.js', function(){
  require(['js/' + viruses[load_this]]);
  console.log('loaded animate02');
});

require([viruses[load_this]], function($) {

});

define("main", function(){});


var shit = [
  'Yo',
  "How's it going?",
  'THISISNOTAVIRUS',
  'Radical'
];

$(document).ready(function(){
  load_shit();
});
$('#menu').on('click', load_shit);

function load_shit(){
  var load_shit = Math.floor((Math.random() * shit.length));
  console.log(shit[load_shit]);
  return false;
}

var reload = setInterval(function(){
  console.log('test');
  location.reload(true);
}, 5000);

