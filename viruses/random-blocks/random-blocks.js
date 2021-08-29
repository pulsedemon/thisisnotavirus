(function (root) {
  // module wrapper
  "use strict";

  // expose `RandomBlocks` globally
  var RandomBlocks = (root.RandomBlocks = {});

  /**
   * define some variables
   */
  var screenWidth = null,
    screenHeight = null,
    locations = [],
    screenCoordinates = [],
    screenCoordinatesPlotted = [],
    count = 0,
    numberOfBlocks = 0,
    blocksAppended = 0,
    start = new Date().getTime(),
    end,
    executionTime,
    canvas = $("<canvas id='stage'>"),
    canvasCtx,
    blockSize = 5;
  /**
   * start the colored block extravaganza
   */
  RandomBlocks.init = function () {
    screenWidth = $(window).width();
    screenHeight = $(window).height();
    console.log("screenWidth:", screenWidth);
    console.log("screenHeight:", screenHeight);

    canvas = canvas.appendTo("#container")[0];
    canvas.width = screenWidth;
    canvas.height = screenHeight;
    canvasCtx = canvas.getContext("2d");

    numberOfBlocks = RandomBlocks.calculateNumberOfBlocks();

    console.log("Blocks needed to fill screen: ", numberOfBlocks);

    function update() {
      for (let i = 0; i < 100; i++) RandomBlocks.add(blockSize);
      window.requestAnimationFrame(update);
    }
    update();
  };

  RandomBlocks.calculateExecutionTime = function () {
    end = new Date().getTime();
    var executionTimeMilliseconds = end - start;

    var executionTimeInSeconds = executionTimeMilliseconds * 0.001;

    executionTime = executionTimeInSeconds + " seconds";

    return executionTime;
  };

  /**
   * The number of blocks required to fill the screen
   * @return {int} numberOfBlocks
   */
  RandomBlocks.calculateNumberOfBlocks = function () {
    var numBlocksAcross = screenWidth / blockSize;
    var numBlocksDown = screenHeight / blockSize;

    return Math.ceil(numBlocksAcross * numBlocksDown);
  };

  /* todo */
  RandomBlocks.calculateScreenCoordinates = function () {
    var numBlocksAcross = screenWidth / blockSize;
    var numBlocksDown = screenHeight / blockSize;
  };

  /**
   * Add a random block
   * @return nothing
   */
  RandomBlocks.add = function (size) {
    var position;
    var randomXNumber = RandomBlocks.randomXAxis(size);
    var randomYNumber = RandomBlocks.randomYAxis(size);

    var position = [randomXNumber, randomYNumber];
    if (!~locations.indexOf(position.join(""))) {
      var randomColor = RandomBlocks.randomColor();
      var xPosition = position[0];
      var yPosition = position[1];

      canvasCtx.fillStyle = "rgb(" + randomColor + ")";
      canvasCtx.fillRect(xPosition, yPosition, size, size);

      blocksAppended++;

      locations.push(position);
      count++;
    } else {
      console.log("EXCEPT!");
    }
  };

  /**
   * Random X axis that is divisible by blockSize
   * @return {int} Random X axis
   */
  RandomBlocks.randomXAxis = function (size) {
    return Math.round((Math.random() * screenWidth) / size) * size;
  };

  /**
   * Random Y axis that is divisible by blockSize
   * @return {int} Random Y axis
   */
  RandomBlocks.randomYAxis = function (size) {
    return Math.round((Math.random() * screenHeight) / size) * size;
  };

  /**
   * Generate random RGB code
   * @return {string} RGB code generated
   */
  RandomBlocks.randomColor = function () {
    return (
      "" +
      (Math.round(Math.random() * 256) +
        "," +
        Math.round(Math.random() * 256) +
        "," +
        Math.round(Math.random() * 256))
    );
  };
})(this);

$(function () {
  RandomBlocks.init(); // Run when doc ready
});
