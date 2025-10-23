/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import "./sphere.scss";
import * as THREE from "three";
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
  randomizeSphereColor = Random.bool();
  randomizeDiamondColor = Random.bool();
  shouldRotateDiamond = Random.bool();

  constructor() {
    this.setRenderOptions();
    this.scene = new THREE.Scene();
    this.createVortex();
    this.createDiamond();

    document.getElementById("container")!.appendChild(this.renderer.domElement);
    window.addEventListener("resize", () => this.setRenderOptions(), false);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.update();

    this.render();
    this.diamond_color();
  }

  setRenderOptions() {
    this.WIDTH = window.innerWidth;
    this.HEIGHT = window.innerHeight;

    if (this.HEIGHT > this.WIDTH) {
      this.HEIGHT = this.WIDTH;
    }

    this.WIDTH = this.WIDTH * 2;
    this.HEIGHT = this.HEIGHT * 2;

    if (!this.renderer) this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(this.WIDTH, this.HEIGHT);

    this.renderer.domElement.style.top =
      window.innerHeight - this.HEIGHT / 2 + "px";

    if (!this.camera) {
      const VIEW_ANGLE = 45;
      const ASPECT = this.WIDTH / this.HEIGHT;
      const NEAR = 1;
      const FAR = 10000;
      this.camera = new THREE.PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
      this.camera.position.z = 300;
    } else {
      this.camera.aspect = this.WIDTH / this.HEIGHT;
      this.camera.updateProjectionMatrix();
    }
  }

  createVortex() {
    const segmentOptions = [7, 12, 20, 22];
    const segment = Random.int(segmentOptions.length);
    const segments = segmentOptions[segment];
    const extraOptions = [0, Math.PI * 2, 0, Math.PI * 2];

    const geometry = new THREE.SphereGeometry(
      100,
      segments,
      18,
      ...extraOptions,
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
    const geometry = new THREE.SphereGeometry(50, 20, 2);
    const material = new THREE.MeshBasicMaterial({ wireframe: true });
    this.diamond = new THREE.Mesh(geometry, material);
    this.scene.add(this.diamond);
  }

  render() {
    const time = Date.now() * 0.005;

    this.vortex.rotation.y = 0.02 * time;
    this.vortex.rotation.z = 0.02 * time;

    if (this.shouldRotateDiamond) {
      this.diamond.rotation.y = -0.02 * time;
      this.diamond.rotation.z = -0.02 * time;
    }

    if (this.randomizeSphereColor) {
      this.randomizeMeshColor(this.vortex);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.render());
  }

  randomizeMeshColor(objMesh: THREE.Mesh) {
    // @ts-expect-error color
    objMesh.material.color.setRGB(
      Math.round(Math.random()),
      Math.round(Math.random()),
      Math.round(Math.random()),
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
