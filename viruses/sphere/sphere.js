"use strict";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import Random from "../../utils/random";

class Sphere {
  WIDTH = window.innerWidth;
  HEIGHT = window.innerHeight;
  renderer;
  controls;
  scene;
  camera;
  vortex;
  diamond;
  dcCalls = 0;
  randomizeSphereColor = false;
  randomizeDiamondColor = false;

  constructor() {
    if (this.HEIGHT > this.WIDTH) {
      this.HEIGHT = this.WIDTH;
    }

    let VIEW_ANGLE = 45,
      ASPECT = this.WIDTH / this.HEIGHT,
      NEAR = 1,
      FAR = 10000;

    this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);

    this.camera.position.z = 300;
    this.scene = new THREE.Scene();

    this.WIDTH = this.WIDTH * 2;
    this.HEIGHT = this.HEIGHT * 2;

    const segmentOptions = [7, 12, 20, 22];
    const radius = 100;
    const segment = Random.int(segmentOptions.length);
    const segments = segmentOptions[segment];
    const rings = 18;

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
    this.vortex = new THREE.Mesh(geometry, material);
    this.scene.add(this.vortex);

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(this.WIDTH, this.HEIGHT);

    document.getElementById("container").appendChild(this.renderer.domElement);

    this.renderer.domElement.style.top =
      window.innerHeight - this.HEIGHT / 2 + "px";

    window.addEventListener("resize", () => this.onWindowResize(), false);
    this.randomizeSphereColor = Math.random() < 0.5;
    this.randomizeDiamondColor = Math.random() < 0.5;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.update();

    this.render();
    this.diamond_color();
  }

  onWindowResize() {
    let WIDTH = window.innerWidth,
      HEIGHT = window.innerHeight;

    if (HEIGHT > WIDTH) {
      HEIGHT = WIDTH;
    }

    this.camera.aspect = WIDTH / HEIGHT;
    this.camera.updateProjectionMatrix();

    WIDTH = WIDTH * 2;
    HEIGHT = HEIGHT * 2;

    this.renderer.domElement.style.top = window.innerHeight - HEIGHT / 2 + "px";

    this.renderer.setSize(WIDTH, HEIGHT);
  }

  render() {
    let time = Date.now() * 0.005;

    this.vortex.rotation.y = 0.02 * time;
    this.vortex.rotation.z = 0.02 * time;

    if (!this.diamond) {
      let radius = 50,
        segments = 20,
        rings = 2;
      let geometry = new THREE.SphereGeometry(radius, segments, rings);
      let material = new THREE.MeshBasicMaterial({
        wireframe: true,
      });
      this.diamond = new THREE.Mesh(geometry, material);
      this.scene.add(this.diamond);
    }

    if (this.randomizeSphereColor) {
      this.vortex.material.color.setRGB(
        Math.round(Math.random()),
        Math.round(Math.random()),
        Math.round(Math.random())
      );
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.render());
  }

  diamond_color() {
    if (!this.diamond) return;

    if (this.randomizeDiamondColor) {
      this.diamond.material.color.setRGB(
        Math.round(Math.random()),
        Math.round(Math.random()),
        Math.round(Math.random())
      );
    }

    requestAnimationFrame(() => this.diamond_color());
  }
}

new Sphere();
