"use strict";

import * as THREE from "three";

let WIDTH = window.innerWidth,
  HEIGHT = window.innerHeight;

let renderer, scene, camera, vortex, diamond;
let $diamond_color;

function init() {
  if (HEIGHT > WIDTH) {
    HEIGHT = WIDTH;
  }

  let VIEW_ANGLE = 45,
    ASPECT = WIDTH / HEIGHT,
    NEAR = 1,
    FAR = 10000;

  camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);

  camera.position.z = 300;
  scene = new THREE.Scene();

  WIDTH = WIDTH * 2;
  HEIGHT = HEIGHT * 2;

  let radius = 100,
    segments = 35,
    rings = 18;
  let geometry = new THREE.SphereGeometry(
    radius,
    segments,
    rings,
    0,
    Math.PI * 2,
    0,
    Math.PI * 2
  );
  let random_color = Math.random() * 0xffffff;
  let material = new THREE.MeshBasicMaterial({
    color: random_color,
    wireframe: true,
  });
  vortex = new THREE.Mesh(geometry, material);
  scene.add(vortex);

  renderer = new THREE.CanvasRenderer();
  renderer.setSize(WIDTH, HEIGHT);

  document.getElementById("container").appendChild(renderer.domElement);

  renderer.domElement.style.top = window.innerHeight - HEIGHT / 2 + "px";

  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
  let WIDTH = window.innerWidth,
    HEIGHT = window.innerHeight;

  if (HEIGHT > WIDTH) {
    HEIGHT = WIDTH;
  }

  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();

  WIDTH = WIDTH * 2;
  HEIGHT = HEIGHT * 2;

  renderer.domElement.style.top = window.innerHeight - HEIGHT / 2 + "px";

  renderer.setSize(WIDTH, HEIGHT);
}

function render() {
  let time = Date.now() * 0.005;

  vortex.rotation.y = 0.02 * time;
  vortex.rotation.z = 0.02 * time;

  if (!diamond) {
    let radius = 50,
      segments = 20,
      rings = 2;
    let geometry = new THREE.SphereGeometry(radius, segments, rings);
    diamond = new THREE.Mesh(geometry);
    $diamond_color = diamond.material.color;
    scene.add(diamond);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(render);
}

function diamond_color() {
  if (!diamond) return;

  let rand = Math.ceil(Math.random() * 50);

  if (rand % 2 === 0) {
    $diamond_color.setRGB(
      Math.random() * 256,
      Math.random() * 256,
      Math.random() * 256
    );
  }

  requestAnimationFrame(diamond_color);
}

init();
requestAnimationFrame(render);
requestAnimationFrame(diamond_color);
