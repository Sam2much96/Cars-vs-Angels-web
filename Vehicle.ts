/**
 * All Vehicle Scripts and Variables
 * 
 * 
 */

// for 3d mesh and texture rendering
import * as THREE from 'three';
import * as CANNON from "cannon-es";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Vehicle {


    
    public carMesh: THREE.Object3D | null = null;
    public carBody: CANNON.Body | null = null;
    public vehicle : CANNON.RaycastVehicle | null = null

    public carOffset = new THREE.Vector3(0, -0.7, 0);
    public meshRotationOffset : THREE.Quaternion

    //driving controls
    public maxSteerVal = 0.5
    public maxForce = 2000
    public brakeForce = 1000000

    // flying controls
    public thrust = 100; // forward/back
    public lift = 5000;    // up/down
    public turn = 0.005;   // yaw


    constructor(){

        //
        //
        //
     


        // ------------------------------------------------------ 
        // Car offset config for the 3d mesh
        // ------------------------------------------------------
        const meshRotationOffset = new THREE.Quaternion();
        meshRotationOffset.setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0)); // rotate 90° around Y
        
        this.meshRotationOffset = meshRotationOffset;
        


        // ------------------------------------------------------
        // LOADERS
        // ------------------------------------------------------

        const loader = new GLTFLoader();

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
            window.scene.add(this.carMesh);
        
        
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
            window.world.addBody(chassisBody);
        
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
        
                vehicle.addToWorld(window.world)
        
        
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
                  window.world.addBody(wheelBody)
                })
        
                 // Update the wheel collision bodies
                window.world.addEventListener('postStep', () => {
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
}



export function syncGraphics() {
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
    if (!window.Vehicle.carMesh || !window.Vehicle.carBody || !window.Vehicle.vehicle) return; //guar clause

    // Sync chassis
    window.Vehicle.carMesh.position.copy(window.Vehicle.carBody.position).add(window.Vehicle?.carOffset); // sync car body with physics
    window.Vehicle.carMesh.quaternion.copy(window.Vehicle.carBody.quaternion).multiply(window.Vehicle.meshRotationOffset); //sync car rotation with colliision

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
    window.Vehicle.vehicle?.wheelInfos.forEach((wheel, i) => {
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


export function updatephysicsv3(){
    // simultate world and car physics
    if (!window.Vehicle.vehicle) return;
    if (!window.world) return;

    window.world.step(1/60);
        if (window.Vehicle.vehicle) {
        window.Vehicle.vehicle.updateVehicle(world.dt);
    }

}