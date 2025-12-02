/**
 * Main game logic 
 * 
 * to do: 
 * (1) import city map model (2/3)
 * (2) import 3d car model (2/3)
 * (3) implement cannon-es vehicle physics for the car (2/3)
 * (4) implement static physics for the world environment and buildings (1/3)
 * (5) add music and sfx (1/2)
 * (6) simplify vehicle collision into single class object with exported vehicle variables (1/2)
 * 
 * bugs:
 * (1) game 3d models load very slow in browser
 * (2) load time is longer than ususal
 *
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // to do ; (1) update tsConfig to use javascript files
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
//import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

import * as CANNON from "cannon-es";
import CannonDebugger from 'cannon-es-debugger';

// Import Howl class for music and sfx
import { Howl } from 'howler';


// ------------------------------------------------------
// GLOBALS
// ------------------------------------------------------

declare global {
    interface Window {
        vehicle: CANNON.RaycastVehicle,}
}

// ------------------------------------------------------
// UI
// ------------------------------------------------------
const clockElement = document.getElementById('clock');

function updateClock() {
  if (!clockElement) return;

  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');

  clockElement.textContent = `${hours}:${minutes}:${seconds}`;
}
// Update every second
setInterval(updateClock, 1000);

// Initialize immediately
updateClock();

// ------------------------------------------------------
// MUSIC & SFX
// -----------------------------------------------------
// Example: Play background music
const music = new Howl({
  src: ['./beaach sex chike san.ogg'],
  loop: true,
  volume: 0.5,
});


music.play();




// Play a sound effect
// bugs sfx file
//const carSfx = new Howl({
//  src: ['./car-acceleration-inside-car.ogg'],
//  volume: 0.5,
//});

// ---- ADD TAB VISIBILITY HANDLER ----
        // this turns the music off if the browser tab
        // is no longer visible
        // works
        document.addEventListener("visibilitychange", async () => {
            if (document.hidden){
                if (music.playing()){
                    music.pause()
                }
            }
            else{
                music.play()
            }
        });


// ------------------------------------------------------
// SCENE, CAMERA, RENDERER
// ------------------------------------------------------

const scene = new THREE.Scene();
//scene.background = new THREE.Color(0x222222);

 
// Set the camera offset from the car
const cameraOffset = new THREE.Vector3(0, 5, -10); // x=side, y=height, z=behind
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 10);

const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    logarithmicDepthBuffer: true 
});

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);




// ------------------------------------------------------ 
// HDR
// ------------------------------------------------------

const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();

const HDRloader = new HDRLoader();
const envMap = await HDRloader.loadAsync("/autumn_field_puresky_1k.hdr");
envMap.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = envMap; // reflections
scene.background = envMap; //skybox 

console.log("HDR environment loaded (HDRLoader)!");




// ------------------------------------------------------
// PHYSICS WORLD
// ------------------------------------------------------

const world = new CANNON.World();

 world.gravity.set(0, -10, 0)

// Sweep and prune broadphase
world.broadphase = new CANNON.SAPBroadphase(world)

// Disable friction by default
world.defaultContactMaterial.friction = 0

const cannonDebugger = CannonDebugger(scene, world);


// ------------------------------------------------------
// Floor
//------------------------------------------------------

//const floorGeometry = new THREE.PlaneGeometry(1000, 1000);

//const floorGeometry = new THREE.PlaneGeometry(5000, 5000); // huge floor
//const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, side: THREE.DoubleSide });
//const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);

//floorMesh.rotation.x = -Math.PI / 2; // horizontal
//floorMesh.receiveShadow = true;
//scene.add(floorMesh);


// Create a static ground plane collision
//const groundShape = new CANNON.Plane();
//const groundBody = new CANNON.Body({
//    mass: 0, // mass 0 = static object
//    shape: groundShape,
//    position: new CANNON.Vec3(0, 0, 0), // y=0
//});

// Rotate the plane to be horizontal
//groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

//world.addBody(groundBody)


// ------------------------------------------------------
// LOADERS
// ------------------------------------------------------

const loader = new GLTFLoader();

let carMesh: THREE.Object3D | null = null;
let carBody: CANNON.Body | null = null;


// ------------------------------------------------------
// (1) LOAD CITY MAP (STATIC ENVIRONMENT)
// ------------------------------------------------------

// bug:
// (1) city map level needs optimisation to fix occlusiion culling
// (2) remove all materials from level object and fix positioning

loader.load('./citymap.glb', (gltf) => {
    const city = gltf.scene;
    city.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            obj.frustumCulled = false;
            obj.geometry.computeBoundingBox();
            obj.geometry.computeBoundingSphere();

            //console.log("Mesh found:", obj.name);

             //Add static world physics to the map terrain
            if (obj.name === "Terrain001"){
                // create terrain static body
                createStaticBodyFromMesh(obj);

                 // Set brown terrain material
                obj.material = new THREE.MeshStandardMaterial({
                    color: 0x7A7A7A,   // Concrete grey
                    roughness: 0.9,
                    metalness: 0.0
                });

                // Optional: keep textures if terrain already has UVs
                obj.material.needsUpdate = true;
                

            }
        }
    });

    scene.add(city);

   

}, undefined, (err) => {
    console.error('CITY LOAD ERROR:', err);
});

// ------------------------------------------------------
// (2) LOAD DODGE CHARGER MODEL
// ------------------------------------------------------

/**
 * DODGE CHARGER MODEL
 * 
 * Features:
 * (1) player
 * (2)
 * 
 * To Do:
 * (1) implement player controls
 * 
 * bugs:
 * (1) collision shape does not fit car model properly
 */



