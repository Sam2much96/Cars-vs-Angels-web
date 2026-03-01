import * as THREE from 'three';

import * as CANNON from 'cannon-es';
// input manaager
import { InputManager } from "../UI/Inputs/InputManager";

/**
 * 
 * 
 * Player Character
 * 
 * requires:
 * (1) 3d maniquin model
 * (2) car entry and exit
 * (3) better camera controller
 * 
 * features:
 * (1) a 3d player viewed from top down view controlled by the player
 * (2) can interract with vehicle object
 * (3) can roam around the world
 * (4) can trigger different animations and collide with terrain objects
 * (5) can interract with player's Inventory system
 * 
 * to do :
 * (1) write a simple state machine (done)
 * (2) add object interractivity with vehicle body
 * 
 * 
 */
export class Human {
    mesh :  THREE.Object3D<THREE.Object3DEventMap>| null;
    body : CANNON.Body | null;
    world : CANNON.World;

    public playerAnims: THREE.AnimationMixer | null = null;
    clips: THREE.AnimationClip[] = [];
    currentAction: THREE.AnimationAction | null = null;
    
    constructor(loader = window.loader, scene = window.scene, world = window.world) {

        this.mesh = null;
        this.body = null;
        this.world = world;

        InputManager.initialize(); //canvas

        loader.load('./man_maniquin.glb', (gltf) => {
            // Temporarily log them after loading
            console.log(gltf.animations.map(a => a.name));



            const man = gltf.scene;
            
            // Traverse all child meshes and enable shadows
            man.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            scene.add(man);
            this.mesh = man;


            // Create the mixer on the loaded model
            this.playerAnims = new THREE.AnimationMixer(man);

            // Store clips by name for easy access
            this.clips = gltf.animations; // THREE.AnimationClip[]

            this.body = this._createCapsuleBody();
            world.addBody(this.body);

        }, undefined, (err) => {
            console.error('CITY LOAD ERROR:', err);
        });
    }

    /**
     * Builds a capsule from 1 cylinder + 2 spheres.
     * Tweak radius and height to match your mannequin model.
     * 
     *   ●  <- top sphere    (offset +halfHeight)
     *   |
     *   |  <- cylinder
     *   |
     *   ●  <- bottom sphere (offset -halfHeight)
     */
    _createCapsuleBody() : CANNON.Body {
        const radius    = 0.3;   // width of the capsule  — adjust to model
        const height    = 1.2;   // height of the cylinder segment only
        const halfHeight = height / 2;

        const body = new CANNON.Body({
            mass: 70,
            linearDamping:  0.9,  // stops sliding
            angularDamping: 1.0,  // stops tipping/rotating
            fixedRotation:  true  // player stays upright at all times
        });

        // Central cylinder
        body.addShape(
            new CANNON.Cylinder(radius, radius, height, 8),
            new CANNON.Vec3(0, 0, 0)
        );

        // Top sphere cap
        body.addShape(
            new CANNON.Sphere(radius),
            new CANNON.Vec3(0, halfHeight, 0)
        );

        // Bottom sphere cap
        body.addShape(
            new CANNON.Sphere(radius),
            new CANNON.Vec3(0, -halfHeight, 0)
        );

        // Spawn position
        body.position.set(0, 1, 0);

        return body;
    }

  playAnimation(name: string, fadeTime: number = 0.2) {
    if (!this.playerAnims) return;

    const clip = THREE.AnimationClip.findByName(this.clips, name);
    if (!clip) { console.warn(`Animation "${name}" not found`); return; }

    const nextAction = this.playerAnims.clipAction(clip);

    // ✅ Don't restart if already playing this animation
    if (this.currentAction === nextAction && this.currentAction.isRunning()) return;

    if (this.currentAction && this.currentAction !== nextAction) {
        this.currentAction.fadeOut(fadeTime);
    }

    nextAction.reset().fadeIn(fadeTime).play();
    this.currentAction = nextAction;
}

