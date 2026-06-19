/**
 * FPSController
 *
 * Self-contained first-person shooter mode. Attach to the game loop and call:
 *   fpsController.enable()  / fpsController.disable()  / fpsController.toggle()
 *   fpsController.update(delta)   ← each frame while active
 *
 * Communicates with the UI exclusively via CustomEvents:
 *   fps-mode-enter   { crosshair, name }
 *   fps-mode-exit
 *   fps-weapon-change { crosshair, name }
 *   fps-hitmarker    { active: boolean }
 *   fps-shoot
 *   angel-hit        { damage }
 *
 * Dependencies:
 *   - ctx.camera  — repositioned every frame in FPS mode
 *   - ctx.scene   — raycasted for hit detection
 *   - ctx.loader  — loads gun GLBs
 *   - player.body — physics body for movement
 *   - player.fpsControlled — set to true to suppress GTA input in Human.ts
 */

import * as THREE from 'three';
import { Howl, Howler } from 'howler';
import { CameraJoystick } from '../UI/Inputs/VirtualJoystick.tsx';
import type { GameContext } from '../core/context';
import type { Human }      from '../Characters/Human';
import { WEAPONS }         from './WeaponConfig';
import type { WeaponConfig } from './WeaponConfig';

type SwitchPhase = 'idle' | 'lowering' | 'raising';

const SWITCH_HALF = 0.12; // seconds for each half of weapon swap animation

export class FPSController {
    public active = false;

    private readonly ctx:    GameContext;
    private readonly player: Human;

    // ── Look state ─────────────────────────────────────────────────────────────
    private pitch = 0;   // radians, up/down, clamped ±~85°
    private yaw   = 0;   // radians, left/right

    // ── Weapon system ──────────────────────────────────────────────────────────
    private weaponIndex  = 0;
    private weaponConfig : WeaponConfig = WEAPONS[0];

    // Separate scene rendered after the world with clearDepth() — gun never clips
    public  readonly weaponScene  = new THREE.Scene();
    private readonly weaponGroup  = new THREE.Group();
    private readonly weaponModels : (THREE.Object3D | null)[] = WEAPONS.map(() => null);

    // Weapon switch animation
    private switchPhase          : SwitchPhase = 'idle';
    private switchTimer          = 0;
    private pendingWeaponIndex   = 0;
    // Camera-local animation offsets applied to the model's local position each frame
    private switchYOffset = 0;
    private recoilZOffset = 0;

    // ── Shoot state ────────────────────────────────────────────────────────────
    private cooldownTimer  = 0;
    private recoilTimer    = 0;
    private hitMarkerTimer = 0;
    private mouseHeld      = false;

    // ── Audio ──────────────────────────────────────────────────────────────────
    private readonly sfxShoot       : Howl[] = WEAPONS.map(w => new Howl({ src: [w.soundPath],        volume: 0.7 }));
    private readonly sfxWeaponChange          = new Howl({ src: ['/weapon_change.ogg'], volume: 0.6 });

    // ── Raycast ────────────────────────────────────────────────────────────────
    private readonly raycaster = new THREE.Raycaster();


    // ── Held key set (owns its own state instead of relying on InputManager) ──
    private readonly _heldKeys = new Set<string>();

    // ── Event handlers stored as arrow fns so they can be removed ─────────────