// ------------------------------------------------------
// (2) LOAD DODGE CHARGER MODEL
// ------------------------------------------------------

loader.load('./Dodge_Charger.glb', (gltf) => {
    carMesh = gltf.scene;
    
    carMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            console.log("Mesh found:", child.name);
        }
    });


    
    // Center and scale the model
    carMesh.scale.set(1, 1, 1);
    carMesh.position.set(0, 2, 0);
    scene.add(carMesh);

    // --------------------------------------------------
    // CREATE PHYSICS BODY FOR CAR (RAYCAST VEHICLE)
    // --------------------------------------------------

    // 1. Create chassis body
    const chassisShape = new CANNON.Box(new CANNON.Vec3(3.9, 0.3, 1.6)); // half-extents
    const chassisBody = new CANNON.Body({ 
        mass: 1500, 
        position: new CANNON.Vec3(0, 15, 0), // set car collision above the citymap terrain
        angularVelocity: new CANNON.Vec3(0,0.5,0),
        angularDamping: 0.5,
        linearDamping: 0.01
    });

    chassisBody.quaternion.setFromEuler(0, Math.PI / 2, 0);


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
          const quaternion = new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0)
         
          wheelBody.addShape(cylinderShape, new CANNON.Vec3(), quaternion)
          wheelBodies.push(wheelBody)
          //demo.addVisual(wheelBody)
          world.addBody(wheelBody)
        })

         // Update the wheel bodies
        world.addEventListener('postStep', () => {
          for (let i = 0; i < vehicle.wheelInfos.length; i++) {
            vehicle.updateWheelTransform(i)
            const transform = vehicle.wheelInfos[i].worldTransform
            const wheelBody = wheelBodies[i]
            wheelBody.position.copy(transform.position)
            wheelBody.quaternion.copy(transform.quaternion)
          }
        })


         // Add the ground
         // depreciated for citymap terrain
        //const sizeX = 64
        //const sizeZ = 64
        //const matrix : any[] = []
        //for (let i = 0; i < sizeX; i++) {
        //  matrix.push([])
        //  for (let j = 0; j < sizeZ; j++) {
        //    if (i === 0 || i === sizeX - 1 || j === 0 || j === sizeZ - 1) {
        //      const height = 3
        //      matrix[i].push(height)
        //      continue
        //    }

        //    const height = Math.cos((i / sizeX) * Math.PI * 5) * Math.cos((j / sizeZ) * Math.PI * 5) * 2 + 2
        //    matrix[i].push(height)
        //  }
        //}

        //const groundMaterial = new CANNON.Material('ground')
        //const heightfieldShape = new CANNON.Heightfield(matrix, {
        //  elementSize: 100 / sizeX,
        //})
        //const heightfieldBody = new CANNON.Body({ mass: 0, material: groundMaterial })
        //heightfieldBody.addShape(heightfieldShape)
        //heightfieldBody.position.set(
          // -((sizeX - 1) * heightfieldShape.elementSize) / 2,
         // -(sizeX * heightfieldShape.elementSize) / 2,
         // -1,
          // ((sizeZ - 1) * heightfieldShape.elementSize) / 2
         // (sizeZ * heightfieldShape.elementSize) / 2
        //)
        //heightfieldBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
        //world.addBody(heightfieldBody)
        //demo.addVisual(heightfieldBody)

        // Define interactions between wheels and ground
        //const wheel_ground = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
        //  friction: 0.3,
        //  restitution: 0,
        //  contactEquationStiffness: 1000,
        //})
        //world.addContactMaterial(wheel_ground)



    // 5. IMPORTANT: Use the same chassisBody for both vehicle and graphics
    carBody = chassisBody; // Now carBody references the same body used by the vehicle
    
    // Save to global so controls can access it
    window.vehicle = vehicle;

    console.log("Dodge Charger loaded with raycast vehicle physics!");
      console.log("Dodge Charger loaded with raycast vehicle physics!");
    console.log("Vehicle object:", vehicle);
    console.log("Chassis body:", chassisBody);
    console.log("Number of wheels:", vehicle.wheelInfos.length);
}, undefined, (err) => {
    console.error('CAR LOAD ERROR:', err);
});





