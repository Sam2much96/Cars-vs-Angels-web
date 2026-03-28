/**
 * Main game logic 
 * 
 * to do: 
 * (1) implement player character
 * (2) implement threejs simple material shader for enemy character object glow
 * (3)  * (4) implement static physics for the world environment and buildings (1/3)
 * (5) add music and sfx (1/2)
 * (6) add an inventory system
 * (7) add money models + collisions
 * (8) add npc sprites with navigation ai
 * (9) add angel model enemy object (2/3)
 * (10) 
 * (11) organise code blocs into various classes and scripts for easier programming  
 * (12) implement texturing in world level
 * (13) implement cash and mission system (1/2)
 * (14) 
 * (15) implement hdr and weather system
 * (16) port material data into threejs and depreciate material image usage
 * (17) add a dialogue system
 * (18) add a day/ night cycle
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

// input manaager
//import { InputManager } from "./src/UI/Inputs/InputManager";
import { DayNightCycle } from './src/Level/Daynightcycle.ts';

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
import {Waters} from "./src/Level/water";
import {Human} from "./src/Characters/Human";
import {Dragon} from "./src/Characters/Dragon";
import {Bird} from "./src/Characters/Bird";


import { Minimap } from './src/Minimap/Minimap.ts';

// to do: (1) depreciate this into a process code bloc in the angel object
//import { syncAngelGraphics } from './syncGraphics.ts';

import { initializeGameMonetizeAds } from './Ads';

// ------------------------------------------------------
// GLOBALS
// ------------------------------------------------------

declare global {
    interface Window {
        Vehicle: Vehicle,
        Angel : Enemy,
        player : Human,
        music : Music,
        scene :THREE.Scene, //global 3js scene pointer
        world : CANNON.World, // cannon es physics world pointer
        loader : GLTFLoader,
        camera : THREE.PerspectiveCamera, // global pointer to camera
        renderer : THREE.WebGLRenderer,
        _builtinWater : any,

    }
}

const DEFAULT_GRAVITY = -10

// ------------------------------------------------------
// UI
// ------------------------------------------------------
uiStore.setCash(0);
uiStore.setHealth(75);





// ------------------------------------------------------
// Music & SFX
// ------------------------------------------------------
window.music = new Music();
// Call this inside a click/keypress handler
//document.addEventListener('click', () => {
//    window.music.play();
//}, { once: true });

document.addEventListener("visibilitychange", async () => {
            if (document.hidden){
                window.music.togglePause();
            }
            else {
                window.music.togglePause();
            }
        
        })


// ------------------------------------------------------
// Advertisising : Game Monetize
// ------------------------------------------------------
/**
initializeGameMonetizeAds(
  '01bsf4imoujpniyvppnz89kgh6tyl6nb',
  () => {
    // Pause game logic
    // Mute audio
    console.log('Game paused for ad');

  },
  () => {
    // Resume game logic
    // Unmute audio
    console.log('Game resumed after ad');
  },
  () => {
    // Optional: Additional logic when SDK is ready
    console.log('SDK ready callback');
  }
);

 */

// ------------------------------------------------------
// Overall Level Debug
// ------------------------------------------------------
// to do: (1) export this setting to a debug UI in controls
const DEBUG = true; 


// ------------------------------------------------------
// SCENE, CAMERA, RENDERER
// ------------------------------------------------------

window.scene = new THREE.Scene();


 

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 6);
window.camera = camera;


const renderer = new THREE.WebGLRenderer({
    //canvas: document.getElementById('canvas') as HTMLCanvasElement,
    preserveDrawingBuffer: true,  // required for readRenderTargetPixels
    antialias: true

});

//set up the renderer
renderer.outputColorSpace = THREE.SRGBColorSpace;

// set the shadow
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.setSize(window.innerWidth, window.innerHeight);

window.renderer = renderer;
document.body.appendChild(renderer.domElement);

// cap pixel ration [optimisation]
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));


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

//const HDRloader = new HDRLoader();
//const envMap = await HDRloader.loadAsync("autumn_field_puresky_1k.hdr");
//envMap.mapping = THREE.EquirectangularReflectionMapping;
//window.scene.environment = envMap; // reflections
//window.scene.background = envMap; //skybox 

//window.scene.fog = new THREE.Fog(new THREE.Color().setHex(0x87ceeb), 100, 1000); // Add fog for distance


//console.log("HDR environment loaded (HDRLoader)!");



// ------------------------------------------------------ 
// Lights
// ------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5)
window.scene.add(ambientLight);



const dirLight = new THREE.DirectionalLight(0xffffff, 5);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 512; //formerly 2048 now 512 for mobile optimisation
dirLight.shadow.mapSize.height = 512;


window.scene.add(dirLight);

const cycle = new DayNightCycle(window.scene, dirLight, ambientLight, renderer);
await cycle.loadHDRs(); 
cycle.dayDuration = 300; // 5 real minutes = 1 game day, tune this freely


// ------------------------------------------------------
// PHYSICS WORLD
// ------------------------------------------------------

const world = new CANNON.World();
window.world = world;


