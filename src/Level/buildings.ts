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
  public spawnpoint: THREE.Vector3 | undefined;
  private debugMeshes: THREE.Mesh[] = [];

  constructor(
    loader = window.loader,
    scene = window.scene,
    world = window.world,
    debug = false   // set true to see green wireframes
  ) {
    loader.load('./buildings_mesh.glb', (gltf) => {
      const root = gltf.scene;
      scene.add(root);
      root.updateMatrixWorld(true);

      root.traverse((obj) => {

        // ── Spawnpoint ───────────────────────────────────────────
        if (obj.name === 'spawnpoint') {
          this.spawnpoint = new THREE.Vector3();
          obj.getWorldPosition(this.spawnpoint);
          return;
        }

        // ── Collision empties only ───────────────────────────────
        if (!obj.name.startsWith('col_')) return;
        if (obj instanceof THREE.Mesh) return; // skip accidental mesh matches

        const pos   = new THREE.Vector3();
        const quat  = new THREE.Quaternion();
        const scale = new THREE.Vector3();

        obj.getWorldPosition(pos);
        obj.getWorldQuaternion(quat);
        obj.getWorldScale(scale);

        // scale = real-world metres set in Blender, halfExtents = scale / 2
        const shape = new CANNON.Box(new CANNON.Vec3(
          scale.x / 2,
          scale.y / 2,
          scale.z / 2
        ));

        const body = new CANNON.Body({
          mass: 0,
          shape,
          position : new CANNON.Vec3(pos.x, pos.y, pos.z),
          quaternion: new CANNON.Quaternion(quat.x, quat.y, quat.z, quat.w),
        });

        world.addBody(body);

        if (debug) this.addDebugWireframe(pos, scale, quat, scene);
      });

    }, undefined, (err) => {
      console.error('BUILDINGS LOAD ERROR:', err);
    });
  }

  private addDebugWireframe(
    pos: THREE.Vector3,
    scale: THREE.Vector3,
    quat: THREE.Quaternion,
    scene: THREE.Scene
  ) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(scale.x, scale.y, scale.z),
      new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
    );
    mesh.position.copy(pos);
    mesh.quaternion.copy(quat);
    scene.add(mesh);
    this.debugMeshes.push(mesh);
  }

  /** Call this once collisions look correct to free memory */
  public removeDebug(scene: THREE.Scene) {
    this.debugMeshes.forEach(m => scene.remove(m));
    this.debugMeshes = [];
  }
}