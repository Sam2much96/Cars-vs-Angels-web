/**
 * Main game logic 
 * 
 * to do: 
 * (1) 
 * (2) 
 * (3) implement cannon-es vehicle physics for the car (done)
 * (4) implement static physics for the world environment and buildings (1/3)
 * (5) add music and sfx (1/2)
 * (6) simplify vehicle collision into single class object with exported vehicle variables (1/2)
 * (7) add money models + collisions
 * (8) add npc sprites with navigation ai
 * (9) add angel model enemy object
 * (10) add car playing mechanics
 * (11) organise code blocs into various classes and scripts for easier programming  
 * 
 * bugs:
 * (1) fix camera follow logic
 * (2) fix vehicle collisions
 * 
 *
 */

// for 3d mesh and texture rendering
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // to do ; (1) update tsConfig to use javascript files
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

// for 3d physics and collisions
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
  src: ['./beaach_sex_chike_san.ogg'],
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

//Ads
/**
 * 
 *   <!-- Game Monetize ads SDK + Ads testing -->
<script src="https://html5.api.gamemonetize.com/sdk.js"></script>
<script type="text/javascript">
   window.SDK_OPTIONS = {
      gameId: "01bsf4imoujpniyvppnz89kgh6tyl6nb",
      onEvent: function (a) {
         switch (a.name) {
            case "SDK_GAME_PAUSE":
               // pause game logic / mute audio
               break;
            case "SDK_GAME_START":
               // advertisement done, resume game logic and unmute audio
               break;
            case "SDK_READY":
               // when sdk is ready
               //console.log("game is ready");
               //console.log("Banners Ads Testing>>>>>>");
               sdk.showBanner();
               break;
         }
      }
   };
(function (a, b, c) {
   var d = a.getElementsByTagName(b)[0];
   a.getElementById(c) || (a = a.createElement(b), a.id = c, a.src = "https://api.gamemonetize.com/sdk.js", d.parentNode.insertBefore(a, d))
})(document, "script", "gamemonetize-sdk"); 
</script>         

 */


// ------------------------------------------------------
// SCENE, CAMERA, RENDERER
// ------------------------------------------------------

const scene = new THREE.Scene();

 
// Set the camera offset from the car
const cameraOffset = new THREE.Vector3(0, 5, -10); // x=side, y=height, z=behind
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 6);

const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    logarithmicDepthBuffer: true 
});

//set up the renderer
renderer.outputColorSpace = THREE.SRGBColorSpace;


renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);




// ------------------------------------------------------ 
// HDR
// ------------------------------------------------------

const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();

const HDRloader = new HDRLoader();
const envMap = await HDRloader.loadAsync("autumn_field_puresky_1k.hdr");
envMap.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = envMap; // reflections
scene.background = envMap; //skybox 

console.log("HDR environment loaded (HDRLoader)!");


// ------------------------------------------------------ 
// Lights
// ------------------------------------------------------
scene.add(new THREE.AmbientLight(0xffffff, 1.5));

const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(5, 10, 5);
scene.add(dirLight);




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
 * (2) tire rotation from collision vehicle is not transferred
 */



// ------------------------------------------------------
// (2) LOAD DODGE CHARGER MODEL
// ------------------------------------------------------

