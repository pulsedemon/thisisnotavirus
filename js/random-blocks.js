(function(root){ // module wrapper
  'use strict';

  // expose `RandomBlocks` globally
  var RandomBlocks = root.RandomBlocks = {};

  /**
   * define some variables
   */
  var $block = $('<div class="block"></div>')
    , screenWidth = null
    , screenHeight = null
    , locations = []
    , screenCoordinates = []
    , screenCoordinatesPlotted = []
    , count = 0
    , numberOfBlocks = 0
    , blocksAppended = 0
    , start = new Date().getTime()
    , end
    , executionTime
  ;

  /**
   * start the colored block extravaganza
   */
  RandomBlocks.init = function(){
    screenWidth = $(window).width();
    screenHeight = $(window).height();
    console.log('screenWidth:', screenWidth);
    console.log('screenHeight:', screenHeight);

    numberOfBlocks = RandomBlocks.calculateNumberOfBlocks();

    console.log('Blocks needed to fill screen: ', numberOfBlocks);

    // Keep adding blocks until the screen is full
    var addBlocksInterval = setInterval(function(){
      RandomBlocks.add();

      if (count == numberOfBlocks) {
        clearInterval(addBlocksInterval);
        console.log('fin');
        console.log(locations);

        executionTime = RandomBlocks.calculateExecutionTime();

        console.log('Execution time: ', executionTime);
      }
    }, 1);
  };

  RandomBlocks.calculateExecutionTime = function() {
    end = new Date().getTime();
    var executionTimeMilliseconds = end - start;

    var executionTimeInSeconds = executionTimeMilliseconds * 0.001;

    executionTime = executionTimeInSeconds + ' seconds';

    return executionTime;
  };

  /**
   * The number of blocks required to fill the screen
   * @return {int} numberOfBlocks
   */
  RandomBlocks.calculateNumberOfBlocks = function() {
    var numBlocksAcross = screenWidth / 10;
    var numBlocksDown = screenHeight / 10;

    return Math.ceil(numBlocksAcross * numBlocksDown);
  };

  /* todo */
  RandomBlocks.calculateScreenCoordinates = function() {
    var numBlocksAcross = screenWidth / 10;
    var numBlocksDown = screenHeight / 10;
  };

  /**
   * Add a random block
   * @return nothing
   */
  RandomBlocks.add = function(){
    var position;
    var randomXNumber = RandomBlocks.randomXAxis();
    var randomYNumber = RandomBlocks.randomYAxis();

    var position = '' + randomXNumber + 'x' + randomYNumber;
    if (!~locations.indexOf(position)) {
      var randomColor = RandomBlocks.randomColor();
      var xPosition = position.split('x')[0];
      var yPosition = position.split('x')[1];

      $block.clone().css({
        'background': 'rgb(' + randomColor + ')',
        'left': xPosition + 'px',
        'top': yPosition + 'px',
      })
      .appendTo('#container');

      blocksAppended++;

      if (blocksAppended % 500 === 0) console.log('Blocks appended: ', blocksAppended);

      locations.push(position);
      count++;
    }
  };

  /**
   * Random X axis that is divisible by 10
   * @return {int} Random X axis
   */
  RandomBlocks.randomXAxis = function(){
    return Math.round(
      (Math.random() * screenWidth) / 10
    ) * 10;
  };

  /**
   * Random Y axis that is divisible by 10
   * @return {int} Random Y axis
   */
  RandomBlocks.randomYAxis = function(){
    return Math.round(
        (Math.random() * screenHeight) / 10
    ) * 10;
  };

  /**
   * Generate random RGB code
   * @return {string} RGB code generated
   */
  RandomBlocks.randomColor =  function (){
    return '' + (Math.round((Math.random() * 256 )) + ',' + Math.round((Math.random() * 256 )) + ',' + Math.round((Math.random() * 256 )));
  };

})(this);

$(function(){
  RandomBlocks.init(); // Run when doc ready
});