    /**
     * Call every frame in your animation loop AFTER world.step().
     * Syncs the visual mesh to the physics body.
     * 
     * Example:
     *   human.update()
     */
    update(delta: number) {
        // delta = seconds since last frame, from your animation loop
        if (this.playerAnims) {this.playerAnims.update(delta)};

        const w = InputManager.isKeyDown("KeyW") || InputManager.isKeyDown("ArrowUp");
        const s = InputManager.isKeyDown("KeyS") || InputManager.isKeyDown("ArrowDown");
        const a = InputManager.isKeyDown("KeyA") || InputManager.isKeyDown("ArrowLeft");
        const d = InputManager.isKeyDown("KeyD") || InputManager.isKeyDown("ArrowRight");

        const moving = w || s || a || d;

        if (moving) {
            this.playAnimation("Run Anime");
            this.State()["STATE_WALKING"](w, s, a, d);
        }
        else {
            this.playAnimation("Idle_Loop");
        }

        this.syncGraphics();
    }



     syncGraphics(){
            //apply cannon-es physics to mesh
            if (this.body && this.mesh){

                // apply physics mesh to player
                this.mesh.position.set(
                    this.body.position.x,
                    this.body.position.y - 0.8,
                    this.body.position.z
                    
                );
                

                // camera tracking
                // -----------------------------------------
                // THIRD-PERSON CAMERA SETUP
                // ----------------------------------
                        
                // Get world position of the player
                const playerPos = new THREE.Vector3();
                this.mesh.getWorldPosition(playerPos);

                // Third-person offset relative to player
                //    ↑X  ↑Y  ↑Z
                //    - Slightly above (2.5)
                //    - Slightly behind (6)
                const cameraOffset = new THREE.Vector3(2, 1.5, 2);// behind
                
                // top down
                //new THREE.Vector3(0, 3.4, -2); 


                // Apply camera position
                window.camera.position.copy(playerPos.clone().add(cameraOffset));

                // Look at the player
                window.camera.lookAt(playerPos);

            }
    }



    /**
     * Top Down Player State Machine
     * 
     * @returns 
     * 
     */
    State(): Record<string, (...args: any[]) => void>  {

        return {
            "STATE_BLOCKED" : () => {

            },

            /**
             * STATE_WALKING
             * 
             * Reads WASD / Arrow key booleans and pushes the capsule body
             * in the correct world-space direction.
             * 
             * Movement is camera-relative:
             *   W / ↑  → forward  (along camera's -Z projected onto XZ plane)
             *   S / ↓  → backward
             *   A / ←  → strafe left
             *   D / →  → strafe right
             * 
             * Force is applied via applyLocalForce so linearDamping (0.9)
             * handles deceleration automatically — no manual drag needed.
             */
            "STATE_WALKING" : (w: boolean, s: boolean, a: boolean, d: boolean) => {
                if (!this.body || !this.mesh) return;

                const MOVE_SPEED = 80; // world units per second — tune this

                // ── 1. Build a raw input vector (XZ plane) ──────────────────
                const input = new THREE.Vector3(
                    (d ? 1 : 0) - (a ? 1 : 0),   // strafe  (+X right, -X left)
                    0,
                    (s ? 1 : 0) - (w ? 1 : 0)    // forward (-Z forward in Three.js)
                );

                if (input.lengthSq() === 0) return;

                input.normalize(); // diagonal movement isn't faster

                // ── 2. Make movement camera-relative ────────────────────────
                const camForward = new THREE.Vector3();
                window.camera.getWorldDirection(camForward);
                camForward.y = 0;
                camForward.normalize();

                const camRight = new THREE.Vector3();
                camRight.crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

                // Final world-space move direction
                const moveDir = new THREE.Vector3()
                    .addScaledVector(camRight,    input.x)
                    .addScaledVector(camForward, -input.z); // negate Z: Three.js -Z = forward

                moveDir.normalize();

                // ── 3. Set velocity directly — bypasses damping drag ─────────
                // Preserve Y so gravity / jumping still works
                this.body.velocity.set(
                    moveDir.x * MOVE_SPEED,
                    this.body.velocity.y,   // keep gravity / jump velocity
                    moveDir.z * MOVE_SPEED
                );

                // Wake the body in case it went to sleep
                this.body.wakeUp();

                // ── 4. Rotate mesh to face movement direction ────────────────
                const targetAngle = Math.atan2(moveDir.x, moveDir.z);
                this.mesh.rotation.y = targetAngle;

                
            },
        
        }}
}