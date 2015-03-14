(function(root){ // module wrapper
  var $container = $('#container');

  var Flash = root.Flash = {};

  var canvas = $("<canvas id='stage'>")
    , screenWidth = null
    , screenHeight = null
    , canvasCtx
  ;

  /**
   * Generate random RGB code
   * @return {string} RGB code generated
   */
  Flash.randomColor = function () {
    return '' + (Math.round((Math.random() * 256 )) + ',' + Math.round((Math.random() * 256 )) + ',' + Math.round((Math.random() * 256 )));
  };

  Flash.init = function () {
    screenWidth = $(window).width();
    screenHeight = $(window).height();
    canvas = canvas.appendTo('#container')[0]
    canvas.width = screenWidth;
    canvas.height = screenHeight;
    canvasCtx = canvas.getContext('2d')

    Flash.update();
  }

  Flash.update = function () {
    var randomColor = Flash.randomColor();
    console.log(randomColor);
    canvasCtx.fillStyle = 'rgb(' + randomColor + ')';
    canvasCtx.fillRect(0, 0 , screenWidth, screenHeight);
    window.requestAnimationFrame(Flash.update);
  }
})(this);

$(function(){
  Flash.init();
});