var $logo = $('<strong id="logo">THIS IS<br>NOT A<br>VIRUS</strong>');
$logo.appendTo($container);
var bgs = ['#000000', '#00ffbd', '#ffff00', '#bege76'];

var center_everything = function(){
  log('center_everything');
  log(WIDTH);
  log(HEIGHT);
  WIDTH = window.innerWidth;
  HEIGHT = window.innerHeight;
  log(WIDTH);
  log(HEIGHT);

  _.delay(function(){
  	$container.css({
  		'width': WIDTH + 'px',
  		'height': HEIGHT + 'px',
  	});

  	$logo.css({
  		'top': (HEIGHT/2) - ($logo.height() / 2) + 'px',
  		'left': (WIDTH/2) - ($logo.width() / 2) + 'px',
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

    center_everything();
  }

  window.onorientationchange = readDeviceOrientation;
}

$(function(){
  $container.append(create_canvas());
  $body = $('body');

  center_everything();

  $(window).resize(function(){
    center_everything();
  });

  change_text_color();
});

$(window).load(readDeviceOrientation());
