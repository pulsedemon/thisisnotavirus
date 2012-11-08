var $logo = $('<strong id="logo">THIS IS NOT A VIRUS</strong>');
$logo.appendTo($container);
var bgs = ['#000000', '#00ffbd', '#ffff00', '#bege76'];

$(function(){

	$container.append(create_canvas());
	$body = $('body');

	center_everything();

	$(window).resize(function(){
		WIDTH = window.innerWidth;
    HEIGHT = window.innerHeight;
    center_everything();
	});

	change_text_color();
});

function center_everything(){
	$container.css({
		'width': WIDTH + 'px',
		'height': HEIGHT + 'px',
	});

	$logo.css({
		'top': (HEIGHT/2) - ($logo.height() / 2) + 'px',
		'left': (WIDTH/2) - ($logo.width() / 2) + 'px',
	});
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
