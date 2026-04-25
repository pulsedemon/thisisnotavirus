import * as THREE from 'three';
import type {
  LayerBlend,
  VirusModule,
  VirusModuleCapabilities,
  VirusModuleContext,
  VirusModuleFactory,
} from '../../engine/modules/VirusModule';
import { randomBool, randomInt } from '../../utils/random';

/**
 * Native port of the legacy sphere virus.
 *
 * Lifts the wireframe sphere + diamond pair into the shared 3D layer scene
 * instead of owning its own renderer, so it can coexist with other 3D modules
 * (e.g. sky as a backdrop) and participate in compositor blends.
 */
class SphereModule implements VirusModule {
  readonly id: string;
  readonly capabilities: VirusModuleCapabilities = {
    has2D: false,
    has3D: true,
  };

  private vortex: THREE.Mesh | null = null;
  private diamond: THREE.Mesh | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;
  private randomizeSphereColor = randomBool();
  private randomizeDiamondColor = randomBool();
  private shouldRotateDiamond = randomBool();
  // Save the camera position so we can restore it on unmount.
  private savedCameraZ = 0;
  private elapsedClock = 0;

  constructor(id: string) {
    this.id = id;
  }

  mount(ctx: VirusModuleContext): void {
    if (!ctx.layer3D) throw new Error('sphere requires layer3D');
    this.scene = ctx.layer3D.scene;
    this.camera = ctx.layer3D.camera;

    // Move the camera back so the wireframe sphere fits the viewport.
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.savedCameraZ = this.camera.position.z;
      this.camera.position.z = 300;
      this.camera.updateProjectionMatrix();
    }

    const segmentOptions = [7, 12, 20, 22];
    const segments = segmentOptions[randomInt(segmentOptions.length)];
    const vortexGeo = new THREE.SphereGeometry(
      100,
      segments,
      18,
      0,
      Math.PI * 2,
      0,
      Math.PI * 2
    );
    const vortexMat = new THREE.MeshBasicMaterial({
      color: Math.random() * 0xffffff,
      wireframe: true,
    });
    this.vortex = new THREE.Mesh(vortexGeo, vortexMat);
    this.scene.add(this.vortex);

    const diamondGeo = new THREE.SphereGeometry(50, 20, 2);
    const diamondMat = new THREE.MeshBasicMaterial({ wireframe: true });
    this.diamond = new THREE.Mesh(diamondGeo, diamondMat);
    this.scene.add(this.diamond);
  }

  update(dt: number, _blend: LayerBlend): void {
    this.elapsedClock += dt;
    const time = this.elapsedClock * 5; // matches legacy "Date.now()*0.005"
    if (this.vortex) {
      this.vortex.rotation.y = 0.02 * time;
      this.vortex.rotation.z = 0.02 * time;
      if (this.randomizeSphereColor) randomiseColor(this.vortex);
    }
    if (this.diamond && this.shouldRotateDiamond) {
      this.diamond.rotation.y = -0.02 * time;
      this.diamond.rotation.z = -0.02 * time;
    }
    if (this.diamond && this.randomizeDiamondColor) {
      randomiseColor(this.diamond);
    }
  }

  unmount(): void {
    if (this.vortex && this.scene) {
      this.scene.remove(this.vortex);
      this.vortex.geometry.dispose();
      (this.vortex.material as THREE.Material).dispose();
    }
    if (this.diamond && this.scene) {
      this.scene.remove(this.diamond);
      this.diamond.geometry.dispose();
      (this.diamond.material as THREE.Material).dispose();
    }
    if (this.camera instanceof THREE.PerspectiveCamera && this.savedCameraZ) {
      this.camera.position.z = this.savedCameraZ;
      this.camera.updateProjectionMatrix();
    }
    this.vortex = null;
    this.diamond = null;
    this.scene = null;
    this.camera = null;
  }
}

function randomiseColor(mesh: THREE.Mesh): void {
  const mat = mesh.material;
  if (mat instanceof THREE.MeshBasicMaterial) {
    mat.color.setRGB(
      Math.round(Math.random()),
      Math.round(Math.random()),
      Math.round(Math.random())
    );
  }
}

const factory: VirusModuleFactory = id => new SphereModule(id);
export default factory;
