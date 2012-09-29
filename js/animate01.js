$(document).ready(function(){
	screen_width = screen.width;
	screen_height = screen.height;
	$body = $('body');
	$h1 = $('h1');

	bgs = ['#000000', '#00ffbd', '#ffff00', '#bege76'];

	$h1.css({
		'left': ($('html').width()/2)-(747/2)+'px',
		'top': ($('html').height()/2)-(62/2)+'px'
	});

	var dot = document.createDocumentFragment();

	setInterval(function(){
		x = Math.random()*screen_width;
		y = Math.random()*screen_height;

	  var html = '<div style="top:'+y+'px; left:'+x+'px;"></div>';

		dot.innerHTML = html;
		$body.append(html);

		document.title = x*y*538531294576739;

		rand = Math.floor(Math.random()*6);

		$h1.css('background-color', bgs[rand]);
	}, 5);
});