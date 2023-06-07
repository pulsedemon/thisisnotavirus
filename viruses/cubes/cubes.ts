import "./cubes.scss";
import * as THREE from "three";

class Cubes {
  renderer;
  scene;
  camera;
  width = window.innerWidth;
  height = window.innerHeight;
  cubes = [];

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      25,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 200;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.width, this.height);
    document.getElementById("container")!.appendChild(this.renderer.domElement);

    var xOffset = -85;
    var xDistance = 10;
    var yOffset = 55;
    for (let x = 0; x < 200; x++) {
      const geometry = new THREE.BoxGeometry(5, 5, 5);
      const edges = new THREE.EdgesGeometry(geometry);
      const cube = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0xffffff })
      );

      if (x % 20 === 0) {
        yOffset -= 10;
      }
      cube.position.y = yOffset;
      cube.position.x = xDistance * (x % 20) + xOffset;
      this.scene.add(cube);
      this.cubes.push(cube);
    }

    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.cubes.forEach((cube) => {
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
    });

    this.renderer.render(this.scene, this.camera);
  }
}

new Cubes();
