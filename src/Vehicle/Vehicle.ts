/**
 * All Vehicle Scripts and Variables
 * 
 * Features
 * (1) Uses Cannones raycast vehicle physics to create and control a 3d car simulation
 * 
 * to do:
 * (1) better camera controls (1/3)
 * (2) restart game if car falls off map
 * (3) add mouse camera turns
 * (4) add vehicle entry and exit using player 3d mesh
 * (5) fix car tire physics
 * (6) car lift should be a power up item
 * (7) optimise vehile mesh textures from 500x500 to < 100x100 in the game's model, to reduce texture size from 1.8 mb to < 500 kb
 * (8) implement car idle state
 * (9) implement player interraction with car object
 * (10) implement music only playing once player interracts with car
 * 
 * bugs:
 * (1) 
 * (2) 
 * (3) 
 */

// for 3d mesh and texture rendering
import * as THREE from 'three';
import * as CANNON from "cannon-es";
//import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


//input 

// input manaager
import { InputManager } from "../UI/Inputs/InputManager";



export class Vehicle {


    
    public carMesh: THREE.Object3D | null = null;
    public carBody: CANNON.Body | null = null;
    public vehicle : CANNON.RaycastVehicle | null = null

    public carOffset = new THREE.Vector3(0, -0.7, 0);

    // Set the camera offset from the car
    public cameraOffset = new THREE.Vector3(0, 2.5, -7); // x=side, y=height, z=behind

    public meshRotationOffset : THREE.Quaternion

    //driving controls
    public maxSteerVal = 0.5
    public maxForce = 2000
    public brakeForce = 1000000

    // flying controls
    public thrust = 5000; // forward/back
    public lift = 5000;    // up/down
    public turn = 0.005;   // yaw

    //gravite
    public gravity : number;


    //car finite state machine
    //public STATE_MACHINE: Map<string, number> = new Map([
    //        ['DRIVING', 0],
    //        ['FLYING', 1],
    //        ['IDLE', 2],
    //        ['ENTER', 3],
    //        ['EXIT', 4],
    //        ['DESTROY', 5],
    //    ]);

