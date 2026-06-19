/**
 * Buildings
 *
 * (1) Loads building models into the scene
 * (2) Generates cannon-es box bodies from col_ empties
 * (3) Exposes colBoxes + ready promise for NavGrid
 */
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { GameContext } from '../core/context';
import type { ColBox } from '../Nav/NavGrid';

export class Buildings {
  public spawnpoint: THREE.Vector3 | undefined;
  /** Populated once the GLB loads — consumed by NavGrid to build the walkability grid. */
  public colBoxes: ColBox[] = [];
  public ready: Promise<void>;

  private debugMeshes: THREE.Mesh[] = [];

  constructor(ctx: GameContext = window.ctx, debug = false) {
    const { loader, scene, world } = ctx;

    this.ready = new Promise<void>((resolve) => {
      loader.load('./buildings_mesh.glb', (gltf) => {
        const root = gltf.scene;
        scene.add(root);
        root.updateMatrixWorld(true);

        root.traverse((obj) => {
          // ── Spawnpoint ─────────────────────────────────────────
          if (obj.name === 'spawnpoint') {
            this.spawnpoint = new THREE.Vector3();
            obj.getWorldPosition(this.spawnpoint);
            return;
          }

          // ── Collision empties only ─────────────────────────────
          if (!obj.name.startsWith('col_')) return;
          if (obj instanceof THREE.Mesh) return;

          const pos   = new THREE.Vector3();
          const quat  = new THREE.Quaternion();
          const scale = new THREE.Vector3();

          obj.getWorldPosition(pos);
          obj.getWorldQuaternion(quat);
          obj.getWorldScale(scale);

          // Store for NavGrid
          this.colBoxes.push({ pos: pos.clone(), scale: scale.clone(), quat: quat.clone() });

          const shape = new CANNON.Box(new CANNON.Vec3(scale.x / 2, scale.y / 2, scale.z / 2));
          const body  = new CANNON.Body({
            mass: 0,
            shape,
            position:   new CANNON.Vec3(pos.x, pos.y, pos.z),
            quaternion: new CANNON.Quaternion(quat.x, quat.y, quat.z, quat.w),
          });
          world.addBody(body);

          if (debug) this._addDebugWireframe(pos, scale, quat, scene);
        });

        resolve();
      }, undefined, (err) => {
        console.error('BUILDINGS LOAD ERROR:', err);
        resolve(); // don't hang the game if the GLB fails
      });
    });
  }

  private _addDebugWireframe(
    pos:   THREE.Vector3,
    scale: THREE.Vector3,
    quat:  THREE.Quaternion,
    scene: THREE.Scene,
  ): void {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(scale.x, scale.y, scale.z),
      new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }),
    );
    mesh.position.copy(pos);
    mesh.quaternion.copy(quat);
    scene.add(mesh);
    this.debugMeshes.push(mesh);
  }

  public removeDebug(scene: THREE.Scene): void {
    this.debugMeshes.forEach(m => scene.remove(m));
    this.debugMeshes = [];
  }
}
