import "./sphere.scss";
import * as THREE from "three";
// @ts-ignore
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

import Random from "../../utils/random";

class Sphere {
  WIDTH: number;
  HEIGHT: number;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  vortex: THREE.Mesh;
  diamond: THREE.Mesh;
  randomizeSphereColor = false;
  randomizeDiamondColor = false;

  constructor() {
    this.setWidthHeight();

    const VIEW_ANGLE = 45;
    const ASPECT = this.WIDTH / this.HEIGHT;
    const NEAR = 1;
    const FAR = 10000;

    this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);

    this.camera.position.z = 300;
    this.scene = new THREE.Scene();

    this.createVortex();
    this.createDiamond();

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(this.WIDTH, this.HEIGHT);

    document.getElementById("container")!.appendChild(this.renderer.domElement);

    this.renderer.domElement.style.top =
      window.innerHeight - this.HEIGHT / 2 + "px";

    window.addEventListener("resize", () => this.onWindowResize(), false);
    this.randomizeSphereColor = Random.bool();
    this.randomizeDiamondColor = Random.bool();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.update();

    this.render();
    this.diamond_color();
  }

  setWidthHeight() {
    // TODO: refactor this to include camera and renderer initialization
    this.WIDTH = window.innerWidth;
    this.HEIGHT = window.innerHeight;

    if (this.HEIGHT > this.WIDTH) {
      this.HEIGHT = this.WIDTH;
    }

    this.WIDTH = this.WIDTH * 2;
    this.HEIGHT = this.HEIGHT * 2;
  }

  createVortex() {
    const segmentOptions = [7, 12, 20, 22];
    const radius = 100;
    const segment = Random.int(segmentOptions.length);
    const segments = segmentOptions[segment];
    const rings = 18;

    const geometry = new THREE.SphereGeometry(
      radius,
      segments,
      rings,
      0,
      Math.PI * 2,
      0,
      Math.PI * 2
    );
    const random_color = Math.random() * 0xffffff;
    const material = new THREE.MeshBasicMaterial({
      color: random_color,
      wireframe: true,
    });
    this.vortex = new THREE.Mesh(geometry, material);
    this.scene.add(this.vortex);
  }

  createDiamond() {
    const radius = 50;
    const segments = 20;
    const rings = 2;
    const geometry = new THREE.SphereGeometry(radius, segments, rings);
    const material = new THREE.MeshBasicMaterial({ wireframe: true });
    this.diamond = new THREE.Mesh(geometry, material);
    this.scene.add(this.diamond);
  }

  onWindowResize() {
    this.setWidthHeight();

    this.camera.aspect = this.WIDTH / this.HEIGHT;
    this.camera.updateProjectionMatrix();

    this.renderer.domElement.style.top =
      window.innerHeight - this.HEIGHT / 2 + "px";

    this.renderer.setSize(this.WIDTH, this.HEIGHT);
  }

  render() {
    const time = Date.now() * 0.005;

    this.vortex.rotation.y = 0.02 * time;
    this.vortex.rotation.z = 0.02 * time;

    if (this.randomizeSphereColor) {
      this.randomizeMeshColor(this.vortex);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.render());
  }

  randomizeMeshColor(objMesh: THREE.Mesh) {
    // @ts-ignore
    objMesh.material.color.setRGB(
      Math.round(Math.random()),
      Math.round(Math.random()),
      Math.round(Math.random())
    );
  }

  diamond_color() {
    if (this.randomizeDiamondColor) {
      this.randomizeMeshColor(this.diamond);
      requestAnimationFrame(() => this.diamond_color());
    }
  }
}

new Sphere();