    constructor(scene : THREE.Scene = window.scene , world: CANNON.World = window.world, loader = window.loader){

        //gravity
        this.gravity = world.gravity.y | -10;

        // ------------------------------------------------------ 
        // Car offset config for the 3d mesh
        // ------------------------------------------------------
        const meshRotationOffset = new THREE.Quaternion();
        meshRotationOffset.setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0)); // rotate 90° around Y
        
        this.meshRotationOffset = meshRotationOffset;
        

        //input 

        //const canvas = document.getElementById("gameCanvas") as HTMLElement;

        InputManager.initialize(); //canvas


        /**
         * DODGE CHARGER MODEL
         * 
         * Features:
         * (1) player
         * (2) load the dodge charger model
         * 
         * To Do:
         * (1) implement player controls
         * 
         * bugs:
         * (1) collision shape does not fit car model properly
         * (2) tire rotation from collision vehicle is not transferred (1/3)
         */
        
        
        
        // ------------------------------------------------------
        // (2) LOAD DODGE CHARGER MODEL
        // ------------------------------------------------------
        
        loader.load('./Dodge_Charger.glb', (gltf) => {
            this.carMesh = gltf.scene;
            
            this.carMesh.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    console.log("Mesh found:", child.name);
                    console.log("Material debug: ",child.material.map); // should NOT be null
                } 
            });
        
        
            
            // Center and scale the model
            this.carMesh.scale.set(1, 1, 1);
            this.carMesh.position.set(0, 5, 0);

            
            scene.add(this.carMesh);
        
        
            // --------------------------------------------------
            // CREATE PHYSICS BODY FOR CAR (RAYCAST VEHICLE)
            // --------------------------------------------------
        
            // 1. Create chassis body
            const chassisShape = new CANNON.Box(new CANNON.Vec3(3.9, 0.3, 1.6)); // half-extents
            const chassisBody = new CANNON.Body({ 
                mass: 2500, 
                position: new CANNON.Vec3(0, 2, 0), // set car collision above the citymap terrain
                angularVelocity: new CANNON.Vec3(0,0.5,0),
                angularDamping: 0.5,
                linearDamping: 0.01
            });
        
        
        
            chassisBody.addShape(chassisShape);
            world.addBody(chassisBody);
        
            // 2. Create Raycast Vehicle
            const vehicle = new CANNON.RaycastVehicle({
                chassisBody: chassisBody,
                indexUpAxis: 1,   // y-axis is up
                indexRightAxis: 2, // x is right
                indexForwardAxis: 0 // z is forward
            });
        
            // 3. Add wheels
               const wheelOptions = {
                  radius: 0.6,
                  directionLocal: new CANNON.Vec3(0, -1, 0),
                  suspensionStiffness: 30,
                  suspensionRestLength: 0.3,
                  frictionSlip: 1,
                  dampingRelaxation: 2.3,
                  dampingCompression: 4.4,
                  maxSuspensionForce: 100000,
                  rollInfluence: 0.01,
                  axleLocal: new CANNON.Vec3(0, 0, 1),
                  chassisConnectionPointLocal: new CANNON.Vec3(-1, 0, 1),
                  maxSuspensionTravel: 0.3,
                  customSlidingRotationalSpeed: -30,
                  useCustomSlidingRotationalSpeed: true,
                }
                
        
                // set the wheel connection points
                wheelOptions.chassisConnectionPointLocal.set(-1.8, 0, 1.8)
                vehicle.addWheel(wheelOptions)
        
                wheelOptions.chassisConnectionPointLocal.set(-1.8, 0, -1.8)
                vehicle.addWheel(wheelOptions)
        
                wheelOptions.chassisConnectionPointLocal.set(1.8, 0, 1.8)
                vehicle.addWheel(wheelOptions)
        
                wheelOptions.chassisConnectionPointLocal.set(1.8, 0, -1.8)
                vehicle.addWheel(wheelOptions)
        
                vehicle.addToWorld(world)
        
        
               // Add the wheel bodies
                const wheelBodies: any[] = []
                const wheelMaterial = new CANNON.Material('wheel')
                vehicle.wheelInfos.forEach((wheel) => {
                  const cylinderShape = new CANNON.Cylinder(wheel.radius, wheel.radius, wheel.radius / 2, 20)
                  const wheelBody = new CANNON.Body({
                    mass: 0,
                    material: wheelMaterial,
                  })
                  wheelBody.type = CANNON.Body.KINEMATIC
                  wheelBody.collisionFilterGroup = 0 // turn off collisions
        
                  // set wheel collision rotation
                  const quaternion = new CANNON.Quaternion().setFromEuler(Math.PI / 2, 0, 0) // -Math.PI / 2, 0, 0)
                 
                  wheelBody.addShape(cylinderShape, new CANNON.Vec3(), quaternion)
        
                  wheelBodies.push(wheelBody)
                  //demo.addVisual(wheelBody)
                  world.addBody(wheelBody)
                })
        
                 // Update the wheel collision bodies
                world.addEventListener('postStep', () => {
                  for (let i = 0; i < vehicle.wheelInfos.length; i++) {
                    vehicle.updateWheelTransform(i)
                    const transform = vehicle.wheelInfos[i].worldTransform
                    const wheelBody = wheelBodies[i]
                    wheelBody.position.copy(transform.position)
                    wheelBody.quaternion.copy(transform.quaternion)
                  }
                })
        
        
                 
        
        
            // 5. IMPORTANT: Use the same chassisBody for both vehicle and graphics
            this.carBody = chassisBody; // Now carBody references the same body used by the vehicle
            
            // Save to global so controls can access it
            this.vehicle = vehicle;
        
            console.log("Dodge Charger loaded with raycast vehicle physics!");
            console.log("Dodge Charger loaded with raycast vehicle physics!");
            console.log("Vehicle object:", vehicle);
            console.log("Chassis body:", chassisBody);
            console.log("Number of wheels:", vehicle.wheelInfos.length);
        }, undefined, (err) => {
            console.error('CAR LOAD ERROR:', err);
        });
        
    }


    physicsUpdate(): void {
    {
    /**
     * 
     * Features:
     * (1) syncs the car mesh with the Collision physics forces
     * 
     * bugs:
     * 
     * (1) buggy wheel rotation
     * (2) buggy camera positioning
     */
    if (!this.carMesh || !this.carBody || !this.vehicle) return; //guar clause


                    // second despawn logic for falling off 3d map
                //
                // to do: port this respawn code to the Vehicle object
                //if (this.playerBody.position.y < -20){
                //    this.despawn();
                //    this.State()["STATE_DEATH"]();
                //    return;
                //}




    // trigger raycast phyiics update
    this.vehicle.updateVehicle(window.world.dt);

    // update driving gamera 
    this.updateDrivingCamera(window.camera);

    // Sync chassis
    this.carMesh.position.copy(this.carBody.position).add(window.Vehicle?.carOffset); // sync car body with physics
    this.carMesh.quaternion.copy(this.carBody.quaternion).multiply(this.meshRotationOffset); //sync car rotation with colliision

    // Get wheel meshes in correct order: FL, FR, BL, BR
    const wheelMeshes = [
        window.Vehicle.carMesh?.getObjectByName("Círculo004"), // FL
        window.Vehicle.carMesh?.getObjectByName("Círculo005"), // FR
        window.Vehicle.carMesh?.getObjectByName("Círculo006"), // BL
        window.Vehicle.carMesh?.getObjectByName("Círculo007"), // BR
    ];

    // Per-wheel axis correction quaternions
    // Adjust X/Y/Z based on Blender export
    const leftWheelCorrection = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(-Math.PI / 2, Math.PI / 2, 0)
    );
    const rightWheelCorrection = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(-Math.PI / 2, Math.PI, 0) // mirror for right side
    );

    // Sync each wheel
    this.vehicle?.wheelInfos.forEach((wheel, i) => {
        const mesh = wheelMeshes[i];
        if (!mesh) return;

        // Update wheel physics transform
        window.Vehicle.vehicle?.updateWheelTransform(i);
        const wt = wheel.worldTransform;

        // Copy position
        //mesh.position.copy(wt.position);

        // Copy rotation safely
        const q = new THREE.Quaternion(
            wt.quaternion.x,
            wt.quaternion.y,
            wt.quaternion.z,
            wt.quaternion.w
        );

        // Apply per-wheel correction
        if (i === 0 || i === 2) {
            // FL / BL
            q.multiply(leftWheelCorrection);
        } else {
            // FR / BR
            q.multiply(rightWheelCorrection);
        }

        mesh.quaternion.copy(q);
    });
    }



    // input logic
    // to do : 
    // (1) implement driving state and flying state (done)
    if (InputManager.isKeyDown("KeyW") || InputManager.isKeyDown("ArrowUp")) {
        if (this.isGravity()){
            this.State()["ACCELERATE"]();
        }
        if (!this.isGravity()){
            this.State()["THRUST"]();
        }

    }
    if (InputManager.isKeyDown("KeyS") || InputManager.isKeyDown("ArrowDown")) {
        if (this.isGravity()){
             this.State()["REVERSE"]();
        }
        if (!this.isGravity()){

             this.State()["YEW_UP"]();
        }
        
       
    }
    if (InputManager.isKeyDown("KeyA") || InputManager.isKeyDown("ArrowLeft")) {
        if (this.isGravity()){
            this.State()["STEER_LEFT"]();
        }
        if (!this.isGravity()){
            this.State()["YEW_LEFT"]();
        }
        
    }
    if (InputManager.isKeyDown("KeyD") || InputManager.isKeyDown("ArrowRight")) {
        if (this.isGravity()){
            this.State()["STEER_RIGHT"]();
        }
        if (!this.isGravity()){
            this.State()["YEW_RIGHT"]();
        }
        
    }
    if (InputManager.isKeyDown("Space")) {
        this.State()["BRAKE"]();
    }
    if (InputManager.isKeyDown("KeyP")) {
        //toggle gravity on and off
        this.toggleGravity(false)

        if (!this.isGravity()){
            this.State()["LIFT"]();
        }
        
    }
    if (InputManager.isKeyDown("KeyO")) {
        this.toggleGravity(true);
    }



    // to do:
    // (1) port camera/ mouse controls to camera tracking function
    //const mouseDX = InputManager.getMouseDeltaX();
    //const mouseDY = InputManager.getMouseDeltaY();

    //window.camera.rotation.y -= mouseDX * 0.002;
    //window.camera.rotation.x -= mouseDY * 0.002;

    // Reset Input Manager's state
    InputManager.update();


}




    updateDrivingCamera(camera : THREE.PerspectiveCamera): void{

    /**
     * Update Camera Function
     * 
     * bugs:
     * (1) camera does not look at back of car
     * (2) camera positioning is buggy
     * 
     */
    if (!this.carBody) return;
    if (!camera) return;

    // Desired camera position = car position + offset
    let desiredPosition = new THREE.Vector3().copy(this.carBody.position).add(this.cameraOffset);

    // Smooth camera movement
    camera.position.lerp(desiredPosition, 0.1);

    // Make camera look slightly ahead of the car for better visibility
    let lookAtTarget = new THREE.Vector3().copy(this.carBody.position);
    
    //lookAtTarget.z -= 5; // Look ahead in the direction the car is facing
    camera.lookAt(lookAtTarget);
    }

    toggleGravity(params : boolean){
        if (!params){
            this.gravity = 0;
            //window.world.gravity.set(0, 0, 0);
        }
        else if (params){
            this.gravity = -10
            //window.world.gravity.set(0, -10, 0);
        }
        window.world.gravity.set(0, this.gravity, 0);
    }

    isGravity(): boolean{
        if (this.gravity === 0){
            return false;
        }
        if (this.gravity !== 0){
            return true
        }
        else { return false}
    }

    State(): Record<string, () => void>  {
    /**
     * Car vehicle Finine State Machine
     * @returns 
     * car state
     */

        return {
            "ACCELERATE" : () => {

                // diriving forward
                this.vehicle!.applyEngineForce(-this.maxForce, 2)
                this.vehicle!.applyEngineForce(-this.maxForce, 3)
                

            },
            "REVERSE":() =>{
                this.vehicle?.applyEngineForce(this.maxForce, 2)
                this.vehicle?.applyEngineForce(this.maxForce, 3)
            },
            "STEER_LEFT":() =>{
                this.vehicle?.setSteeringValue(this.maxSteerVal, 0)
                this.vehicle?.setSteeringValue(this.maxSteerVal, 1)
            },
            "STEER_RIGHT":() =>{

                this.vehicle?.setSteeringValue(-this.maxSteerVal, 0)
                this.vehicle?.setSteeringValue(-this.maxSteerVal, 1)
            },
            "BRAKE":() =>{
                this.vehicle?.setBrake(this.brakeForce, 0)
               this.vehicle?.setBrake(this.brakeForce, 1)
               this.vehicle?.setBrake(this.brakeForce, 2)
               this.vehicle?.setBrake(this.brakeForce, 3)
            },
            "LIFT":() =>{

                this.carBody?.applyLocalForce(new CANNON.Vec3(0, this.lift, 0), new CANNON.Vec3(0, 0, 0));
                //return
            },

            "THRUST" : () => {

                this.carBody!.applyLocalForce(new CANNON.Vec3(-this.thrust, 0, 0), new CANNON.Vec3(0, 0, 0));
            },
            "YEW_LEFT" :() =>{
                // flight controls steer left
                this.carBody!.angularVelocity.y += this.turn;
            },
            "YEW_RIGHT" :() => {
                // flight controls steer right
                this.carBody!.angularVelocity.y -= this.turn;
            },
            "YEW_UP" :() => {
                // flight controls steer right
                this.carBody!.angularVelocity.z -= this.turn;
            },
            "DESTROY" :() => {},
            "RESPAWN" :()=> {}
        
        }
    }
}





