import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

export interface Prize {
  mesh: THREE.Mesh | THREE.Group;
  rigidBody: RAPIER.RigidBody;
  grabbed: boolean;
  settled: boolean;
  weight: number;
  deformability: number;
  bounciness: number;
  materialType: "plush";
  gripStrength: number;
  dropChance: number;
}
