var WIDTH = window.innerWidth,
    HEIGHT = window.innerHeight;

var $dot = $('<div class="snowflake" style="top:10px; left:10px;"></div>');
var $logo = $('<h1>THIS IS NOT A VIRUS</h1>');

$(function(){
	$logo.appendTo($container);
	$body = $('body');
	$logo = $('h1');

	bgs = ['#000000', '#00ffbd', '#ffff00', '#bege76'];

	$container.css({
		'width': WIDTH + 'px',
		'height': HEIGHT + 'px',
	});

	$logo.css({
		'top': (HEIGHT/2) - ($logo.outerHeight() / 2) + 'px',
	});

	$(window).resize(function(){
		WIDTH = window.innerWidth;
    HEIGHT = window.innerHeight;
    $container.css({
			'width': WIDTH + 'px',
			'height': HEIGHT + 'px',
		});

		$logo.css({
		'top': (HEIGHT/2) - ($logo.outerHeight() / 2) + 'px',
	});
	});

	setInterval(function(){
		x = Math.random()*WIDTH;
		y = Math.random()*HEIGHT;

		var $new_dot = $dot.clone();
		$new_dot.css({
			'left': x + 'px',
			'top': y + 'px',
		});
		$container.append($new_dot);

		rand = Math.floor(Math.random()*6);

		$logo.css('color', bgs[rand]);
	}, 5);
});