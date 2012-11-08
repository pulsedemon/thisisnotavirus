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
  require(['js/' + viruses[load_this]]);
  console.log('try to load snow-storm');
});

define('animate02.js', function(){
  require(['js/' + viruses[load_this]]);
  console.log(viruses[load_this]);

  console.log('try to load animate02');
});

require([viruses[load_this]], function($) {

});

define("main", function(){});
