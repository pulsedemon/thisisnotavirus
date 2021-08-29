"use strict";

let WIDTH = window.innerWidth,
  HEIGHT = window.innerHeight;

var renderer, scene, camera, vortex, diamond;
var $diamond_color;
var projector;
var sphere, uniforms, attributes;

function init() {
  if (HEIGHT > WIDTH) {
    HEIGHT = WIDTH;
  }

  var VIEW_ANGLE = 45,
    ASPECT = WIDTH / HEIGHT,
    NEAR = 1,
    FAR = 10000;

  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);

  camera.position.z = 300;
  scene = new THREE.Scene();

  WIDTH = WIDTH * 2;
  HEIGHT = HEIGHT * 2;

  var radius = 100,
    segments = 35,
    rings = 18;
  var geometry = new THREE.SphereGeometry(
    radius,
    segments,
    rings,
    0,
    Math.PI * 2,
    0,
    Math.PI * 2
  );
  var random_color = Math.random() * 0xffffff;
  var material = new THREE.MeshBasicMaterial({
    color: random_color,
    wireframe: true,
  });
  vortex = new THREE.Mesh(geometry, material);
  scene.add(vortex);

  projector = new THREE.Projector();

  renderer = new THREE.CanvasRenderer();
  renderer.setSize(WIDTH, HEIGHT);

  $("#container").append(renderer.domElement);

  $("canvas").css({
    top: window.innerHeight - HEIGHT / 2 + "px",
  });

  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
  var WIDTH = window.innerWidth,
    HEIGHT = window.innerHeight;

  if (HEIGHT > WIDTH) {
    HEIGHT = WIDTH;
  }

  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();

  WIDTH = WIDTH * 2;
  HEIGHT = HEIGHT * 2;

  $("canvas").css({
    top: window.innerHeight - HEIGHT / 2 + "px",
  });

  renderer.setSize(WIDTH, HEIGHT);
}

function render() {
  var time = Date.now() * 0.005;

  vortex.rotation.y = 0.02 * time;
  vortex.rotation.z = 0.02 * time;

  if (!diamond) {
    console.log("create diamond");
    var radius = 50,
      segments = 20,
      rings = 2;
    var geometry = new THREE.SphereGeometry(radius, segments, rings);
    diamond = new THREE.Mesh(geometry);
    $diamond_color = diamond.material.color;
    scene.add(diamond);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

function diamond_color() {
  if (!diamond) return;

  var rand = Math.ceil(Math.random() * 50);

  if (rand % 2 === 0) {
    $diamond_color.setRGB(
      Math.random() * 256,
      Math.random() * 256,
      Math.random() * 256
    );
  }

  requestAnimationFrame(diamond_color);
}

$(function () {
  init();
  requestAnimationFrame(render);
  requestAnimationFrame(diamond_color);
});
