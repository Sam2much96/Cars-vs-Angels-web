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
 * (12) implement texturing in world level
 * (13) implement cash and mission system
 * (14) organise source code into classes for easier readability
 * (15) implement hdr and weather system
 * (16) port material data into threejs and depreciate material image usage
 * (17) replace howlerjs with zzfxm and zzfx
 * (18) separate codebase into separate scripts
 * (19) desccribe differnt game states & enumerations for each of the differnt hdr's
 * 
 * bugs:
 * (1) fix camera follow logic
 * (2) fix vehicle collisions
 * 
 *
 */

// for 3d mesh and texture rendering
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; 
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

// for 3d physics and collisions
import * as CANNON from "cannon-es";
import CannonDebugger from 'cannon-es-debugger';





// Music singleton
import { Music } from './src/Music/Music';

import { Vehicle, syncGraphics, updatephysicsv3 } from './Vehicle';
import { input } from './Inputs';

// ------------------------------------------------------
// GLOBALS
// ------------------------------------------------------

declare global {
    interface Window {
        Vehicle: Vehicle,
        music : Music,
        scene :THREE.Scene, //global 3js scene pointer
        world : CANNON.World, // cannon es physics world pointer
    }
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
// Music & SFX
// ------------------------------------------------------
window.music = new Music();
window.music.play();











// ------------------------------------------------------
// Overall Level Debug
// ------------------------------------------------------
const DEBUG = true;


// ------------------------------------------------------
// SCENE, CAMERA, RENDERER
// ------------------------------------------------------

const scene = new THREE.Scene();
window.scene = scene;

 
// Set the camera offset from the car
const cameraOffset = new THREE.Vector3(0, 2.5, -7); // x=side, y=height, z=behind
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 6);

const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    logarithmicDepthBuffer: true 
});

//set up the renderer
renderer.outputColorSpace = THREE.SRGBColorSpace;

// set the shadow
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);


// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});





// ------------------------------------------------------ 
// Weather & HDR
// ------------------------------------------------------

const pmrem = new THREE.PMREMGenerator(renderer);
pmrem.compileEquirectangularShader();

const HDRloader = new HDRLoader();
const envMap = await HDRloader.loadAsync("kloppenheim_07_puresky_1k.hdr");
envMap.mapping = THREE.EquirectangularReflectionMapping;
scene.environment = envMap; // reflections
scene.background = envMap; //skybox 

scene.fog = new THREE.Fog(0x87ceeb, 100, 1000); // Add fog for distance

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
window.world = world;


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

const loadedBuildings = [];

// Track loading progress
let totalBuildings = 0;
let loadedCount = 0;








// ------------------------------------------------------
// (1) LOAD CITY MAP (STATIC ENVIRONMENT)
// ------------------------------------------------------

// bug:
// (1) city map level needs optimisation to fix occlusiion culling (done)
// (2) remove all materials from level object and fix positioning (done)
// (3) roads keep floating in model export, (1/2)

loader.load('./ground_mesh.glb', (gltf) => {
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
                createFloorStaticBodyFromMesh(obj);

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




loader.load('./buildings_mesh.glb', (gltf) => {
    const buildings = gltf.scene;
    buildings.traverse((obj) => {
      
    });

    scene.add(buildings);

}, undefined, (err) => {
    console.error('CITY LOAD ERROR:', err);
});




// ------------------------------------------------------
// Vehicle
// ------------------------------------------------------
window.Vehicle = new Vehicle();



// ------------------------------------------------------
// SIMPLE CONTROLS (forward/back/left/right)
// ------------------------------------------------------

const keys: Record<string, boolean> = {};

window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

// ------------------------------------------------------
// GAME LOOP
// ------------------------------------------------------




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
    // (2) camera positioning is buggy
    if (!window.Vehicle.carBody) return;

    // Desired camera position = car position + offset
    const desiredPosition = new THREE.Vector3().copy(window.Vehicle.carBody.position).add(cameraOffset);

    // Smooth camera movement
    camera.position.lerp(desiredPosition, 0.1);

    // Make camera look slightly ahead of the car for better visibility
    const lookAtTarget = new THREE.Vector3().copy(window.Vehicle.carBody.position);
    //lookAtTarget.z -= 5; // Look ahead in the direction the car is facing
    camera.lookAt(lookAtTarget);
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


 function createFloorStaticBodyFromMesh(mesh: THREE.Mesh): void {
    const FLOOR_THICKNESS = 5; // collision thickness (world units)

    if (!mesh.geometry || !mesh.geometry.attributes.position) {
        console.warn('Mesh has no geometry, skipping collider');
        return;
    }

    // Ensure bounding box exists
    mesh.geometry.computeBoundingBox();
    const bbox = mesh.geometry.boundingBox;
    if (!bbox) return;

    // Decompose world transform
    const worldPosition = new THREE.Vector3(0,0,0);
    const worldQuaternion = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();

    mesh.updateWorldMatrix(true, false);
    mesh.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);

    // Get scaled size of the mesh
    const size = new THREE.Vector3();
    bbox.getSize(size);
    size.multiply(worldScale);

    // Create thick box collider
    const halfExtents = new CANNON.Vec3(
        size.x / 2,
        FLOOR_THICKNESS / 2,
        size.z / 2
    );

    const shape = new CANNON.Box(halfExtents);

    // Lower collider so top matches mesh surface
    const bodyPosition = new CANNON.Vec3(
        worldPosition.x,
        worldPosition.y - FLOOR_THICKNESS / 2,
        worldPosition.z
    );

    const body = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape,
        position: bodyPosition,
        quaternion: new CANNON.Quaternion(
            worldQuaternion.x,
            worldQuaternion.y,
            worldQuaternion.z,
            worldQuaternion.w
        )
    });

    world.addBody(body);

    console.log(`✅ Thick floor collider created for: ${mesh.name || 'unnamed'}`);
}
   


/**
 * Core Game Loop
 * 
 * Features:
 * (1) render 3d world with Cannon js
 * (2) register user input
 * (3) sync the game physics by copying physics data onto the 3d meshes
 * (4) sync the camera to follow the car object
 * (5) visually debug the world physics if needed
 */
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




