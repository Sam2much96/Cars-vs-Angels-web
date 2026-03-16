/**
 * 
 * Buildings
 * 
 * Features:
 * (1) loads the building models into the scene
 * (2) load buildings either individually or all together
 * (3) generates cannon-es box bodies correctly aligned to each building mesh
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Buildings {
  public spawnpoint : THREE.Vector3 | undefined;

  constructor(
    loader = window.loader,
    scene = window.scene,
    world = window.world
  ) {

    loader.load('./buildings_mesh.glb', (gltf) => {
      const buildings = gltf.scene;

      // Force the full scene graph matrix update before reading any worldMatrix
      scene.add(buildings);
      buildings.updateMatrixWorld(true);

      buildings.traverse((obj) => {
        if (obj instanceof THREE.Mesh === false) return;

        if (obj.name === "spawnpoint"){
          console.log("spawnpoint object found : ", obj.position);
          this.spawnpoint = obj.position
        }

        // Bounding box in world space — gives true center and true size
        // regardless of pivot point or parent transforms
        const bbox = new THREE.Box3().setFromObject(obj);

        const center = new THREE.Vector3();
        const size   = new THREE.Vector3();
        bbox.getCenter(center);
        bbox.getSize(size);

        // Get world-space quaternion only (no position — we use bbox center instead)
        const worldQuat = new THREE.Quaternion();
        obj.getWorldQuaternion(worldQuat);

        const shape = new CANNON.Box(new CANNON.Vec3(
          size.x / 2,
          size.y / 2,
          size.z / 2
        ));

        const body = new CANNON.Body({
          mass: 0,
          shape,
          position: new CANNON.Vec3(center.x, center.y, center.z),
          quaternion: new CANNON.Quaternion(
            worldQuat.x,
            worldQuat.y,
            worldQuat.z,
            worldQuat.w
          ),
        });

        world.addBody(body);
      });

    }, undefined, (err) => {
      console.error('BUILDINGS LOAD ERROR:', err);
    });
  }
}