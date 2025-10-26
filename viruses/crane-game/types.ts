import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

export interface Prize {
  mesh: THREE.Mesh;
  rigidBody: RAPIER.RigidBody;
  grabbed: boolean;
  settled: boolean;
  imageUrl: string;
  weight: number;
  deformability: number;
  bounciness: number;
  materialType: "plush" | "ball" | "box" | "cylinder";
  gripStrength: number;
  dropChance: number;
}

export interface ImagesResponse {
  images: string[];
}