loader.load('./Dodge_Charger.glb', (gltf) => {
    carMesh = gltf.scene;
    
    carMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            console.log("Mesh found:", child.name);
            console.log(child.material.map); // should NOT be null
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
        position: new CANNON.Vec3(0, 2, 0), // set car collision above the citymap terrain
        angularVelocity: new CANNON.Vec3(0,0.5,0),
        angularDamping: 0.5,
        linearDamping: 0.01
    });

   // chassisBody.quaternion.setFromEuler(0, Math.PI / 2, 0);


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
    if (!carBody) return;

    const GRAVITY = world.gravity.y;
    //console.log("Gravity debug: ", GRAVITY);
    
    // Keybindings
        // Add force on keydown
        document.addEventListener('keydown', (event) => {
          
            //driving controls
          const maxSteerVal = 0.5
          const maxForce = 1000
          const brakeForce = 1000000

          // flying controls
            const thrust = 100; // forward/back
            const lift = 5000;    // up/down
            const turn = 0.005;   // yaw


          switch (event.key) {
            case 'w':
            case 'ArrowUp':
                if (GRAVITY == -10){
                window.vehicle.applyEngineForce(-maxForce, 2)
                window.vehicle.applyEngineForce(-maxForce, 3)
                 }
                else if (GRAVITY == 0){
                    // fly forward
                    carBody?.applyLocalForce(new CANNON.Vec3(-thrust, 0, 0), new CANNON.Vec3(0, 0, 0));
                }

              break

            case 's':
            case 'ArrowDown':
                if (GRAVITY == -10){
                window.vehicle.applyEngineForce(maxForce, 2)
                window.vehicle.applyEngineForce(maxForce, 3)
                }
                else if (GRAVITY == 0){
                    carBody?.applyLocalForce(new CANNON.Vec3(thrust, 0, 0), new CANNON.Vec3(0, 0, 0));
                }
              break

            case 'a':
            case 'ArrowLeft':
                if (GRAVITY == -10){
               window.vehicle.setSteeringValue(maxSteerVal, 0)
               window.vehicle.setSteeringValue(maxSteerVal, 1)
               }
               else if (GRAVITY == 0){
                carBody!.angularVelocity.y += turn;
               }
              break

            case 'd':
            case 'ArrowRight':
                if (GRAVITY == -10){
               window.vehicle.setSteeringValue(-maxSteerVal, 0)
               window.vehicle.setSteeringValue(-maxSteerVal, 1)
                }
                else if (GRAVITY == 0){
                    carBody!.angularVelocity.y -= turn;
                }
              break

            case 'space':
               window.vehicle.setBrake(brakeForce, 0)
               window.vehicle.setBrake(brakeForce, 1)
               window.vehicle.setBrake(brakeForce, 2)
               window.vehicle.setBrake(brakeForce, 3)
              break
            case "p":
              //console.log("setting gravity");
              world.gravity.set(0, 0, 0);
              //applyFlightControls(true);
              // apply lift to car 
              carBody?.applyLocalForce(new CANNON.Vec3(0, lift, 0), new CANNON.Vec3(0, 0, 0));
              break
          }
        })

         // Reset force on keyup
        document.addEventListener('keyup', (event) => {
        //carSfx.pause(); // pause sfx
          switch (event.key) {
            case 'w':
            case 'ArrowUp':
                // ground
                if (GRAVITY == -10) {
                window.vehicle.applyEngineForce(0, 2)
                window.vehicle.applyEngineForce(0, 3)
                }

                // air
                //else if (!GRAVITY) {
                    //carBody?.applyLocalForce(new CANNON.Vec3(0, 0, -thrust), new CANNON.Vec3(0, 0, 0));
                //}

              break

            case 's':
            case 'ArrowDown':
                if (GRAVITY == -10){
              window.vehicle.applyEngineForce(0, 2)
              window.vehicle.applyEngineForce(0, 3)
                }
              break

            case 'a':
            case 'ArrowLeft':
              if (GRAVITY == -10) { 
              window.vehicle.setSteeringValue(0, 0)
              window.vehicle.setSteeringValue(0, 1)
              }
              break

            case 'd':
            case 'ArrowRight':
              if (GRAVITY == -10){
                window.vehicle.setSteeringValue(0, 0)
              window.vehicle.setSteeringValue(0, 1)
              }
              break

            case 'b':
              window.vehicle.setBrake(0, 0)
              window.vehicle.setBrake(0, 1)
              window.vehicle.setBrake(0, 2)
              window.vehicle.setBrake(0, 3)
              break
            case "o":
                // reset gravity
                //console.log("reseting world gravity");
                world.gravity.set(0, -10, 0);
                
                break
          }
        })
}


//function applyFlightControls(set: boolean) {
 //   if (!carBody) return;
 //   if (false) return;



    //if (keys["KeyW"]) carBody.applyLocalForce(new CANNON.Vec3(0, 0, -thrust), new CANNON.Vec3(0, 0, 0));
    //if (keys["KeyS"]) carBody.applyLocalForce(new CANNON.Vec3(0, 0, thrust), new CANNON.Vec3(0, 0, 0));
    //if (keys["KeyA"]) carBody.angularVelocity.y += turn;
    //if (keys["KeyD"]) carBody.angularVelocity.y -= turn;
    //if (keys["Space"]) carBody.applyLocalForce(new CANNON.Vec3(0, lift, 0), new CANNON.Vec3(0, 0, 0));
    //if (keys["ShiftLeft"]) carBody.applyLocalForce(new CANNON.Vec3(0, -lift, 0), new CANNON.Vec3(0, 0, 0));
//}

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

const carOffset = new THREE.Vector3(0, -0.7, 0);



function syncGraphics() {
    /**
     * bugs:
     * 
     * (1) buggy wheel rotation
     */
    if (!carMesh || !carBody || !window.vehicle) return;

    // 1️⃣ Sync chassis
    carMesh.position.copy(carBody.position).add(carOffset);
    carMesh.quaternion.copy(carBody.quaternion).multiply(meshRotationOffset);

    // 2️⃣ Get wheel meshes in correct order: FL, FR, BL, BR
    const wheelMeshes = [
        carMesh.getObjectByName("Círculo004"), // FL
        carMesh.getObjectByName("Círculo005"), // FR
        carMesh.getObjectByName("Círculo006"), // BL
        carMesh.getObjectByName("Círculo007"), // BR
    ];

    // 3️⃣ Per-wheel axis correction quaternions
    // Adjust X/Y/Z based on Blender export
    const leftWheelCorrection = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(-Math.PI / 2, Math.PI / 2, 0)
    );
    const rightWheelCorrection = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(-Math.PI / 2, Math.PI, 0) // mirror for right side
    );

    // 4️⃣ Sync each wheel
    window.vehicle.wheelInfos.forEach((wheel, i) => {
        const mesh = wheelMeshes[i];
        if (!mesh) return;

        // Update wheel physics transform
        window.vehicle.updateWheelTransform(i);
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



const DEBUG = true;

function animate() {
    requestAnimationFrame(animate);
    input();
    updatephysicsv3();
    syncGraphics(); //temporarily disabled for debugging
    updateCamera();
    if (DEBUG){
        cannonDebugger.update();
    }
    
    renderer.render(scene, camera);
}

animate();

