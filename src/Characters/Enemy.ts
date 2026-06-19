/**
 * 
 * 
 * Enemy 2 
 * 
 * Features: 
 * (1) enemy material
 * (2) proper state machine
 * (3) Hit collision detection
 * 
 * to do:
 * (1) enemy state machine
 * (2) enemy glow
 * (3) win and lose game conditional
 * (4) enemy attack
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { uiStore } from '../UI/ui-score';
import type { GameContext } from '../core/context';
import type { NavGrid } from '../Nav/NavGrid';
import { playAngelDeathFX } from '../FX/AngelDeathFX';


// temporarily disabled for refactoring
// Enemy states
//enum EnemyState {
//  IDLE = 'IDLE',
//  PATROL = 'PATROL',
//  CHASE = 'CHASE',
//  ATTACK = 'ATTACK',
//  STUNNED = 'STUNNED'
//}

export class Enemy {
      // GLB loaded once; each instance clones the scene via SkeletonUtils
      private static _tpl: { scene: THREE.Object3D; clips: THREE.AnimationClip[] } | null = null;
      private static _tplLoad: Promise<void> | null = null;

      private static _ensureTemplate(ctx: GameContext): Promise<void> {
          if (Enemy._tplLoad) return Enemy._tplLoad;
          Enemy._tplLoad = new Promise<void>((resolve, reject) => {
              ctx.loader.load(
                  './BiblicallyAcurateAngel.glb',
                  (gltf) => {
                      Enemy._tpl = { scene: gltf.scene, clips: gltf.animations };
                      resolve();
                  },
                  (progress) => {
                      const pct = progress.total > 0
                          ? Math.round((progress.loaded / progress.total) * 100) : 0;
                      window.dispatchEvent(new CustomEvent('load-progress',
                          { detail: { percent: pct, label: 'Loading Angel character…' } }));
                  },
                  (err) => { console.error('ANGEL TEMPLATE LOAD ERROR:', err); reject(err); },
              );
          });
          return Enemy._tplLoad;
      }

      public  readonly id  : string;
      private readonly ctx : GameContext;

        // Visual components
      public AngelMesh: THREE.Object3D  | null = null;
      public body?: CANNON.Body ;
      public isDead : Boolean = false;
      private radius: number = 1;
      public spawnpoint = new THREE.Vector3(-125, 3, 45);
      public ready : Promise<void>;
      public playerAnims  : THREE.AnimationMixer | null = null;
        clips               : THREE.AnimationClip[]       = [];
        currentAction       : THREE.AnimationAction | null = null;
      private glowLight     : THREE.PointLight | null = null;

      // ── Stats ─────────────────────────────────────────────────────────────────
      public  health         = 100;

      // ── Pathfinding ───────────────────────────────────────────────────────────
      private navGrid        : NavGrid | null      = null;
      private path           : THREE.Vector3[]     = [];
      private repathTimer    = 0;
      private knockbackTimer = 0; // suspends velocity override after being shot

      private static readonly FOLLOW_DIST    = 7;   // stop when this close to player
      private static readonly MOVE_SPEED     = 6;
      private static readonly REPATH_INTERVAL= 1.5; // seconds between A* calls
      private static readonly FLOAT_Y        = 4;   // target height above y=0
      private static readonly WP_REACH       = 3;   // advance to next waypoint within this dist

      constructor(ctx: GameContext = window.ctx, id = 'angel-0', spawnPoint?: THREE.Vector3) {
        this.id  = id;
        this.ctx = ctx;
        if (spawnPoint) this.spawnpoint = spawnPoint;
        const { scene, world } = ctx;

        this.ready = Enemy._ensureTemplate(ctx).then(() => {
            // Clone the shared template — geometry/materials are shared, skeleton is rebound
            this.AngelMesh   = skeletonClone(Enemy._tpl!.scene);
            this.clips       = Enemy._tpl!.clips; // AnimationClips are immutable, safe to share
            this.playerAnims = new THREE.AnimationMixer(this.AngelMesh);

            // Tag every child mesh so FPS raycasts can identify them
            this.AngelMesh.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.userData.isAngel = true;
                    const mats = Array.isArray(child.material) ? child.material : [child.material];
                    for (const mat of mats) {
                        if (mat instanceof THREE.MeshStandardMaterial ||
                            mat instanceof THREE.MeshPhongMaterial) {
                            mat.emissive.set(0xffe060);
                            mat.emissiveIntensity = 0.6;
                        }
                    }
                }
            });

            this.glowLight = new THREE.PointLight(0xffe060, 4, 30);
            scene.add(this.glowLight);
            scene.add(this.AngelMesh);

            const shape = new CANNON.Sphere(this.radius);
            this.body = new CANNON.Body({
                mass: 10,
                shape,
                position: new CANNON.Vec3(this.spawnpoint.x, this.spawnpoint.y, this.spawnpoint.z),
            });
            world.addBody(this.body);

            // Collision — vehicle or player body
            this.body.addEventListener('collide', (e: any) => {
                const other = e.body as CANNON.Body;
                if (this.isDead) return;

                const carBody = window.Vehicle?.carBody;

                // Vehicle ram — damage scales with car speed (min threshold 3 m/s)
                if (carBody && other === carBody) {
                    const v = carBody.velocity;
                    const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
                    if (speed > 3) {
                        this.health -= Math.min(100, speed * 10);
                        this.knockbackTimer = 1.0;
                        if (this.health <= 0) { this._despawn(); return; }
                    }
                    return;
                }

                // On-foot player knockback — push player away from the angel
                const playerBody = window.player?.isDriving ? null : window.player?.body;
                if (playerBody && other === playerBody) {
                    const pb = playerBody;
                    const dx = pb.position.x - this.body!.position.x;
                    const dz = pb.position.z - this.body!.position.z;
                    const len = Math.sqrt(dx * dx + dz * dz) || 1;
                    pb.applyImpulse(
                        new CANNON.Vec3((dx / len) * 18, 7, (dz / len) * 18),
                        pb.position,
                    );
                    pb.wakeUp();
                    uiStore.setHealth(uiStore.getHealth() - 5);
                }
            });

            // FPS raycast hit — deduct health, apply knockback, despawn on death
            window.addEventListener('angel-hit', (e) => {
                if (!this.body || this.isDead) return;
                const { id, damage, dir } = (e as CustomEvent<{ id: string; damage: number; dir: { x: number; y: number; z: number } }>).detail;
                if (id !== this.id) return;

                this.health -= damage;

                if (this.health <= 0) { this._despawn(); return; }

                const FORCE = 30;
                this.body.applyImpulse(
                    new CANNON.Vec3(dir.x * FORCE, 8, dir.z * FORCE),
                    this.body.position,
                );
                this.body.wakeUp();
                this.path = [];
                this.repathTimer = 0;
                this.knockbackTimer = 0.5;
            });
        });

      
                

      }

    /** Remove the angel silently — no FX, no event. Used by mission cleanup. */
    public silentRemove(): void {
        if (this.isDead) return;
        const ctx = this.ctx;
        this.isDead = true;
        this.health = 0;
        this.path   = [];
        if (this.body)       { ctx.world.removeBody(this.body);     this.body      = undefined; }
        if (this.glowLight)  { ctx.scene.remove(this.glowLight);    this.glowLight = null; }
        if (this.AngelMesh)  { ctx.scene.remove(this.AngelMesh);    this.AngelMesh = null; }
    }

    private _despawn(): void {
        const ctx = this.ctx;
        this.isDead = true;
        this.health = 0;
        this.path   = [];

        // Remove physics + glow immediately — stops collisions and pathfinding
        if (this.body) {
            ctx.world.removeBody(this.body);
            this.body = undefined;
        }
        if (this.glowLight) {
            ctx.scene.remove(this.glowLight);
            this.glowLight = null;
        }

        // Fire the event immediately so mission counters update on kill
        window.dispatchEvent(new CustomEvent('angel-defeated', { detail: { id: this.id } }));

        // Particle burst + screen flash at the angel's last position
        if (this.AngelMesh) {
            const position = new THREE.Vector3().copy(this.AngelMesh.position);
            ctx.scene.remove(this.AngelMesh);
            this.AngelMesh = null;
            playAngelDeathFX(position, ctx.scene);
        }
    }

    setNavGrid(grid: NavGrid): void {
        this.navGrid = grid;
    }

    private static readonly VOID_Y = -15;

    physicsProcess(delta: number) {
        if (!this.body || this.isDead) return;
        const body = this.body;

        // Fell off the map
        if (body.position.y < Enemy.VOID_Y) {
            this._despawn();
            return;
        }

        // ── Pathfinding & movement ────────────────────────────────────────────
        // Use car body when driving — player body is parked underground at y=-1000
        const targetBody = (window.player?.isDriving && window.Vehicle?.carBody)
            ? window.Vehicle.carBody
            : window.player?.body;
        if (this.navGrid && targetBody) {
            const ap = body.position;
            const pp = targetBody.position;

            const dx   = pp.x - ap.x;
            const dz   = pp.z - ap.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            // Repath on timer or when path runs out
            this.repathTimer -= delta;
            if (this.repathTimer <= 0 || this.path.length === 0) {
                this.repathTimer = Enemy.REPATH_INTERVAL;
                if (dist > Enemy.FOLLOW_DIST) {
                    const from = new THREE.Vector3(ap.x, ap.y, ap.z);
                    const to   = new THREE.Vector3(pp.x, pp.y, pp.z);
                    this.path  = this.navGrid.findPath(from, to);
                }
            }

            this.knockbackTimer = Math.max(0, this.knockbackTimer - delta);

            if (dist > Enemy.FOLLOW_DIST && this.path.length > 0 && this.knockbackTimer <= 0) {
                // Advance past waypoints already reached
                const wp = this.path[0];
                const wdx = wp.x - ap.x;
                const wdz = wp.z - ap.z;
                if (Math.sqrt(wdx * wdx + wdz * wdz) < Enemy.WP_REACH) {
                    this.path.shift();
                }

                if (this.path.length > 0) {
                    const target = this.path[0];
                    const tdx  = target.x - ap.x;
                    const tdz  = target.z - ap.z;
                    const tlen = Math.sqrt(tdx * tdx + tdz * tdz);
                    if (tlen > 0.1) {
                        body.velocity.x = (tdx / tlen) * Enemy.MOVE_SPEED;
                        body.velocity.z = (tdz / tlen) * Enemy.MOVE_SPEED;
                        // Face direction of travel
                        if (this.AngelMesh) {
                            this.AngelMesh.rotation.y =
                                Math.atan2(tdx, tdz);
                        }
                    }
                }
            } else if (this.knockbackTimer <= 0) {
                // Within follow distance — stop horizontal movement, face player
                body.velocity.x = 0;
                body.velocity.z = 0;
                if (this.AngelMesh && dist > 0.1) {
                    this.AngelMesh.rotation.y = Math.atan2(dx, dz);
                }
            }

            // Float at fixed height
            const targetY = Enemy.FLOAT_Y;
            body.velocity.y = (targetY - ap.y) * 5;
        }

        // ── Sync mesh & glow ──────────────────────────────────────────────────
        this.AngelMesh?.position.copy(body.position);

        if (this.glowLight) {
            this.glowLight.position.copy(body.position);
            this.glowLight.intensity = 3 + Math.sin(Date.now() * 0.003) * 1.2;
        }

        if (this.playerAnims) this.playerAnims.update(delta);
        this.playAnimation("Armature.001|Armature.001|Armature.002Action.002");
    }

    // ── ANIMATION ─────────────────────────────────────────────────────────────
    
    playAnimation(name: string, fadeTime: number = 0.2) {
            if (!this.playerAnims || this.isDead) return;
            const clip = THREE.AnimationClip.findByName(this.clips, name);
            if (!clip) { console.warn(`Animation "${name}" not found`); return; }
            const nextAction = this.playerAnims.clipAction(clip);
            if (this.currentAction === nextAction && this.currentAction.isRunning()) return;
            if (this.currentAction && this.currentAction !== nextAction) {
                this.currentAction.fadeOut(fadeTime);
            }
            nextAction.reset().fadeIn(fadeTime).play();
            this.currentAction = nextAction;
        }
    

    State(): Record<string, () => void>  {
    /**
     * Car vehicle Finine State Machine
     * @returns 
     * car state
     */

        return {
            "IDLE" : () => {

            },

            "FLOATING" : () => {

                this.playAnimation("Armature.001|Armature.001|Armature.002Action.002");
            }
        
        }
    }
}