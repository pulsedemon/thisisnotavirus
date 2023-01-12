$(function () {
  let text =
    "<span>THIS</span> <span>IS</span><br><span>NOT</span> <span>A</span><br><span>VIRUS</span>";
  const $logo = $(`<strong id="logo">${text}</strong>`);
  const $container = $("#container");
  $logo.appendTo($container);
  const bgs = ["#000000", "#00ffbd", "#ffff00"];

  const center_everything = function () {
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

    let bg = bgs[rand];
    $logo.css("color", bg);

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
    switch (window.screen.orientation) {
      case 0:
      case 180:
        console.log("Portrait");
        $logo.css({
          fontSize: "80px",
          lineHeight: "80px",
        });
        break;
      case -90:
      case 90:
        console.log("Landscape");
        $logo.css({
          fontSize: "70px",
          lineHeight: "70px",
        });
        break;
    }
  }

  readDeviceOrientation();

  console.log("hello");

  try {
    screen.orientation.onchange = readDeviceOrientation;
  } catch {
    console.log("fuck you");
  }

  change_text_color();

  $container.append(create_canvas());

  $(window).resize(function () {
    center_everything();
  });
});