// ------------------------------------------------------
// SIMPLE CONTROLS (forward/back/left/right)
// ------------------------------------------------------

const keys: Record<string, boolean> = {};

window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

// ------------------------------------------------------
// GAME LOOP
// ------------------------------------------------------

function updatePhysicsv1() {
    if (!window.vehicle) return;

    const engineForce = 80000;
    const brakeForce = 50;
    //const steerAngle = 0.5;
    const maxSteer = 0.5;

    // Reset forces each frame
    //for (let i = 0; i < 4; i++) {
    //    window.vehicle.setSteeringValue(0, i);
    //    window.vehicle.setBrake(0, i);
    //    window.vehicle.applyEngineForce(0, i);
    
    //}

        // ACCELERATION (rear-wheel drive)
    if (keys["KeyW"]) {
        //console.log("Accelerating: ");
        window.vehicle.applyEngineForce(-engineForce, 0); // forward left
        window.vehicle.applyEngineForce(-engineForce, 1); // forward right
    }

    // REVERSE
    if (keys["KeyS"]) {
        console.log("Reversing");
        window.vehicle.applyEngineForce(engineForce / 2, 2);
        window.vehicle.applyEngineForce(engineForce / 2, 3);
    }

     // BRAKE
    if (keys["Space"]) {
        console.log("Braking");
        for (let i = 0; i < 4; i++) {
            window.vehicle.setBrake(brakeForce, i);
        }
    }

     // STEERING (front wheels only)
    let steering = 0;
    if (keys["KeyA"]) {
        steering = maxSteer;
    } else if (keys["KeyD"]) {
        steering = -maxSteer;
    }
    
    if (steering !== 0) {
        console.log("Steering:", steering);
        window.vehicle.setSteeringValue(steering, 0); // Front left
        window.vehicle.setSteeringValue(steering, 1); // Front right
    }

    world.step(1/60);

     // Important: Update the vehicle after physics step
    if (window.vehicle) {
        window.vehicle.updateVehicle(world.dt);
    }
}
function updatephysicsv3(){
    // simultate world and car physics

    world.step(1/60);
        if (window.vehicle) {
        window.vehicle.updateVehicle(world.dt);
    }

}

