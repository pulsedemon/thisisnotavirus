var $logo = $('<strong id="logo">THIS IS<br>NOT A<br>VIRUS</strong>');
$logo.appendTo($container);
var bgs = ['#000000', '#00ffbd', '#ffff00', '#bege76'];

var center_everything = function(){
  log('center_everything');
  WIDTH = window.innerWidth;
  HEIGHT = window.innerHeight;

  _.delay(function(){
  	$container.css({
  		'width': WIDTH + 'px',
  		'height': HEIGHT + 'px',
  	});

  	$logo.css({
  		'top': (HEIGHT/2) - ($logo.height() / 2) + 'px',
  		'left': (WIDTH/2) - ($logo.width() / 2) + 'px',
      'visibility': 'visible'
  	});
  }, 50);
}

function change_text_color() {
	var rand = Math.floor(Math.random()*6);

	$logo.css('color', bgs[rand]);

	requestAnimationFrame(change_text_color);
}

function create_canvas() {
  window.canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  window.context = canvas.getContext('2d');
  render();

  return canvas;
}

function render() {
	var x = Math.random()*WIDTH;
	var y = Math.random()*HEIGHT;
  window.context.fillRect(x,y,2,2);
  requestAnimationFrame(render);
}

if(Detect.mobile()) {
  function readDeviceOrientation(){
    center_everything();
    switch (window.orientation) {
      case 0:
      case 180:
        log('Portrait');
        $logo.html('THIS IS<br>NOT A<br>VIRUS');
        $logo.css({
          'fontSize': '80px',
          'lineHeight': '80px'
        });
        break;
      case -90:
      case 90:
        log('Landscape');
        $logo.html('THIS IS NOT<br>A VIRUS');
        $logo.css({
          'fontSize': '70px',
          'lineHeight': '70px'
        });
        break;
    }
  }

  window.onorientationchange = readDeviceOrientation;
}
center_everything();

$(function(){
  $container.append(create_canvas());
  $body = $('body');

  $(window).resize(function(){
    center_everything();
  });

  change_text_color();
});

$(window).load(readDeviceOrientation());
