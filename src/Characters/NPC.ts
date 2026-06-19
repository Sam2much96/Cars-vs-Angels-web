import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { GameContext } from '../core/context';
import type { NavGrid } from '../Nav/NavGrid';

const MOVE_SPEED   = 3.5;
const WP_REACH     = 2.5;
const REPATH_EVERY = 4.0;
const DESPAWN_DELAY = 4.0; // seconds the corpse stays before being removed

const CITY_MIN_X = -140, CITY_MAX_X = 90;
const CITY_MIN_Z = -90,  CITY_MAX_Z = 90;

let _nextId = 0;

export class NPC {
    public readonly id: string;
    public  isDead  = false;
    public  hp      = 100;
    public  body:   CANNON.Body | null = null;
    public  mesh:   THREE.Object3D | null = null;
    public readonly ready: Promise<void>;

    private readonly ctx: GameContext;
    private navGrid: NavGrid | null = null;
    private path: THREE.Vector3[] = [];
    private repathTimer  = 0;
    private knockbackTimer = 0;
    private readonly spawnPos: THREE.Vector3;

    // Single rigid body that drives the whole mesh after death
    private tumbleBody:  CANNON.Body | null = null;
    private deathTimer   = 0;

    private mixer: THREE.AnimationMixer | null = null;

    private static _tpl: { scene: THREE.Object3D; clips: THREE.AnimationClip[] } | null = null;
    private static _tplLoad: Promise<void> | null = null;

    constructor(ctx: GameContext, spawnPos: THREE.Vector3) {
        this.ctx      = ctx;
        this.id       = `npc_${_nextId++}`;
        this.spawnPos = spawnPos.clone();

        if (!NPC._tplLoad) {
            NPC._tplLoad = new Promise<void>((resolve, reject) => {
                ctx.loader.load(
                    './Female_Nude_Rigged.glb',
                    (gltf) => { NPC._tpl = { scene: gltf.scene, clips: gltf.animations }; resolve(); },
                    undefined,
                    (err) => { console.error('NPC: failed to load', err); reject(err); },
                );
            });
        }

        this.ready = NPC._tplLoad.then(() => this._init());

        window.addEventListener('npc-hit', (e) => {
            const { id, damage, dir } = (e as CustomEvent<{ id: string; damage: number; dir: { x: number; y: number; z: number } }>).detail;
            if (id !== this.id || this.isDead || !this.body) return;
            this.hp -= damage;
            if (this.hp <= 0) { this._die(dir); return; }
            const FORCE = 25;
            this.body.applyImpulse(new CANNON.Vec3(dir.x * FORCE, 6, dir.z * FORCE), this.body.position);
            this.body.wakeUp();
            this.knockbackTimer = 0.4;
        });
    }

    private _init(): void {
        const { scene, world } = this.ctx;
        const tpl = NPC._tpl!;

        this.mesh = skeletonClone(tpl.scene);
        this.mesh.scale.setScalar(1.0);
        this.mesh.position.copy(this.spawnPos);
        scene.add(this.mesh);

        this.mixer = new THREE.AnimationMixer(this.mesh);
        const walkClip = THREE.AnimationClip.findByName(tpl.clips, 'walking');
        if (walkClip) this.mixer.clipAction(walkClip).play();

        const radius = 0.35, height = 1.4;
        const body = new CANNON.Body({ mass: 60, linearDamping: 0.6, angularDamping: 1.0, fixedRotation: true });
        body.addShape(new CANNON.Cylinder(radius, radius, height, 8));
        body.addShape(new CANNON.Sphere(radius), new CANNON.Vec3(0,  height / 2, 0));
        body.addShape(new CANNON.Sphere(radius), new CANNON.Vec3(0, -height / 2, 0));
        body.position.set(this.spawnPos.x, this.spawnPos.y, this.spawnPos.z);
        world.addBody(body);
        this.body = body;

        body.addEventListener('collide', (e: any) => {
            if (this.isDead) return;
            const carBody = window.Vehicle?.carBody;
            if (!carBody || e.body !== carBody) return;
            const v = carBody.velocity;
            const speed = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
            if (speed < 3) return;
            const dir = { x: v.x / speed, y: 0, z: v.z / speed };
            this.hp -= Math.min(100, speed * 12);
            if (this.hp <= 0) {
                this._die(dir);
            } else {
                this.knockbackTimer = 0.6;
                body.applyImpulse(new CANNON.Vec3(dir.x * speed * 4, 5, dir.z * speed * 4), body.position);
            }
        });
    }

