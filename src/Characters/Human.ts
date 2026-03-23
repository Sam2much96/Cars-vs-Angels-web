import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { InputManager } from "../UI/Inputs/InputManager";
import { VirtualJoystick } from '../UI/Inputs/VirtualJoystick.tsx';
import { Vehicle } from "../Vehicle/Vehicle";

// ── HITBOX CONFIG ─────────────────────────────────────────────────────────────
const HITBOX_CONFIG: Record<string, { radius: number; damage: number }> = {
    hand_l: { radius: 0.08, damage: 10 },
    hand_r: { radius: 0.08, damage: 10 },
    foot_l: { radius: 0.10, damage: 15 },
    foot_r: { radius: 0.10, damage: 15 },
};

const GROUP_PLAYER_HITBOX = 2;
const GROUP_ENEMY         = 4;

// ── RAGDOLL CONFIG ────────────────────────────────────────────────────────────
// Scale matches your character model size — tweak if parts look too big/small
const RAGDOLL_SCALE = 0.6;

// Maps each ragdoll body part to the bone it should snap to on death
// Keys must match your GLB bone names exactly
const RAGDOLL_BONE_MAP: Record<string, string> = {
    head       : 'head',
    upperBody  : 'spine_03',
    pelvis     : 'pelvis',
    upperLeftArm  : 'upperarm_l',
    lowerLeftArm  : 'lowerarm_l',
    upperRightArm : 'upperarm_r',
    lowerRightArm : 'lowerarm_r',
    upperLeftLeg  : 'thigh_l',
    lowerLeftLeg  : 'calf_l',
    upperRightLeg : 'thigh_r',
    lowerRightLeg : 'calf_r',
};
// ─────────────────────────────────────────────────────────────────────────────

interface Hitbox {
    boneName : string;
    bone     : THREE.Bone;
    body     : CANNON.Body;
    mesh     : THREE.Mesh;
    damage   : number;
}

interface RagdollPart {
    name       : string;
    body       : CANNON.Body;
    mesh       : THREE.Mesh;   // debug box/sphere visual
    boneName   : string;       // which bone to snap to on activate
}

export class Human {
    mesh  : THREE.Object3D<THREE.Object3DEventMap> | null;
    body  : CANNON.Body | null;
    world : CANNON.World;

    public playerAnims  : THREE.AnimationMixer | null = null;
    clips               : THREE.AnimationClip[]       = [];
    currentAction       : THREE.AnimationAction | null = null;

    private vehicle   : Vehicle | null = null;
    private isDriving : boolean        = false;

    public playerPos    = new THREE.Vector3();
    public cameraOffset = new THREE.Vector3(2, 1.5, 2);

    public ready      : Promise<void>;
    public spawnPoint = new THREE.Vector3(-19, 24, 0.5);

    // ── Health ────────────────────────────────────────────────────────────────
    public hp    : number = 100;
    public maxHp : number = 100;
    public isDead: boolean = false;

    // ── Hitboxes ──────────────────────────────────────────────────────────────
    private hitboxes     : Hitbox[] = [];
    private attackActive : boolean  = false;
    private debugVisible : boolean  = true;

    public onHit: ((boneName: string, damage: number, enemyBody: CANNON.Body) => void) | null = null;

    // ── Ragdoll ───────────────────────────────────────────────────────────────
    private ragdollParts      : RagdollPart[]      = [];
    private ragdollConstraints: CANNON.Constraint[] = [];
    private ragdollActive     : boolean             = false;
    private skeleton          : THREE.Skeleton | null = null;

    // Called when the player dies — hook in your game's death logic here
    // e.g. human.onDeath = () => { showDeathScreen(); }
    public onDeath: (() => void) | null = null;
    // ─────────────────────────────────────────────────────────────────────────

