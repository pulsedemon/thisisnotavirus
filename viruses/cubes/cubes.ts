import * as THREE from "three";
import Random from "../../utils/random";
import "./cubes.scss";

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
      45,
      this.width / this.height,
      0.1,
      1000
    );
    this.camera.position.z = 180;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.width, this.height);
    document.getElementById("container")!.appendChild(this.renderer.domElement);

    this.createCubes();
    this.animate();

    window.addEventListener("resize", () => this.onWindowResize());
  }

  createCubes() {
    this.cubes.forEach((cube) => this.scene.remove(cube));
    this.cubes = [];

    const cubeSize = 7;
    const spacing = 8;
    const cols = Math.ceil(this.width / (cubeSize + spacing));
    const rows = Math.ceil(this.height / (cubeSize + spacing));

    // Calculate grid dimensions
    const gridWidth = cols * (cubeSize + spacing);
    const gridHeight = rows * (cubeSize + spacing);

    // Center the grid
    const xOffset = -(gridWidth / 2) + (cubeSize + spacing) / 2;
    const yOffset = gridHeight / 2 - (cubeSize + spacing) / 2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const color = this.randomizeCubeColor
          ? Random.itemInArray(this.colors)
          : 0xffffff;
        const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
        const edges = new THREE.EdgesGeometry(geometry);
        const cube = new THREE.LineSegments(
          edges,
          new THREE.LineBasicMaterial({
            color: color as THREE.ColorRepresentation,
          })
        );

        cube.position.x = col * (cubeSize + spacing) + xOffset;
        cube.position.y = -row * (cubeSize + spacing) + yOffset;
        // @ts-expect-error added attribute
        cube.useSpeedModifier = Random.bool();

        this.scene.add(cube);
        this.cubes.push(cube);
      }
    }
  }

  onWindowResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);

    this.createCubes();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.cubes.forEach((cube) => {
      cube.rotation.x +=
        // @ts-expect-error added attribute
        0.01 * (cube.useSpeedModifier ? this.speedModifier : 1);
      cube.rotation.y +=
        // @ts-expect-error added attribute
        0.01 * (cube.useSpeedModifier ? this.speedModifier : 1);
    });

    this.renderer.render(this.scene, this.camera);
  }
}

new Cubes();
