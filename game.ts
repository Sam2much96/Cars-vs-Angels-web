/**
 * Main game logic 
 * 
 * to do: 
 * (1) implement react UI
 * (2) implement threejs shader for enemy character object
 * (3)  * (4) implement static physics for the world environment and buildings (1/3)
 * (5) add music and sfx (1/2)
 * (6) 
 * (7) add money models + collisions
 * (8) add npc sprites with navigation ai
 * (9) add angel model enemy object (1/3)
 * (10) 
 * (11) organise code blocs into various classes and scripts for easier programming  
 * (12) implement texturing in world level
 * (13) implement cash and mission system
 * (14) organise source code into classes for easier readability
 * (15) implement hdr and weather system
 * (16) port material data into threejs and depreciate material image usage
 * (17) replace howlerjs with zzfxm and zzfx
 * (18) 
 *  (19) desccribe differnt game states & enumerations for each of the differnt hdr's
 * (20) create gem /cash items that despawn and also increase your cash balance
 * 
 * bugs:
 * (1) fix camera follow logic
 * (2) fix vehicle tire collisions
 * (3) load time is lengthy, add a title screen to hide model load times
 * (4) model load time is buggy preload necessary models optimally and implement an optimised model size (draco compression) to speed up load times
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



// using react for the Projects's UI
//import {UI} from "./src/UI/UI";
//import UI from './src/UI/UI.tsx';
import './src/UI/ui-mount.tsx';  // mounts the React UI
import { uiStore } from './src/UI/ui-score'; // globals database for UI



// Music singleton
import { Music } from './src/Music/Music';

// 3d level objects with Collisions
//import (Terrain) from "./src/Level/ground";
import { Vehicle} from './src/Vehicle/Vehicle';
import {Enemy} from "./src/Characters/Enemy";
import {Rock} from "./src/props/rocks"
import {Gem} from "./src/props/gem";
import {Terrain} from "./src/Level/ground";
import {Buildings} from "./src/Level/buildings";


import { syncAngelGraphics } from './syncGraphics.ts';

// ------------------------------------------------------
// GLOBALS
// ------------------------------------------------------

declare global {
    interface Window {
        Vehicle: Vehicle,
        Angel : Enemy,
        music : Music,
        scene :THREE.Scene, //global 3js scene pointer
        world : CANNON.World, // cannon es physics world pointer
        loader : GLTFLoader,
        camera : THREE.PerspectiveCamera, // global pointer to camera
    }
}

const DEFAULT_GRAVITY = -10

// ------------------------------------------------------
// UI
// ------------------------------------------------------
uiStore.setCash(0);
uiStore.setHealth(75);




// ------------------------------------------------------
// LOADERS
// ------------------------------------------------------

//const loader = new GLTFLoader();

// ------------------------------------------------------
// Input
// ------------------------------------------------------






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

window.scene = new THREE.Scene();
//window.scene = scene;

 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 6);
window.camera = camera;


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
const envMap = await HDRloader.loadAsync("mud_road_puresky_1k.hdr");
envMap.mapping = THREE.EquirectangularReflectionMapping;
window.scene.environment = envMap; // reflections
window.scene.background = envMap; //skybox 

window.scene.fog = new THREE.Fog(new THREE.Color().setHex(0x87ceeb), 100, 1000); // Add fog for distance

console.log("HDR environment loaded (HDRLoader)!");




// ------------------------------------------------------ 
// Lights
// ------------------------------------------------------
window.scene.add(new THREE.AmbientLight(0xffffff, 1.5));

const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(5, 10, 5);
window.scene.add(dirLight);




// ------------------------------------------------------
// PHYSICS WORLD
// ------------------------------------------------------

const world = new CANNON.World();
window.world = world;


world.gravity.set(0, DEFAULT_GRAVITY, 0)

// Sweep and prune broadphase
world.broadphase = new CANNON.SAPBroadphase(world)

// Disable friction by default
world.defaultContactMaterial.friction = 0

const cannonDebugger = CannonDebugger(window.scene, world);




// ------------------------------------------------------
// LOADERS
// ------------------------------------------------------

window.loader = new GLTFLoader();




// Level props
const ground = new Terrain();
const buildings = new Buildings();


// ------------------------------------------------------
// Vehicle
// ------------------------------------------------------
const PlayerCar = new Vehicle();
window.Vehicle = PlayerCar;





window.Angel = new Enemy();



// testing 3d game items
const testing_1 = new Rock();
const testing_2 = new Gem();















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
    //input();


    // this should be mapped to settings
    world.step(1/60); // simulate the world physics at 60 fps
    PlayerCar.physicsUpdate();

    syncAngelGraphics();

    // debug the 3d collisions physics visually
    if (DEBUG){
        cannonDebugger.update();
    }
    
    renderer.render(window.scene, camera);
}

animate();




