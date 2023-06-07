import Random from "../../utils/random";
import "./cubes.scss";
import * as THREE from "three";

class Cubes {
  renderer;
  scene;
  camera;
  width = window.innerWidth;
  height = window.innerHeight;
  cubes: THREE.LineSegments[] = [];
  randomizeCubeColor = Random.bool();
  colors = [
    0xff0000, 0xffffff, 0xffff00, 0x00ffff, 0x00ff00, 0xccff00, 0xff1d58,
    0xf75990, 0x00ff7f, 0xffd700,
  ];
  speedModifier = Random.bool() ? 3 : 1;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      25,
      this.width / this.height,
      0.1,
      1000
    );
    this.camera.position.z = 200;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.width, this.height);
    document.getElementById("container")!.appendChild(this.renderer.domElement);

    const xDistance = 10;
    let yOffset = 55;
    const cols = Math.ceil(this.width / 70);
    const rows = Math.ceil(this.height / 70);
    const xOffset = -(cols * 4) - 1;
    for (let x = 0; x < cols * rows; x++) {
      const color = this.randomizeCubeColor
        ? Random.itemInArray(this.colors)
        : 0xffffff;
      const geometry = new THREE.BoxGeometry(5, 5, 5);
      const edges = new THREE.EdgesGeometry(geometry);
      const cube = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: color })
      );

      if (x % cols === 0) {
        yOffset -= 10;
      }
      cube.position.y = yOffset;
      cube.position.x = xDistance * (x % cols) + xOffset;
      cube.useSpeedModifier = Random.bool();

      this.scene.add(cube);
      this.cubes.push(cube);
    }

    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.cubes.forEach((cube) => {
      cube.rotation.x +=
        0.01 * (cube.useSpeedModifier ? this.speedModifier : 1);
      cube.rotation.y +=
        0.01 * (cube.useSpeedModifier ? this.speedModifier : 1);
    });

    this.renderer.render(this.scene, this.camera);
  }
}

new Cubes();
