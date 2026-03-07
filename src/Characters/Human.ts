import * as THREE from 'three';

import * as CANNON from 'cannon-es';
// input manaager
import { InputManager } from "../UI/Inputs/InputManager";
import { VirtualJoystick } from '../UI/Inputs/VirtualJoystick.tsx';

import { Vehicle } from "../Vehicle/Vehicle"; // adjust path as needed



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
 * (3) reuse this mesh as multiple NPC scenes
 * (4) test vehicle and human object collisions
 * (5) when entering vehicle the collision shhould be disabled
 * (6) when exiting vehicle, the mesh should be made visible
 * (7) write code for getting the player's current height and triggering the fall animation
 * (8) add jump and attack animations
 * 
 * bugs:
 * (1) gravity doesn't work on human object when exiting vehicle
 * (2) pressing e always teleports the player to the car position
 * (3) falling from high heights does'nt trigger the falling animation or the game's death logic
 * (4) player's gravity is floaty
 * (5)
 * 
 */
export class Human {
    mesh :  THREE.Object3D<THREE.Object3DEventMap>| null;
    body : CANNON.Body | null;
    world : CANNON.World;

    public playerAnims: THREE.AnimationMixer | null = null;
    clips: THREE.AnimationClip[] = [];
    currentAction: THREE.AnimationAction | null = null;

    // vehicle interractions    
    private vehicle: Vehicle | null = null; 
    private isDriving: boolean = false;
    

    public playerPos = new THREE.Vector3();
    // Third-person offset relative to player
    //    ↑X  ↑Y  ↑Z
    //    - Slightly above (2.5)
    //    - Slightly behind (6)
    public cameraOffset = new THREE.Vector3(2, 1.5, 2);// behind
                

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

        // connects to the virual button in the UI
        window.addEventListener("player-interact", () => {
            
            if (!this.isDriving){
                console.log("player interract triggered in Human");
                this.State()["ENTER_VEHICLE"]();
                return
            }
            if (this.isDriving){
                this.State()["EXIT_VEHICLE"]();
            }
            
        });

        //window.dispatchEvent(new CustomEvent("human-loaded"));
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
        body.position.set(10, 1, 0);

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


        let interract = InputManager.isKeyDown("KeyE");
        const space = InputManager.isKeyDown("SPACE")

        const axis = VirtualJoystick.getAxis();

        //let interract = e;
        let jump = space;

        const moving = w || s || a || d || VirtualJoystick.isActive();



        if (moving && !this.isDriving) {
            
            this.playAnimation("Run Anime");
            this.State()["STATE_WALKING"](w, s, a, d, axis);
        }

        if (moving && this.isDriving){
            //this.playAnimation("Sitting_Idle_loop");
            return
        }

        if (interract && !this.isDriving){

            console.log("try enter vehicle triggered");
            interract = false;
            this.State()["ENTER_VEHICLE"]();

        }

        if (interract && this.isDriving){
            console.log("try exit vehicle");
            this.State()["EXIT_VEHICLE"]();
            interract = false;
        }

        if(!moving) {
            this.playAnimation("Idle_Loop");
        }
        if (jump){
            console.log("jump action triggered");
            // logic
            // (1) play jump animation
            // (2) simulate jump on collision mesh
        }

        this.syncGraphics();
        
    }

    linkVehicle(vehicle: Vehicle): void {
        /**
         * 
         * links the current vehicle object to the class upon collision with it
         * 
         */
        console.log("linking vehicle");
        // adds a vehicle reference to this object
        this.vehicle = vehicle;
    }



  


     syncGraphics(){
            //apply cannon-es physics to mesh
            if (!this.body || !this.mesh  ) return

            // walking controls
            if (!this.isDriving){
                // toggle mesh visibility
                if (!this.mesh.visible) this.mesh.visible;

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
                
                this.mesh.getWorldPosition(this.playerPos);

                // top down
                //new THREE.Vector3(0, 3.4, -2); 


                // Apply camera position
                window.camera.position.copy(this.playerPos.clone().add(this.cameraOffset));

                // Look at the player
                window.camera.lookAt(this.playerPos);

            }

            // driving controls
            if (this.isDriving){

                // copy
                //this.body.position.copy(this.vehicle?.carBody?.position!)
                this.mesh.position.copy(this.vehicle?.carBody?.position!)
                
                if (this.mesh.visible) this.mesh.visible = false
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
            "STATE_WALKING" : (w: boolean, s: boolean, a: boolean, d: boolean, axis = { x: 0, y: 0 }) => {
                if (!this.body || !this.mesh) return;

                const MOVE_SPEED = 80; // world units per second — tune this

                // ── 1. Build a raw input vector (XZ plane) ──────────────────
                // Keyboard gives binary 1/0, joystick gives analog -1 to 1
                const inputX = (d ? 1 : 0) - (a ? 1 : 0) || axis.x;
                const inputZ = (s ? 1 : 0) - (w ? 1 : 0) || axis.y; // joystick Y up = move forward

                const input = new THREE.Vector3(inputX, 0, inputZ);
                if (input.lengthSq() === 0) return;
                input.normalize();
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

            "ENTER_VEHICLE" : () => {
                if (!this.vehicle?.carBody || !this.body) return;
                console.log(" Try enter vehicle :", this.vehicle);

                this.isDriving = true;

                // --------------------------------------------------
                // Disable human collision so the capsule can't push
                // the car chassis from the inside every physics step.
                // --------------------------------------------------
                // Teleport the body far away (simplest, most reliable method).
                // Cannon-ES collision groups can be unreliable when changed mid-simulation,
                // so moving the body out of range is the safest option.
                this.body.position.set(0, -1000, 0);   // park underground, out of physics range
                this.body.velocity.set(0, 0, 0);
                this.body.angularVelocity.set(0, 0, 0);
                this.body.type = CANNON.Body.STATIC;    // prevent gravity pulling it back up
                this.body.sleep();                      // stop it from being stepped entirely

                this.playAnimation("Sitting_Enter");

                this.vehicle.isDriving = true;
                
                // music player disabled for refactoring Mar 6 2026
                //window.music.play(); // ← plays once when player enters car

                console.log("Player entered vehicle");
            },
            "EXIT_VEHICLE" : () => {
                console.log("exit vehicle")
                if (!this.vehicle?.carBody || !this.body || !this.mesh) return;

                this.isDriving = false;
                this.vehicle.isDriving = false;
                this.mesh.visible = true;
                this.vehicle.toggleGravity(true);

                // --------------------------------------------------
                // Re-enable human collision
                // --------------------------------------------------
                // Restore collision groups so the player interacts with the world again
                this.body.collisionFilterGroup = 1;  // default group
                this.body.collisionFilterMask  = -1; // collide with everything

                // Re-enable human physics
                this.body.type = CANNON.Body.DYNAMIC;

                // Drop the player beside the car (offset on the left side)
                const carPos = this.vehicle.carBody.position;
                const exitOffset = new CANNON.Vec3(-6, 0.5, 0); // left-door position
                this.body.position.set(
                    carPos.x + exitOffset.x,
                    carPos.y + exitOffset.y,
                    carPos.z + exitOffset.z
                );
                this.body.velocity.set(0, 0, 0);

                // Wake body so gravity applies immediately
                this.body.wakeUp();

                this.playAnimation("Sitting_Exit");

                console.log("Player exited vehicle");
            }
        
        }}
}