    private readonly _onMouseMove = (e: MouseEvent) => {
        if (!this.active || !document.pointerLockElement) return;
        const sensitivity = 0.002;
        this.yaw   -= e.movementX * sensitivity;
        this.pitch -= e.movementY * sensitivity;
        this.pitch  = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));
    };

    private readonly _onMouseDown = (e: MouseEvent) => {
        if (!this.active || e.button !== 0) return;
        this.mouseHeld = true;
        if (!this.weaponConfig.isAutomatic) this._tryShoot();
    };

    private readonly _onMouseUp = (e: MouseEvent) => {
        if (e.button === 0) this.mouseHeld = false;
    };

    private readonly _onKeyDown = (e: KeyboardEvent) => {
        if (!this.active) return;
        this._heldKeys.add(e.code);
        if (e.code === 'KeyV') { this.disable(); return; }
        if (e.code === 'KeyQ' || e.code === 'Tab') { e.preventDefault(); this._startWeaponSwitch(); }
    };

    private readonly _onKeyUp = (e: KeyboardEvent) => {
        this._heldKeys.delete(e.code);
    };

    private readonly _onSwitchWeaponBtn = () => this._startWeaponSwitch();

    private readonly _onFireStart = () => {
        if (!this.active) return;
        this.mouseHeld = true;
        if (!this.weaponConfig.isAutomatic) this._tryShoot();
    };
    private readonly _onFireStop = () => { this.mouseHeld = false; };

    // ── Constructor ────────────────────────────────────────────────────────────

    constructor(ctx: GameContext, player: Human) {
        this.ctx    = ctx;
        this.player = player;

            // Weapon lives in its own scene, rendered with clearDepth() after the world
        // (same principle as Godot's SubViewport weapon camera). Because the depth
        // buffer is cleared before the weapon pass, the gun can never clip into walls.
        this.weaponScene.add(this.weaponGroup);
        this.weaponScene.add(new THREE.AmbientLight(0xffffff, 2.0));
        this.weaponGroup.visible       = false;
        this.weaponGroup.frustumCulled = false;

        this._preloadWeaponModels();
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    toggle(): void { this.active ? this.disable() : this.enable(); }

    enable(): void {
        if (this.active) return;
        this.active = true;

        // Mobile: Web Audio context starts suspended — resume it now while we
        // are inside a confirmed user-gesture so sounds work when the player fires
        Howler.ctx?.resume?.().catch(() => {});

        // Seed look angles from current camera world direction
        const dir = new THREE.Vector3();
        this.ctx.camera.getWorldDirection(dir);
        this.yaw   = Math.atan2(-dir.x, -dir.z);
        this.pitch = Math.asin(Math.max(-1, Math.min(1, dir.y)));

        // Request pointer lock — required for raw mouse delta
        try { this.ctx.renderer.domElement.requestPointerLock(); }
        catch { /* browser may deny before user interaction */ }

        // Suppress GTA-style input in Human.ts
        this.player.fpsControlled = true;
        // Hide character mesh (camera is inside the capsule in FPS mode)
        if (this.player.mesh) this.player.mesh.visible = false;

        // Restore the last-used weapon
        this.weaponConfig = WEAPONS[this.weaponIndex];
        this.weaponGroup.visible = true;
        this._swapModel(this.weaponIndex);
        this.sfxShoot[this.weaponIndex]?.play();

        document.addEventListener('mousemove', this._onMouseMove);
        document.addEventListener('mousedown', this._onMouseDown);
        document.addEventListener('mouseup',   this._onMouseUp);
        document.addEventListener('keydown',   this._onKeyDown);
        document.addEventListener('keyup',     this._onKeyUp);
        window.addEventListener('fps-switch-weapon', this._onSwitchWeaponBtn);
        window.addEventListener('fps-fire-start',   this._onFireStart);
        window.addEventListener('fps-fire-stop',    this._onFireStop);

        window.dispatchEvent(new CustomEvent('fps-mode-enter', {
            detail: { crosshair: this.weaponConfig.crosshairSrc, name: this.weaponConfig.name },
        }));
    }

    disable(): void {
        if (!this.active) return;
        this.active    = false;
        this.mouseHeld = false;

        try { document.exitPointerLock?.(); } catch { }

        this.player.fpsControlled = false;
        this.weaponGroup.visible = false;

        // Immediately place the mesh at the physics body's current position so
        // there's no one-frame pop when syncGraphics() runs on the next update.
        if (this.player.mesh && this.player.body) {
            const b = this.player.body;
            this.player.mesh.position.set(b.position.x, b.position.y - 0.8, b.position.z);
            // Face the model toward where the player was aiming
            this.player.mesh.rotation.y = this.yaw;
            this.player.mesh.visible = true;
        } else if (this.player.mesh) {
            this.player.mesh.visible = true;
        }

        this._heldKeys.clear();
        document.removeEventListener('mousemove', this._onMouseMove);
        document.removeEventListener('mousedown', this._onMouseDown);
        document.removeEventListener('mouseup',   this._onMouseUp);
        document.removeEventListener('keydown',   this._onKeyDown);
        document.removeEventListener('keyup',     this._onKeyUp);
        window.removeEventListener('fps-switch-weapon', this._onSwitchWeaponBtn);
        window.removeEventListener('fps-fire-start',   this._onFireStart);
        window.removeEventListener('fps-fire-stop',    this._onFireStop);

        window.dispatchEvent(new CustomEvent('fps-mode-exit'));
    }

    // ── Per-frame update ───────────────────────────────────────────────────────

    update(delta: number): void {
        if (!this.active) return;

        // Auto-fire while mouse held (full-auto weapons only)
        if (this.mouseHeld && this.weaponConfig.isAutomatic) this._tryShoot();

        this._updateMovement();
        this._updateCamera(delta);
        this._updateWeaponAnim(delta);

        this.cooldownTimer  = Math.max(0, this.cooldownTimer  - delta);
        this.recoilTimer    = Math.max(0, this.recoilTimer    - delta);
        this.hitMarkerTimer = Math.max(0, this.hitMarkerTimer - delta);

        window.dispatchEvent(new CustomEvent('fps-hitmarker', {
            detail: { active: this.hitMarkerTimer > 0 },
        }));
    }

    // ── Movement ───────────────────────────────────────────────────────────────

    private _updateMovement(): void {
        const body = this.player.body;
        if (!body) return;

        const speed  = 10;
        const sinYaw = Math.sin(this.yaw);
        const cosYaw = Math.cos(this.yaw);

        const k = this._heldKeys;
        let vx = 0, vz = 0;
        if (k.has('KeyW') || k.has('ArrowUp'))    { vx -= sinYaw; vz -= cosYaw; }
        if (k.has('KeyS') || k.has('ArrowDown'))  { vx += sinYaw; vz += cosYaw; }
        if (k.has('KeyA') || k.has('ArrowLeft'))  { vx -= cosYaw; vz += sinYaw; }
        if (k.has('KeyD') || k.has('ArrowRight')) { vx += cosYaw; vz -= sinYaw; }

        const len = Math.sqrt(vx * vx + vz * vz);
        if (len > 0) {
            vx = (vx / len) * speed;
            vz = (vz / len) * speed;
            body.wakeUp();
        }

        body.velocity.x = vx;
        body.velocity.z = vz;

        if (k.has('Space') && Math.abs(body.velocity.y) < 1.0) {
            body.velocity.y = 6;
            body.wakeUp();
        }
    }

    // ── Camera ─────────────────────────────────────────────────────────────────

    // Joystick look speed — matches the orbit camera's yawSpeed / pitchSpeed
    private static readonly YAW_SPEED   = 2.0;
    private static readonly PITCH_SPEED = 1.5;

    private _updateCamera(delta: number): void {
        const { camera } = this.ctx;
        const body = this.player.body;
        if (!body) return;

        // ── Right joystick look (touch + PC mouse-sim on right half) ──────────
        const axis = CameraJoystick.getAxis();
        this.yaw   -= axis.x * FPSController.YAW_SPEED   * delta;
        this.pitch -= axis.y * FPSController.PITCH_SPEED  * delta;
        this.pitch  = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, this.pitch));

        camera.position.set(
            body.position.x,
            body.position.y + 0.8,  // eye height above capsule centre
            body.position.z,
        );

        // YXZ order: yaw first (Y), then pitch (X), no roll
        camera.rotation.order = 'YXZ';
        camera.rotation.y = this.yaw;
        camera.rotation.x = this.pitch;
        camera.rotation.z = 0;

        // ── Sync weapon group to camera world transform ─────────────────────
        // The group matches the camera exactly so the gun model's local position
        // is interpreted in camera-local space (right/down/forward from view).
        camera.updateMatrixWorld();
        this.weaponGroup.position.copy(camera.position);
        this.weaponGroup.quaternion.copy(camera.quaternion);

        // Apply animation offsets to the active model's local position
        const model = this.weaponModels[this.weaponIndex];
        if (model) {
            const cfg = this.weaponConfig;
            model.position.set(
                cfg.modelPosition.x,
                cfg.modelPosition.y + this.switchYOffset,
                cfg.modelPosition.z + this.recoilZOffset,
            );
        }
    }

    // ── Weapon animation ───────────────────────────────────────────────────────

    private _updateWeaponAnim(delta: number): void {
        // ── Weapon switch animation ────────────────────────────────────────────
        if (this.switchPhase !== 'idle') {
            this.switchTimer += delta;
            const t = Math.min(this.switchTimer / SWITCH_HALF, 1);

            if (this.switchPhase === 'lowering') {
                this.switchYOffset = -0.25 * t;
                if (t >= 1) {
                    this._swapModel(this.pendingWeaponIndex);
                    this.weaponIndex  = this.pendingWeaponIndex;
                    this.weaponConfig = WEAPONS[this.weaponIndex];
                    this.switchPhase  = 'raising';
                    this.switchTimer  = 0;
                    window.dispatchEvent(new CustomEvent('fps-weapon-change', {
                        detail: { crosshair: this.weaponConfig.crosshairSrc, name: this.weaponConfig.name },
                    }));
                }
            } else if (this.switchPhase === 'raising') {
                this.switchYOffset = -0.25 * (1 - t);
                if (t >= 1) {
                    this.switchYOffset = 0;
                    this.switchPhase   = 'idle';
                }
            }
        }

        // ── Recoil: gun kicks back (toward camera = +Z in camera-local space) ─
        this.recoilZOffset = this.recoilTimer > 0 ? 0.05 : 0;
    }

    // ── Shoot ──────────────────────────────────────────────────────────────────

    private _tryShoot(): void {
        if (this.cooldownTimer > 0 || this.switchPhase !== 'idle') return;

        const cfg = this.weaponConfig;
        this.cooldownTimer = cfg.cooldown;
        this.recoilTimer   = cfg.cooldown * 0.4;

        this.sfxShoot[this.weaponIndex]?.play();
        this.pitch += cfg.knockbackPitch; // camera kick

        // Build the ray once — same for all pellets (spread added per-pellet below)
        const camDir = new THREE.Vector3();
        this.ctx.camera.getWorldDirection(camDir);
        const camPos = new THREE.Vector3();
        this.ctx.camera.getWorldPosition(camPos);

        for (let i = 0; i < cfg.shotCount; i++) {
            // Spread: jitter the direction slightly
            const spreadDir = camDir.clone().add(new THREE.Vector3(
                (Math.random() - 0.5) * cfg.spread,
                (Math.random() - 0.5) * cfg.spread,
                (Math.random() - 0.5) * cfg.spread,
            )).normalize();

            // ── Angel hits: ray-sphere test against each physics body ────────
            // Skinned mesh raycasts are unreliable; body spheres are always accurate.
            let hitAngel = false;
            for (const angel of (window.angels ?? [])) {
                if (!angel.body || angel.isDead) continue;
                const ap = new THREE.Vector3(angel.body.position.x, angel.body.position.y, angel.body.position.z);
                const t  = Math.max(0, ap.clone().sub(camPos).dot(spreadDir));
                const closest = camPos.clone().addScaledVector(spreadDir, t);
                if (closest.distanceTo(ap) < 1.8 && t < cfg.maxDistance) {
                    this.hitMarkerTimer = 0.18;
                    window.dispatchEvent(new CustomEvent('angel-hit', {
                        detail: { id: angel.id, damage: cfg.damage, dir: { x: spreadDir.x, y: spreadDir.y, z: spreadDir.z } },
                    }));
                    this._spawnImpact(closest, closest.clone().sub(ap).normalize());
                    hitAngel = true;
                    break;
                }
            }
            if (hitAngel) continue;

            // ── World geometry hit ────────────────────────────────────────────
            this.raycaster.set(camPos, spreadDir);
            const hits = this.raycaster.intersectObjects(this.ctx.scene.children, true);
            if (!hits.length) continue;
            const hit = hits[0];
            if (hit.distance > cfg.maxDistance) continue;
            this._spawnImpact(hit.point, hit.face?.normal ?? new THREE.Vector3(0, 1, 0));
        }

        window.dispatchEvent(new CustomEvent('fps-shoot'));
    }

    private _spawnImpact(point: THREE.Vector3, normal: THREE.Vector3): void {
        const geo  = new THREE.SphereGeometry(0.08, 5, 5);
        const mat  = new THREE.MeshBasicMaterial({ color: 0xffff88 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(point).addScaledVector(normal, 0.05);
        this.ctx.scene.add(mesh);
        setTimeout(() => this.ctx.scene.remove(mesh), 100);
    }

    // ── Weapon model management ────────────────────────────────────────────────

    private _preloadWeaponModels(): void {
        WEAPONS.forEach((cfg, idx) => {
            this.ctx.loader.load(
                cfg.modelPath,
                (gltf) => {
                    const model = gltf.scene;
                    model.position.copy(cfg.modelPosition);
                    model.rotation.copy(cfg.modelRotation);
                    model.scale.setScalar(cfg.modelScale);

                    // Disable frustum culling — bounding sphere world-space maths can
                    // reject the gun since it moves every frame to match the camera
                    model.traverse((child) => { child.frustumCulled = false; });

                    this.weaponModels[idx] = model;

                    // If FPS is active and this is the current gun, show it now
                    if (this.active && idx === this.weaponIndex) this._swapModel(idx);
                },
                undefined,
                (err) => console.error(`FPS: failed to load ${cfg.modelPath}`, err),
            );
        });
    }

    private _swapModel(index: number): void {
        while (this.weaponGroup.children.length) {
            this.weaponGroup.remove(this.weaponGroup.children[0]);
        }
        const model = this.weaponModels[index];
        if (model) this.weaponGroup.add(model);
    }

    private _startWeaponSwitch(): void {
        if (this.switchPhase !== 'idle') return;
        this.sfxWeaponChange.play();
        this.pendingWeaponIndex = (this.weaponIndex + 1) % WEAPONS.length;
        this.switchPhase = 'lowering';
        this.switchTimer = 0;
    }
}