function input(){
    // capture input
    if (!window.vehicle) return;

    
    // Keybindings
        // Add force on keydown
        document.addEventListener('keydown', (event) => {
          const maxSteerVal = 0.5
          const maxForce = 1000
          const brakeForce = 1000000
          //carSfx.play(); // play sfx

          switch (event.key) {
            case 'w':
            case 'ArrowUp':
              window.vehicle.applyEngineForce(-maxForce, 2)
               window.vehicle.applyEngineForce(-maxForce, 3)
               
              break

            case 's':
            case 'ArrowDown':
               window.vehicle.applyEngineForce(maxForce, 2)
               window.vehicle.applyEngineForce(maxForce, 3)
              break

            case 'a':
            case 'ArrowLeft':
               window.vehicle.setSteeringValue(maxSteerVal, 0)
               window.vehicle.setSteeringValue(maxSteerVal, 1)
              break

            case 'd':
            case 'ArrowRight':
               window.vehicle.setSteeringValue(-maxSteerVal, 0)
               window.vehicle.setSteeringValue(-maxSteerVal, 1)
              break

            case 'b':
               window.vehicle.setBrake(brakeForce, 0)
               window.vehicle.setBrake(brakeForce, 1)
               window.vehicle.setBrake(brakeForce, 2)
               window.vehicle.setBrake(brakeForce, 3)
              break
          }
        })

         // Reset force on keyup
        document.addEventListener('keyup', (event) => {
        //carSfx.pause(); // pause sfx
          switch (event.key) {
            case 'w':
            case 'ArrowUp':
              window.vehicle.applyEngineForce(0, 2)
              window.vehicle.applyEngineForce(0, 3)
              
              break

            case 's':
            case 'ArrowDown':
              window.vehicle.applyEngineForce(0, 2)
              window.vehicle.applyEngineForce(0, 3)
              break

            case 'a':
            case 'ArrowLeft':
              window.vehicle.setSteeringValue(0, 0)
              window.vehicle.setSteeringValue(0, 1)
              break

            case 'd':
            case 'ArrowRight':
              window.vehicle.setSteeringValue(0, 0)
              window.vehicle.setSteeringValue(0, 1)
              break

            case 'b':
              window.vehicle.setBrake(0, 0)
              window.vehicle.setBrake(0, 1)
              window.vehicle.setBrake(0, 2)
              window.vehicle.setBrake(0, 3)
              break
          }
        })
}


function updateCamera() {

    // bugs:
    // (1) camera does not look at back of car
    if (!carBody) return;

    // Desired camera position = car position + offset
    const desiredPosition = new THREE.Vector3().copy(carBody.position).add(cameraOffset);

    // Smooth camera movement
    camera.position.lerp(desiredPosition, 0.1);

    // Make camera look slightly ahead of the car for better visibility
    const lookAtTarget = new THREE.Vector3().copy(carBody.position);
    lookAtTarget.z -= 5; // Look ahead in the direction the car is facing
    camera.lookAt(lookAtTarget);
}

const meshRotationOffset = new THREE.Quaternion();
meshRotationOffset.setFromEuler(new THREE.Euler(0, -Math.PI / 2, 0)); // rotate 90° around Y