    private _die(dir?: { x: number; y: number; z: number }): void {
        if (this.isDead) return;
        this.isDead = true;

        if (this.mixer) { this.mixer.stopAllAction(); this.mixer = null; }

        window.dispatchEvent(new CustomEvent('npc-killed', { detail: { id: this.id } }));

        // ── Tumble body: one sphere that carries the whole mesh through the air ──
        if (this.mesh) {
            const tumble = new CANNON.Body({ mass: 70, linearDamping: 0.25, angularDamping: 0.3 });
            tumble.addShape(new CANNON.Sphere(0.55));
            tumble.position.set(this.mesh.position.x, this.mesh.position.y + 0.9, this.mesh.position.z);

            if (dir) {
                const carVel   = window.Vehicle?.carBody?.velocity;
                const carSpeed = carVel ? Math.sqrt(carVel.x ** 2 + carVel.y ** 2 + carVel.z ** 2) : 12;
                tumble.velocity.set(dir.x * carSpeed, 6, dir.z * carSpeed);
                tumble.angularVelocity.set(
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 10,
                    (Math.random() - 0.5) * 10,
                );
            }

            this.ctx.world.addBody(tumble);
            this.tumbleBody = tumble;
        }

        this.deathTimer = DESPAWN_DELAY;

        // Defer capsule removal to after the physics step
        const cap = this.body;
        this.body = null;
        if (cap) setTimeout(() => this.ctx.world.removeBody(cap), 0);
    }

    setNavGrid(grid: NavGrid): void { this.navGrid = grid; }

    private _pickWanderTarget(): THREE.Vector3 {
        const x   = CITY_MIN_X + Math.random() * (CITY_MAX_X - CITY_MIN_X);
        const z   = CITY_MIN_Z + Math.random() * (CITY_MAX_Z - CITY_MIN_Z);
        const raw = new THREE.Vector3(x, 2, z);
        return this.navGrid ? this.navGrid.snapToWalkable(raw) : raw;
    }

    update(delta: number): void {
        // ── Dead: drive mesh from tumble body, then clean up ──────────────────
        if (this.isDead) {
            if (this.tumbleBody && this.mesh) {
                this.mesh.position.set(
                    this.tumbleBody.position.x,
                    this.tumbleBody.position.y - 0.9,
                    this.tumbleBody.position.z,
                );
                this.mesh.quaternion.set(
                    this.tumbleBody.quaternion.x,
                    this.tumbleBody.quaternion.y,
                    this.tumbleBody.quaternion.z,
                    this.tumbleBody.quaternion.w,
                );
            }

            this.deathTimer -= delta;
            if (this.deathTimer <= 0) this._cleanup();
            return;
        }

        if (!this.body || !this.mesh) return;

        this.mixer?.update(delta);
        this.knockbackTimer = Math.max(0, this.knockbackTimer - delta);

        if (this.knockbackTimer > 0) { this._syncMesh(); return; }

        // ── Wander ────────────────────────────────────────────────────────────
        this.repathTimer -= delta;
        if (this.repathTimer <= 0 || this.path.length === 0) {
            this.repathTimer = REPATH_EVERY;
            const target = this._pickWanderTarget();
            if (this.navGrid) {
                const from = new THREE.Vector3(this.body.position.x, this.body.position.y, this.body.position.z);
                this.path  = this.navGrid.findPath(from, target);
            }
        }

        const ap = this.body.position;
        if (this.path.length > 0) {
            const wp   = this.path[0];
            const dx   = wp.x - ap.x, dz = wp.z - ap.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist < WP_REACH) {
                this.path.shift();
            } else {
                this.body.velocity.x = (dx / dist) * MOVE_SPEED;
                this.body.velocity.z = (dz / dist) * MOVE_SPEED;
                this.body.velocity.y = (2 - ap.y) * 4;
                this.mesh.rotation.y = Math.atan2(dx, dz);
            }
        } else {
            this.body.velocity.x = 0;
            this.body.velocity.z = 0;
        }

        this._syncMesh();
    }

    private _syncMesh(): void {
        if (!this.body || !this.mesh) return;
        this.mesh.position.set(this.body.position.x, this.body.position.y - 0.9, this.body.position.z);
    }

    private _cleanup(): void {
        if (this.mesh)       { this.ctx.scene.remove(this.mesh);              this.mesh       = null; }
        if (this.tumbleBody) { this.ctx.world.removeBody(this.tumbleBody);    this.tumbleBody = null; }
    }
}
