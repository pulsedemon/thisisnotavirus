$(function () {
  const $logo = $('<strong id="logo">THIS IS<br>NOT A<br>VIRUS</strong>');
  var $container = $("#container");
  $logo.appendTo($container);
  const bgs = ["#000000", "#00ffbd", "#ffff00", "#bege76"];

  const center_everything = function () {
    console.log("center_everything");
    WIDTH = window.innerWidth;
    HEIGHT = window.innerHeight;

    _.delay(function () {
      $container.css({
        width: WIDTH + "px",
        height: HEIGHT + "px",
      });

      $logo.css({
        top: HEIGHT / 2 - $logo.height() / 2 + "px",
        left: WIDTH / 2 - $logo.width() / 2 + "px",
        visibility: "visible",
      });
    }, 50);
  };

  function change_text_color() {
    const rand = Math.floor(Math.random() * 6);

    $logo.css("color", bgs[rand]);

    requestAnimationFrame(change_text_color);
  }

  function create_canvas() {
    window.canvas = document.createElement("canvas");
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    window.context = canvas.getContext("2d");
    render();

    return canvas;
  }

  function render() {
    const x = Math.random() * WIDTH;
    const y = Math.random() * HEIGHT;
    window.context.fillRect(x, y, 2, 2);
    requestAnimationFrame(render);
  }

  function readDeviceOrientation() {
    center_everything();

    if (WIDTH >= 600) return;
    switch (window.orientation) {
      case 0:
      case 180:
        console.log("Portrait");
        $logo.html("THIS IS<br>NOT A<br>VIRUS");
        $logo.css({
          fontSize: "80px",
          lineHeight: "80px",
        });
        break;
      case -90:
      case 90:
        console.log("Landscape");
        $logo.html("THIS IS NOT<br>A VIRUS");
        $logo.css({
          fontSize: "70px",
          lineHeight: "70px",
        });
        break;
    }
  }

  $(window).load(readDeviceOrientation());
  screen.orientation.onchange = readDeviceOrientation;

  $container.append(create_canvas());
  $body = $("body");

  $(window).resize(function () {
    center_everything();
  });

  change_text_color();
});