const carOffset = new THREE.Vector3(0, -0.5, 0);
function syncGraphics() {

    // to do:
    // (1) set vehicle tire mesh position and rotation to raycast vehicle settings

    // temporarily disabling for physics debugging
    if (!carMesh || !carBody) return;
        // Sync car mesh with chassis body (which is part of the raycast vehicle)

        
        carMesh.position.copy(carBody.position).add(carOffset);
        carMesh.quaternion.copy(carBody.quaternion);
        carMesh.quaternion.multiply(meshRotationOffset);
        
        // get all the tires
        // bug:
        // (1) tire rotation is buggy
        // (2) hard fix collision positioning to fix rotation bug, which is caused by threejs and cannon es using different z values for positioning
    // Get the car parts
    //const FL = carMesh.getObjectByName("Círculo000");
    //const FR = carMesh.getObjectByName("Círculo001");
    //const BR = carMesh.getObjectByName("Círculo003");
    //const BL = carMesh.getObjectByName("Círculo011");
    //const BODY = carMesh.getObjectByName("Carroceria001");

    //const wheelMeshes = [FL, FR, BL, BR];

    //const wheelRotationOffset = new THREE.Quaternion();

    //wheelRotationOffset.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0))
          // 2️⃣ Sync wheels
    //window.vehicle.wheelInfos.forEach((wheel, index) => {
    //    const wheelMesh= wheelMeshes[index];
    //    if (!wheelMesh) return;

        // Copy position
        //wheelMesh.position.copy(wheel.worldTransform.position);

        
        // Copy rotation
    //    wheelMesh.quaternion.copy(wheel.worldTransform.quaternion);
   //     wheelMesh.quaternion.multiply(wheelRotationOffset);
        
   // });
        
    
}
 /**
* Create a Cannon-es static body from a Three.js mesh
* @param mesh - Three.js mesh to convert to collision body
*/
function createStaticBodyFromMesh(mesh: THREE.Mesh): void {
        // ignore Landscape001 mesh, that is for the toonshader
        //if (mesh.name === "Landscape001"){
        //    return
        //}
        
        const geometry = mesh.geometry;
        
        // Check if geometry has valid attributes
        if (!geometry.attributes.position) {
            console.warn('Mesh has no position attributes, skipping collision body');
            return;
        }

        // Get world position and rotation
        const worldPosition = new THREE.Vector3();
        const worldQuaternion = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();
        
        mesh.updateWorldMatrix(true, false);
        mesh.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

        // Create collision shape based on geometry type
        let shape: CANNON.Shape;
        
        if (geometry instanceof THREE.BoxGeometry) {
            // For box geometry, use Box shape
            const size = new THREE.Vector3();
            geometry.computeBoundingBox();
            geometry.boundingBox!.getSize(size);
            size.multiply(worldScale);
            
            shape = new CANNON.Box(new CANNON.Vec3(
                size.x / 2,
                size.y / 2, 
                size.z / 2
            ));
        } else if (geometry instanceof THREE.SphereGeometry) {
            // For sphere geometry, use Sphere shape
            const radius = geometry.parameters.radius * Math.max(worldScale.x, worldScale.y, worldScale.z);
            shape = new CANNON.Sphere(radius);
        } else if (geometry instanceof THREE.CylinderGeometry) {
            // For cylinder geometry, use Cylinder shape
            const params = geometry.parameters;
            shape = new CANNON.Cylinder(
                params.radiusTop * worldScale.x,
                params.radiusBottom * worldScale.x,
                params.height * worldScale.y,
                params.radialSegments
            );
        } else {
            // For complex geometry, use Trimesh (convex polyhedron)
            // Note: Trimesh is less performant but works for arbitrary shapes
            const vertices = geometry.attributes.position.array as Float32Array;
            const indices = geometry.index ? geometry.index.array as Uint32Array : undefined;
            
            if (indices && indices.length > 0) {
                // Use Trimesh for indexed geometry
                const cannonVertices = [];
                for (let i = 0; i < vertices.length; i += 3) {
                    cannonVertices.push(
                        vertices[i] * worldScale.x,
                        vertices[i + 1] * worldScale.y, 
                        vertices[i + 2] * worldScale.z
                    );
                }
                
                shape = new CANNON.Trimesh(cannonVertices, Array.from(indices));
            } else {
                console.warn('Complex mesh without indices, using simplified collision');
                // Fallback to bounding box
                geometry.computeBoundingBox();
                const box = geometry.boundingBox!;
                const size = new THREE.Vector3();
                box.getSize(size);
                size.multiply(worldScale);
                
                shape = new CANNON.Box(new CANNON.Vec3(
                    size.x / 2,
                    size.y / 2,
                    size.z / 2
                ));
            }
        }

        // Create static body
        const body = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: shape,
            position: new CANNON.Vec3(
                worldPosition.x,
                worldPosition.y,
                worldPosition.z
            ),
            quaternion: new CANNON.Quaternion(
                worldQuaternion.x,
                worldQuaternion.y, 
                worldQuaternion.z,
                worldQuaternion.w
            )
        });

        // Add body to physics world and store reference
        world.addBody(body);
        //this.levelBodies.push(body);
        
        console.log(`Added static collision body for mesh: ${mesh.name || 'unnamed'}`);
    }



const DEBUG = false;

function animate() {
    requestAnimationFrame(animate);
    input();
    updatephysicsv3();
    syncGraphics();
    updateCamera();
    if (DEBUG){
        cannonDebugger.update();
    }
    
    renderer.render(scene, camera);
}

animate();