world.gravity.set(0, DEFAULT_GRAVITY, 0)

// Sweep and prune broadphase
world.broadphase = new CANNON.SAPBroadphase(world);
world.broadphase.useBoundingBoxes = true;

// Also increase the sleep threshold so static/idle bodies stop simulating
world.allowSleep = true;
//world.sleepTimeLimit = 0.1;
//world.sleepSpeedLimit = 0.1;


// Disable friction by default
world.defaultContactMaterial.friction = 10

const cannonDebugger = CannonDebugger(window.scene, world);




// ------------------------------------------------------
// LOADERS
// ------------------------------------------------------
// very important
// sets the loader for all 3d scenes & objects

window.loader = new GLTFLoader();



// FPS Debugger
// ── FPS Counter ───────────────────────────────────────────────────────────────
const fpsDisplay = document.createElement('div');
fpsDisplay.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    color: #00ff00;
    font-family: monospace;
    font-size: 14px;
    background: rgba(0,0,0,0.5);
    padding: 4px 8px;
    border-radius: 4px;
    z-index: 9999;
    pointer-events: none;
`;
document.body.appendChild(fpsDisplay);
let fpsTimer = 0;
let fpsCount = 0;
// ─────────────────────────────────────────────────────────────────────────────


// Level props
const ground = new Terrain();
const buildings = new Buildings();
const waters = new Waters();

// ------------------------------------------------------
// Vehicle
// ------------------------------------------------------
window.Vehicle = new Vehicle();
window.player  = new Human();
window.Angel = new Enemy();

// update vehilce and player object with the spawnpoint co-ordinates
//window.Vehicle.spawnPoint = buildings.spawnpoint!;
//window.player.spawnPoint = buildings.spawnpoint!;

// Wait for both to finish loading simultaneously
await Promise.all([
    window.Vehicle.ready,
    window.player.ready,
    window.Angel.ready
]);

window.dispatchEvent(new CustomEvent("human-loaded"));

//window.Angel = new Enemy();



// After renderer and scene are ready:
const minimap = new Minimap(renderer, window.scene);
const blips = [
  { position: window.Vehicle.carMesh!.position,  color: '#ff4444' }, // red = enemy
  { position: window.player.mesh!.position,  color: '#44aaff' },
  { position: window.Angel.AngelMesh!.position, color: '#eeff33ff' }, // blue = angel
];


// testing 3d game items
// temporarily disabled
//const testing_1 = new Rock();
//const testing_2 = new Gem();



const clock = new THREE.Clock();
//const testing_4 = new Dragon();

// detect mobile once outside the loop
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
const physicsStep = isMobile ? 1/30 : 1/60;

const targetFPS = isMobile ? 30 : 60;
const frameInterval = 1000 / targetFPS;
let lastFrameTime = 0;
let frame = 0;

/**
 * Core Game Loop
 * 
 * Features:
 * (1) render 3d world with Cannon js
 * (2) register user input
 * (3) sync the game physics by copying physics data onto the 3d meshes
 * (4) sync the camera to follow the car object
 * (5) visually debug the world physics if needed
 * (6) simulate the world physics in 30 fps for mobile, 60 for pc
 * (7) fps throthling for mobile
 */
function animate(timestamp : number = 0) {
    requestAnimationFrame(animate);
    frame++
    


    // fps throtling
    if (timestamp - lastFrameTime < frameInterval) return;
    let delta = clock.getDelta();
    lastFrameTime = timestamp;
    

        //FPS counter
    // FPS counter update
    fpsCount++;
    fpsTimer += delta;
    if ( fpsTimer >= 1) {
        fpsDisplay.textContent = [
            `FPS: ${fpsCount}`,
            `Delta: ${(delta * 1000).toFixed(1)}ms`,
            `Bodies: ${world.bodies.length}`,
            `Frame: ${frame}`,
        ].join(' | ');
        fpsCount = 0;
        fpsTimer = 0;
    }

    // to do: (1) this should be mapped to settings ui
    //world.step(1/60, delta,3); // simulate the world physics at 60 fps

    cycle.update(delta); // ← add this line
    //world.step(1/60);
    
    world.step(physicsStep);
    //world.step(physicsStep, delta,3);
    //isMobile ? world.step(1/30) : world.step(1/60);
    //PlayerCar.physicsUpdate();
    if (window.Vehicle){
        window.Vehicle.physicsUpdate();
    }

    if (window.player){
        window.player.update(delta);
    }

    if (window.Angel){
        window.Angel.physicsProcess();
    }

    // In your animation loop:
    if (window._builtinWater) {
           window._builtinWater.material.uniforms['time'].value += 1 / 60;

        if (frame % 3 === 0) {
            // Only re-render the reflection every 3rd frame (~20fps at 60fps)
            window._builtinWater.visible = true;
            //renderer.render(window.scene, camera); // reflection bakes here internally
        }
    }

    // debug the 3d collisions physics visually
    if (DEBUG){
        cannonDebugger.update();
    }


    // Update minimap — pass player world position and blips
    minimap.update(window.player.mesh!.position, blips);
    
    renderer.render(window.scene, camera);
}

animate();




