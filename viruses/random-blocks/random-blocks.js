(function (root) {
  // module wrapper
  "use strict";

  // expose `RandomBlocks` globally
  let RandomBlocks = (root.RandomBlocks = {});

  /**
   * define some variables
   */
  let screenWidth = null,
    screenHeight = null,
    locations = [],
    count = 0,
    numberOfBlocks = 0,
    blocksAppended = 0,
    canvas = $("<canvas id='stage'>"),
    canvasCtx,
    blockSize = 5;
  /**
   * start the colored block extravaganza
   */
  RandomBlocks.init = function () {
    screenWidth = $(window).width();
    screenHeight = $(window).height();

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

  /**
   * The number of blocks required to fill the screen
   * @return {int} numberOfBlocks
   */
  RandomBlocks.calculateNumberOfBlocks = function () {
    let numBlocksAcross = screenWidth / blockSize;
    let numBlocksDown = screenHeight / blockSize;

    return Math.ceil(numBlocksAcross * numBlocksDown);
  };

  /**
   * Add a random block
   * @return nothing
   */
  RandomBlocks.add = function (size) {
    let randomXNumber = RandomBlocks.randomXAxis(size);
    let randomYNumber = RandomBlocks.randomYAxis(size);

    let position = [randomXNumber, randomYNumber];
    if (!~locations.indexOf(position.join(""))) {
      let randomColor = RandomBlocks.randomColor();
      let xPosition = position[0];
      let yPosition = position[1];

      canvasCtx.fillStyle = "rgb(" + randomColor + ")";
      canvasCtx.fillRect(xPosition, yPosition, size, size);

      blocksAppended++;

      locations.push(position);
      count++;
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
