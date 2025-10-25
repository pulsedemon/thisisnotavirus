import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

export class PhysicsManager {
  world: RAPIER.World;
  eventQueue: RAPIER.EventQueue;

  constructor() {
    // Create physics world with extremely strong gravity for very fast arcade-style falling
    const gravity = { x: 0.0, y: -100.0, z: 0.0 };
    this.world = new RAPIER.World(gravity);
    this.eventQueue = new RAPIER.EventQueue(true);
  }

  step() {
    // Step physics with larger timestep for faster simulation
    this.world.step(this.eventQueue);
  }

  createDynamicSphere(
    position: THREE.Vector3,
    radius: number,
    mass = 1.0,
    restitution = 0.2,
    friction = 0.8,
  ): RAPIER.RigidBody {
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z)
      .setLinearDamping(0.0) // No air resistance for maximum falling speed
      .setAngularDamping(0.05); // Almost no rotational damping

    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.ball(radius)
      .setMass(mass)
      .setRestitution(restitution) // Bounciness
      .setFriction(friction); // Surface friction

    this.world.createCollider(colliderDesc, rigidBody);

    return rigidBody;
  }

  createStaticBox(
    position: THREE.Vector3,
    halfExtents: THREE.Vector3,
  ): RAPIER.RigidBody {
    const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      position.x,
      position.y,
      position.z,
    );

    const rigidBody = this.world.createRigidBody(rigidBodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.cuboid(
      halfExtents.x,
      halfExtents.y,
      halfExtents.z,
    );

    this.world.createCollider(colliderDesc, rigidBody);

    return rigidBody;
  }

  syncMeshWithBody(mesh: THREE.Mesh, rigidBody: RAPIER.RigidBody) {
    const position = rigidBody.translation();
    mesh.position.set(position.x, position.y, position.z);

    const rotation = rigidBody.rotation();
    mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
  }

  removeBody(rigidBody: RAPIER.RigidBody) {
    this.world.removeRigidBody(rigidBody);
  }
}