    constructor(loader = window.loader, scene = window.scene, world = window.world) {
        this.mesh  = null;
        this.body  = null;
        this.world = world;

        InputManager.initialize();

        this.ready = new Promise((resolve) => {
            loader.load('./CJ_5.glb',
                (gltf) => {
                    console.log("animation debug:", gltf.animations.map(a => a.name));

                    const man = gltf.scene;
                    man.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            child.castShadow    = true;
                            child.receiveShadow = true;
                        }
                        if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
                            this.skeleton = (child as THREE.SkinnedMesh).skeleton;
                        }
                    });

                    scene.add(man);
                    this.mesh = man;

                    this.playerAnims = new THREE.AnimationMixer(man);
                    this.clips       = gltf.animations;

                    this.body = this._createCapsuleBody();
                    world.addBody(this.body);

                    this._initHitboxes(man, scene);
                    this._initRagdoll(scene);

                    resolve();
                },
                (progress) => {
                    const percent = progress.total > 0
                        ? Math.round((progress.loaded / progress.total) * 100)
                        : 0;
                    window.dispatchEvent(new CustomEvent("load-progress", {
                        detail: { percent, label: "Loading character..." }
                    }));
                },
                (err) => console.error('CHARACTER LOAD ERROR:', err)
            );
        });

        window.addEventListener("player-interact", () => {
            if (!this.isDriving) {
                this.State()["ENTER_VEHICLE"]();
                return;
            }
            this.State()["EXIT_VEHICLE"]();
        });
    }

    // ── HEALTH ────────────────────────────────────────────────────────────────

    takeDamage(amount: number): void {
        if (this.isDead) return;

        this.hp = Math.max(0, this.hp - amount);
        console.log(`Player HP: ${this.hp}/${this.maxHp}`);

        if (this.hp <= 0) {
            this._die();
        }
    }

    heal(amount: number): void {
        if (this.isDead) return;
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    private _die(): void {
        if (this.isDead) return;
        this.isDead = true;

        console.log("Player died — enabling ragdoll");

        // Stop all animations cleanly
        if (this.playerAnims) this.playerAnims.stopAllAction();

        // Disable hitboxes — dead players can't attack
        this.disableAttack();

        // Activate ragdoll
        this.enableRagdoll();

        // Fire game logic callback
        if (this.onDeath) this.onDeath();
    }

    // ── RAGDOLL INIT ──────────────────────────────────────────────────────────
    // Builds all ragdoll bodies and constraints upfront but keeps them
    // parked underground and invisible until death.

    private _initRagdoll(scene: THREE.Scene): void {
        const s = RAGDOLL_SCALE;

        const shouldersDistance = 0.5 * s;
        const upperArmLength    = 0.4 * s;
        const lowerArmLength    = 0.4 * s;
        const upperArmSize      = 0.2 * s;
        const lowerArmSize      = 0.2 * s;
        const neckLength        = 0.1 * s;
        const headRadius        = 0.25 * s;
        const upperBodyLength   = 0.6 * s;
        const pelvisLength      = 0.4 * s;
        const upperLegLength    = 0.5 * s;
        const upperLegSize      = 0.2 * s;
        const lowerLegSize      = 0.2 * s;
        const lowerLegLength    = 0.5 * s;

        // ── Shapes ────────────────────────────────────────────────────────────
        const headShape      = new CANNON.Sphere(headRadius);
        const upperArmShape  = new CANNON.Box(new CANNON.Vec3(upperArmLength * 0.5, upperArmSize * 0.5, upperArmSize * 0.5));
        const lowerArmShape  = new CANNON.Box(new CANNON.Vec3(lowerArmLength * 0.5, lowerArmSize * 0.5, lowerArmSize * 0.5));
        const upperBodyShape = new CANNON.Box(new CANNON.Vec3(shouldersDistance * 0.5, lowerArmSize * 0.5, upperBodyLength * 0.5));
        const pelvisShape    = new CANNON.Box(new CANNON.Vec3(shouldersDistance * 0.5, lowerArmSize * 0.5, pelvisLength * 0.5));
        const upperLegShape  = new CANNON.Box(new CANNON.Vec3(upperLegSize * 0.5, lowerArmSize * 0.5, upperLegLength * 0.5));
        const lowerLegShape  = new CANNON.Box(new CANNON.Vec3(lowerLegSize * 0.5, lowerArmSize * 0.5, lowerLegLength * 0.5));

        // ── Bodies — parked underground until death ───────────────────────────
        const makeBody = (shape: CANNON.Shape, boneName: string, name: string): CANNON.Body => {
            const body = new CANNON.Body({ mass: 1 });
            body.addShape(shape);
            body.position.set(0, -1000, 0); // parked underground
            body.sleep();
            this.world.addBody(body);

            // Debug mesh
            let geo: THREE.BufferGeometry;
            if (shape instanceof CANNON.Sphere) {
                geo = new THREE.SphereGeometry((shape as CANNON.Sphere).radius, 8, 8);
            } else {
                const h = (shape as CANNON.Box).halfExtents;
                geo = new THREE.BoxGeometry(h.x * 2, h.y * 2, h.z * 2);
            }
            const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
                color    : 0xff6600,
                wireframe: true,
                transparent: true,
                opacity  : 0.6,
            }));
            mesh.visible = false;
            scene.add(mesh);

            this.ragdollParts.push({ name, body, mesh, boneName });
            return body;
        };

        // ── Create all parts ──────────────────────────────────────────────────
        const lowerLeftLeg  = makeBody(lowerLegShape,  'calf_l',    'lowerLeftLeg');
        const lowerRightLeg = makeBody(lowerLegShape,  'calf_r',    'lowerRightLeg');
        const upperLeftLeg  = makeBody(upperLegShape,  'thigh_l',   'upperLeftLeg');
        const upperRightLeg = makeBody(upperLegShape,  'thigh_r',   'upperRightLeg');
        const pelvis        = makeBody(pelvisShape,    'pelvis',    'pelvis');
        const upperBody     = makeBody(upperBodyShape, 'spine_03',  'upperBody');
        const head          = makeBody(headShape,      'head',      'head');
        const upperLeftArm  = makeBody(upperArmShape,  'upperarm_l','upperLeftArm');
        const upperRightArm = makeBody(upperArmShape,  'upperarm_r','upperRightArm');
        const lowerLeftArm  = makeBody(lowerArmShape,  'lowerarm_l','lowerLeftArm');
        const lowerRightArm = makeBody(lowerArmShape,  'lowerarm_r','lowerRightArm');

        // ── Constraints (same as the ragdoll example) ─────────────────────────
        const angle       = Math.PI / 4;
        const twistAngle  = Math.PI / 8;
        const angleShoulder = Math.PI / 3;

        const neckJoint = new CANNON.ConeTwistConstraint(head, upperBody, {
            pivotA: new CANNON.Vec3(0, 0, -headRadius - neckLength / 2),
            pivotB: new CANNON.Vec3(0, 0, upperBodyLength / 2),
            axisA: CANNON.Vec3.UNIT_Z, axisB: CANNON.Vec3.UNIT_Z,
            angle, twistAngle,
        });

        const leftKneeJoint = new CANNON.ConeTwistConstraint(lowerLeftLeg, upperLeftLeg, {
            pivotA: new CANNON.Vec3(0, 0, lowerLegLength / 2),
            pivotB: new CANNON.Vec3(0, 0, -upperLegLength / 2),
            axisA: CANNON.Vec3.UNIT_Z, axisB: CANNON.Vec3.UNIT_Z,
            angle, twistAngle,
        });
        const rightKneeJoint = new CANNON.ConeTwistConstraint(lowerRightLeg, upperRightLeg, {
            pivotA: new CANNON.Vec3(0, 0, lowerLegLength / 2),
            pivotB: new CANNON.Vec3(0, 0, -upperLegLength / 2),
            axisA: CANNON.Vec3.UNIT_Z, axisB: CANNON.Vec3.UNIT_Z,
            angle, twistAngle,
        });

        const leftHipJoint = new CANNON.ConeTwistConstraint(upperLeftLeg, pelvis, {
            pivotA: new CANNON.Vec3(0, 0, upperLegLength / 2),
            pivotB: new CANNON.Vec3(shouldersDistance / 2, 0, -pelvisLength / 2),
            axisA: CANNON.Vec3.UNIT_Z, axisB: CANNON.Vec3.UNIT_Z,
            angle, twistAngle,
        });
        const rightHipJoint = new CANNON.ConeTwistConstraint(upperRightLeg, pelvis, {
            pivotA: new CANNON.Vec3(0, 0, upperLegLength / 2),
            pivotB: new CANNON.Vec3(-shouldersDistance / 2, 0, -pelvisLength / 2),
            axisA: CANNON.Vec3.UNIT_Z, axisB: CANNON.Vec3.UNIT_Z,
            angle, twistAngle,
        });

        const spineJoint = new CANNON.ConeTwistConstraint(pelvis, upperBody, {
            pivotA: new CANNON.Vec3(0, 0, pelvisLength / 2),
            pivotB: new CANNON.Vec3(0, 0, -upperBodyLength / 2),
            axisA: CANNON.Vec3.UNIT_Z, axisB: CANNON.Vec3.UNIT_Z,
            angle, twistAngle,
        });

        const leftShoulder = new CANNON.ConeTwistConstraint(upperBody, upperLeftArm, {
            pivotA: new CANNON.Vec3(shouldersDistance / 2, 0, upperBodyLength / 2),
            pivotB: new CANNON.Vec3(-upperArmLength / 2, 0, 0),
            axisA: CANNON.Vec3.UNIT_X, axisB: CANNON.Vec3.UNIT_X,
            angle: angleShoulder, twistAngle,
        });
        const rightShoulder = new CANNON.ConeTwistConstraint(upperBody, upperRightArm, {
            pivotA: new CANNON.Vec3(-shouldersDistance / 2, 0, upperBodyLength / 2),
            pivotB: new CANNON.Vec3(upperArmLength / 2, 0, 0),
            axisA: CANNON.Vec3.UNIT_X, axisB: CANNON.Vec3.UNIT_X,
            angle: angleShoulder, twistAngle,
        });

        const leftElbowJoint = new CANNON.ConeTwistConstraint(lowerLeftArm, upperLeftArm, {
            pivotA: new CANNON.Vec3(-lowerArmLength / 2, 0, 0),
            pivotB: new CANNON.Vec3(upperArmLength / 2, 0, 0),
            axisA: CANNON.Vec3.UNIT_X, axisB: CANNON.Vec3.UNIT_X,
            angle, twistAngle,
        });
        const rightElbowJoint = new CANNON.ConeTwistConstraint(lowerRightArm, upperRightArm, {
            pivotA: new CANNON.Vec3(lowerArmLength / 2, 0, 0),
            pivotB: new CANNON.Vec3(-upperArmLength / 2, 0, 0),
            axisA: CANNON.Vec3.UNIT_X, axisB: CANNON.Vec3.UNIT_X,
            angle, twistAngle,
        });

        this.ragdollConstraints = [
            neckJoint,
            leftKneeJoint, rightKneeJoint,
            leftHipJoint,  rightHipJoint,
            spineJoint,
            leftShoulder,  rightShoulder,
            leftElbowJoint, rightElbowJoint,
        ];

        // Add constraints to world — they are inactive until bodies wake up
        this.ragdollConstraints.forEach(c => this.world.addConstraint(c));

        console.log('Ragdoll: initialized and parked underground');
    }

    // ── RAGDOLL ACTIVATE ──────────────────────────────────────────────────────
    // Snaps each ragdoll part to the matching bone's current world position,
    // then wakes the bodies so physics takes over.

    enableRagdoll(deathImpulse?: CANNON.Vec3): void {
        if (this.ragdollActive || !this.skeleton) return;
        this.ragdollActive = true;

        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();

        for (const part of this.ragdollParts) {
            const bone = this.skeleton.getBoneByName(part.boneName);
            if (!bone) continue;

            // Snap ragdoll body to the bone's current world transform
            bone.getWorldPosition(worldPos);
            bone.getWorldQuaternion(worldQuat);

            part.body.position.set(worldPos.x, worldPos.y, worldPos.z);
            part.body.quaternion.set(worldQuat.x, worldQuat.y, worldQuat.z, worldQuat.w);

            // Carry over the player's current velocity so the ragdoll
            // doesn't freeze in mid-air — it continues moving naturally
            if (this.body) {
                part.body.velocity.set(
                    this.body.velocity.x,
                    this.body.velocity.y,
                    this.body.velocity.z,
                );
            }

            part.body.wakeUp();
        }

        // Apply optional death impulse (e.g. hit from a car, explosion)
        // Applied to the pelvis so the whole ragdoll reacts naturally
        if (deathImpulse) {
            const pelvisPart = this.ragdollParts.find(p => p.name === 'pelvis');
            if (pelvisPart) {
                pelvisPart.body.applyImpulse(deathImpulse, new CANNON.Vec3(0, 0, 0));
            }
        }

        // Hide debug wireframes — the real mesh stays visible, bones drive it
        for (const part of this.ragdollParts) part.mesh.visible = false;

        // Disable the capsule body — player can no longer move
        if (this.body) {
            this.body.position.set(0, -1000, 0);
            this.body.type = CANNON.Body.STATIC;
            this.body.sleep();
        }

        // Stop animator from overriding bone transforms
        if (this.playerAnims) this.playerAnims.stopAllAction();

        console.log('Ragdoll: active — bones driven by physics');
    }

    // ── RAGDOLL UPDATE — copy physics quaternions onto skeleton bones ──────
    // Runs every frame after death. Each cannon-es body rotation is written
    // onto its matching bone — the skinned mesh deforms automatically.

    private _updateRagdoll(): void {
        if (!this.ragdollActive || !this.skeleton) return;

        const bodyQuat        = new THREE.Quaternion();
        const parentWorldQuat = new THREE.Quaternion();

        for (const part of this.ragdollParts) {
            const bone = this.skeleton.getBoneByName(part.boneName);
            if (!bone) continue;

            // Cannon-es world quaternion -> Three.js
            bodyQuat.set(
                part.body.quaternion.x,
                part.body.quaternion.y,
                part.body.quaternion.z,
                part.body.quaternion.w,
            );

            // Bones store LOCAL rotation — subtract parent world rotation
            if (bone.parent) {
                bone.parent.getWorldQuaternion(parentWorldQuat);
                parentWorldQuat.invert();
                bone.quaternion.copy(parentWorldQuat.multiply(bodyQuat));
            } else {
                bone.quaternion.copy(bodyQuat);
            }

            // Only translate the root bone (pelvis) in world space
            // All other bones are rotation-only relative to parent
            if (part.boneName === 'pelvis') {
                bone.position.set(
                    part.body.position.x - (this.mesh?.position.x ?? 0),
                    part.body.position.y - (this.mesh?.position.y ?? 0),
                    part.body.position.z - (this.mesh?.position.z ?? 0),
                );
            }

            bone.updateMatrix();
        }
    }

    // ── RESPAWN — reset everything back to normal ─────────────────────────────

    respawn(): void {
        this.isDead        = false;
        this.hp            = this.maxHp;
        this.ragdollActive = false;

        // Park ragdoll parts underground again
        for (const part of this.ragdollParts) {
            part.body.position.set(0, -1000, 0);
            part.body.velocity.set(0, 0, 0);
            part.body.sleep();
            part.mesh.visible = false;
        }

        // Restore capsule body at spawn point
        if (this.body) {
            this.body.type = CANNON.Body.DYNAMIC;
            this.body.position.set(this.spawnPoint.x, this.spawnPoint.y, this.spawnPoint.z);
            this.body.velocity.set(0, 0, 0);
            this.body.wakeUp();
        }

        // Show mesh again and play idle
        if (this.mesh) this.mesh.visible = true;
        this.playAnimation('idle_breathe');

        console.log('Player respawned');
    }

    // ── HITBOX INIT ───────────────────────────────────────────────────────────

    private _initHitboxes(model: THREE.Object3D, scene: THREE.Scene): void {
        if (!this.skeleton) {
            console.warn('HitboxSystem: No skeleton found — hitboxes disabled');
            return;
        }

        for (const [boneName, config] of Object.entries(HITBOX_CONFIG)) {
            const bone = this.skeleton.getBoneByName(boneName);
            if (!bone) {
                console.warn(`HitboxSystem: bone "${boneName}" not found`);
                continue;
            }

            const body = new CANNON.Body({
                mass                : 0,
                collisionFilterGroup: GROUP_PLAYER_HITBOX,
                collisionFilterMask : GROUP_ENEMY,
            });
            body.addShape(new CANNON.Sphere(config.radius));
            (body as any).userData = { boneName };
            this.world.addBody(body);

            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(config.radius, 8, 8),
                new THREE.MeshBasicMaterial({
                    color      : boneName.startsWith('foot') ? 0x0088ff : 0xff4400,
                    wireframe  : true,
                    transparent: true,
                    opacity    : 0.5,
                })
            );
            mesh.visible = this.debugVisible;
            scene.add(mesh);

            this.hitboxes.push({ boneName, bone, body, mesh, damage: config.damage });
        }

        this.world.addEventListener('beginContact', (event: any) => {
            if (!this.attackActive || !this.onHit) return;
            const { bodyA, bodyB } = event;
            const hitbox = this.hitboxes.find(h => h.body === bodyA || h.body === bodyB);
            if (!hitbox) return;
            const enemyBody = hitbox.body === bodyA ? bodyB : bodyA;
            if (enemyBody.collisionFilterGroup !== GROUP_ENEMY) return;
            this.onHit(hitbox.boneName, hitbox.damage, enemyBody);
        });

        console.log(`HitboxSystem: ${this.hitboxes.length} hitboxes ready`);
    }

    private _updateHitboxes(): void {
        if (this.ragdollActive) return; // no hitboxes while dead
        const worldPos = new THREE.Vector3();
        for (const { bone, body, mesh } of this.hitboxes) {
            bone.getWorldPosition(worldPos);
            body.position.set(worldPos.x, worldPos.y, worldPos.z);
            body.velocity.set(0, 0, 0);
            mesh.position.copy(worldPos);
        }
    }

    enableAttack(): void  { this.attackActive = true; }
    disableAttack(): void { this.attackActive = false; }

    setHitboxDebug(visible: boolean): void {
        this.debugVisible = visible;
        for (const { mesh } of this.hitboxes) mesh.visible = visible;
    }

    registerEnemy(enemyBody: CANNON.Body): void {
        enemyBody.collisionFilterGroup = GROUP_ENEMY;
        enemyBody.collisionFilterMask  = GROUP_PLAYER_HITBOX;
        this.world.addBody(enemyBody);
    }

    // ── CAPSULE BODY ──────────────────────────────────────────────────────────

    _createCapsuleBody(): CANNON.Body {
        const radius     = 0.3;
        const height     = 1.2;
        const halfHeight = height / 2;

        const body = new CANNON.Body({
            mass: 70, linearDamping: 0.4, angularDamping: 1.0, fixedRotation: true,
        });
        body.addShape(new CANNON.Cylinder(radius, radius, height, 8), new CANNON.Vec3(0, 0, 0));
        body.addShape(new CANNON.Sphere(radius), new CANNON.Vec3(0,  halfHeight, 0));
        body.addShape(new CANNON.Sphere(radius), new CANNON.Vec3(0, -halfHeight, 0));
        body.position.set(this.spawnPoint.x, this.spawnPoint.y, this.spawnPoint.z);
        return body;
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

    playAttack(name: string, fadeTime: number = 0.2): void {
        if (!this.playerAnims || this.isDead) return;
        const clip = THREE.AnimationClip.findByName(this.clips, name);
        if (!clip) { console.warn(`Attack animation "${name}" not found`); return; }
        const action = this.playerAnims.clipAction(clip);
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        if (this.currentAction && this.currentAction !== action) {
            this.currentAction.fadeOut(fadeTime);
        }
        action.reset().fadeIn(fadeTime).play();
        this.currentAction = action;
        this.enableAttack();
        const onFinished = (e: any) => {
            if (e.action !== action) return;
            this.disableAttack();
            this.playerAnims!.removeEventListener('finished', onFinished);
            this.playAnimation('idle_breathe');
        };
        this.playerAnims.addEventListener('finished', onFinished);
    }

    // ── MAIN UPDATE ───────────────────────────────────────────────────────────

    update(delta: number) {
        // If dead, only update ragdoll debug meshes — nothing else
        if (this.isDead) {
            this._updateRagdoll();
            return;
        }

        if (this.playerAnims) this.playerAnims.update(delta);
        this._updateHitboxes();

        const w    = InputManager.isKeyDown("KeyW")  || InputManager.isKeyDown("ArrowUp");
        const s    = InputManager.isKeyDown("KeyS")  || InputManager.isKeyDown("ArrowDown");
        const a    = InputManager.isKeyDown("KeyA")  || InputManager.isKeyDown("ArrowLeft");
        const d    = InputManager.isKeyDown("KeyD")  || InputManager.isKeyDown("ArrowRight");
        const axis = VirtualJoystick.getAxis();

        let interract = InputManager.isKeyDown("KeyE");
        const attack  = InputManager.isKeyDown("KeyX");
        const space   = InputManager.isKeyDown("SPACE");
        const moving  = w || s || a || d || VirtualJoystick.isActive();

        // ── Ragdoll debug keys (remove before shipping) ───────────────────────
        const t = InputManager.isKeyDown("KeyT");
        const y = InputManager.isKeyDown("KeyY");

        if (moving && !this.isDriving) {
            this.playAnimation("walking");
            this.State()["STATE_WALKING"](w, s, a, d, axis);
        }

        if (moving && this.isDriving) return;

        if (interract && !this.isDriving) {
            interract = false;
            this.State()["ENTER_VEHICLE"]();
        }

        if (interract && this.isDriving) {
            this.State()["EXIT_VEHICLE"]();
            interract = false;
        }

        if (space) {
            // TODO: play jump animation + apply upward velocity
        }

        if (attack && !this.isDriving && !this.attackActive) {
            this.State()["ATTACK"]();
        }

        // T — instant death, ragdoll falls naturally from current pose
        if (t) {
            this.takeDamage(100); // works well
        }

        // Y — instant death with upward + forward impulse (e.g. hit by car)
        if (y) {
            this.hp     = 0; // does not work well
            this.isDead = false; // reset so _die() can fire
            this.enableRagdoll(new CANNON.Vec3(0, 8, -15));
        }

        if (!moving) return;

        this.syncGraphics();
    }

    // ── VEHICLE ───────────────────────────────────────────────────────────────

    linkVehicle(vehicle: Vehicle): void {
        this.vehicle = vehicle;
    }

    // ── GRAPHICS SYNC ────────────────────────────────────────────────────────

    syncGraphics() {
        if (!this.body || !this.mesh) return;

        if (!this.isDriving) {
            if (!this.mesh.visible) this.mesh.visible = true;
            this.mesh.position.set(
                this.body.position.x,
                this.body.position.y - 0.8,
                this.body.position.z
            );
            this.mesh.getWorldPosition(this.playerPos);
            window.camera.position.copy(this.playerPos.clone().add(this.cameraOffset));
            window.camera.lookAt(this.playerPos);
        }

        if (this.isDriving) {
            this.mesh.position.copy(this.vehicle?.carBody?.position!);
            if (this.mesh.visible) this.mesh.visible = false;
        }
    }

    // ── STATE MACHINE ─────────────────────────────────────────────────────────

    State(): Record<string, (...args: any[]) => void> {
        return {
            "STATE_BLOCKED": () => {},

            "STATE_WALKING": (w: boolean, s: boolean, a: boolean, d: boolean, axis = { x: 0, y: 0 }) => {
                if (!this.body || !this.mesh) return;
                const MOVE_SPEED = 80;
                const inputX = (d ? 1 : 0) - (a ? 1 : 0) || axis.x;
                const inputZ = (s ? 1 : 0) - (w ? 1 : 0) || axis.y;
                const input = new THREE.Vector3(inputX, 0, inputZ);
                if (input.lengthSq() === 0) return;
                input.normalize();
                const camForward = new THREE.Vector3();
                window.camera.getWorldDirection(camForward);
                camForward.y = 0;
                camForward.normalize();
                const camRight = new THREE.Vector3();
                camRight.crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();
                const moveDir = new THREE.Vector3()
                    .addScaledVector(camRight,    input.x)
                    .addScaledVector(camForward, -input.z);
                moveDir.normalize();
                this.body.velocity.set(moveDir.x * MOVE_SPEED, this.body.velocity.y, moveDir.z * MOVE_SPEED);
                this.body.wakeUp();
                this.mesh.rotation.y = Math.atan2(moveDir.x, moveDir.z);
            },

            "ENTER_VEHICLE": () => {
                if (!this.vehicle?.carBody || !this.body) return;
                this.isDriving     = true;
                this.mesh!.visible = false;
                this.body.position.set(0, -1000, 0);
                this.body.velocity.set(0, 0, 0);
                this.body.angularVelocity.set(0, 0, 0);
                this.body.type = CANNON.Body.STATIC;
                this.body.sleep();
                this.disableAttack();
                this.playAnimation("Sitting_Enter");
                this.vehicle.isDriving = true;
            },

            "EXIT_VEHICLE": () => {
                if (!this.vehicle?.carBody || !this.body || !this.mesh) return;
                this.isDriving         = false;
                this.vehicle.isDriving = false;
                this.mesh.visible      = true;
                this.vehicle.toggleGravity(true);
                this.body.collisionFilterGroup = 1;
                this.body.collisionFilterMask  = -1;
                this.body.type                 = CANNON.Body.DYNAMIC;
                const carPos     = this.vehicle.carBody.position;
                const exitOffset = new CANNON.Vec3(-6, 0.5, 0);
                this.body.position.set(carPos.x + exitOffset.x, carPos.y + exitOffset.y, carPos.z + exitOffset.z);
                this.body.velocity.set(0, 0, 0);
                this.body.wakeUp();
                this.playAnimation("Sitting_Exit");
            },

            "ATTACK": () => {
                this.playAttack("flying_kick");
            }
        };
    }
}