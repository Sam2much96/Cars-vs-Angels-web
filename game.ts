/// <reference path="./game.d.ts" />

/**
 * game.ts — bootstrap
 *
 * Wires together all systems and runs the game loop.
 * Scene, physics, and lighting setup live in src/core/.
 * Game objects are in src/Characters/, src/Vehicle/, src/Level/.
 * Missions are in src/Missions/.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import CannonDebugger from 'cannon-es-debugger';

import './src/UI/ui-mount.tsx';
import { uiStore }         from './src/UI/ui-score';
import { Music }           from './src/Music/Music';
import { DayNightCycle }   from './src/Level/Daynightcycle.ts';
import { Vehicle }         from './src/Vehicle/Vehicle';
import { Enemy }           from './src/Characters/Enemy';
import { Human }           from './src/Characters/Human';
import { Terrain }         from './src/Level/ground';
import { Buildings }       from './src/Level/buildings';
import { Waters }          from './src/Level/water';
import { Minimap }         from './src/Minimap/Minimap.ts';
import { MissionManager }  from './src/Missions/MissionManager';
import { AngelChaseMission } from './src/Missions/AngelChaseMission';
import { Rain } from './src/Level/Rain';
import { createSceneSetup, createLights } from './src/core/scene';
import { createPhysicsWorld }             from './src/core/physics';
import type { GameContext }               from './src/core/context';
import { CameraController }              from './src/Camera/CameraController';

const DEBUG = true;

// ── UI ────────────────────────────────────────────────────────────────────────
uiStore.setCash(0);
uiStore.setHealth(75);

// ── Music ─────────────────────────────────────────────────────────────────────
window.music = new Music();
document.addEventListener('visibilitychange', () => window.music.togglePause());

// ── Scene / Camera / Renderer ─────────────────────────────────────────────────
const { scene, camera, renderer } = createSceneSetup();
window.scene    = scene;
window.camera   = camera;
window.renderer = renderer;

// ── Lights ────────────────────────────────────────────────────────────────────
const { ambientLight, dirLight } = createLights(scene);

// ── Physics ───────────────────────────────────────────────────────────────────
const world = createPhysicsWorld();
window.world = world;
const cannonDebugger = CannonDebugger(scene, world);

// ── Loader ────────────────────────────────────────────────────────────────────
window.loader = new GLTFLoader();

// ── GameContext — single object passed to every system ────────────────────────
const ctx: GameContext = { scene, world, loader: window.loader, camera, renderer };
window.ctx = ctx;

// ── Day / Night Cycle ─────────────────────────────────────────────────────────
const cycle = new DayNightCycle(scene, dirLight, ambientLight, renderer);
await cycle.loadHDRs();
cycle.dayDuration = 300;

const rain = new Rain(ctx);
cycle.setRain(rain);

// ── Level ─────────────────────────────────────────────────────────────────────
new Terrain(ctx);
new Buildings(ctx);
new Waters(ctx);

// ── Game objects ──────────────────────────────────────────────────────────────
window.Vehicle = new Vehicle(ctx);
window.player  = new Human(ctx);
window.Angel   = new Enemy(ctx);

await Promise.all([window.Vehicle.ready, window.player.ready, window.Angel.ready]);
window.dispatchEvent(new CustomEvent('human-loaded'));

// ── Minimap ───────────────────────────────────────────────────────────────────
const minimap = new Minimap(ctx);
const blips = [
    { position: window.Vehicle.carMesh!.position, color: '#ff4444' },
    { position: window.player.mesh!.position,     color: '#44aaff' },
    { position: window.Angel.AngelMesh!.position, color: '#eeff33' },
];

// ── Missions ──────────────────────────────────────────────────────────────────
const missions = new MissionManager();

const angelChase = new AngelChaseMission();
missions.register(angelChase);
// Yellow marker placed a few steps in front of the player spawn
missions.addMarker('angel-chase-1', new THREE.Vector3(-118, 1, 22), 'Hunt the Angel');

// ── Camera ────────────────────────────────────────────────────────────────────
const cameraController = new CameraController();

// ── FPS counter ───────────────────────────────────────────────────────────────
const fpsDisplay = document.createElement('div');
fpsDisplay.style.cssText = `
    position: fixed; top: 10px; left: 10px; color: #00ff00;
    font-family: monospace; font-size: 14px;
    background: rgba(0,0,0,0.5); padding: 4px 8px;
    border-radius: 4px; z-index: 9999; pointer-events: none;
`;
document.body.appendChild(fpsDisplay);
let fpsTimer = 0;
let fpsCount = 0;

// ── Game loop ─────────────────────────────────────────────────────────────────
const clock      = new THREE.Clock();
const isMobile   = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
const physicsStep   = isMobile ? 1 / 30 : 1 / 60;
const frameInterval = 1000 / (isMobile ? 30 : 60);
let lastFrameTime = 0;
let frame = 0;

function animate(timestamp: number = 0) {
    requestAnimationFrame(animate);
    frame++;

    if (timestamp - lastFrameTime < frameInterval) return;
    const delta = clock.getDelta();
    lastFrameTime = timestamp;

    // FPS counter
    fpsCount++;
    fpsTimer += delta;
    if (fpsTimer >= 1) {
        fpsDisplay.textContent = [
            `FPS: ${fpsCount}`,
            `Delta: ${(delta * 1000).toFixed(1)}ms`,
            `Bodies: ${world.bodies.length}`,
            `Frame: ${frame}`,
        ].join(' | ');
        fpsCount = 0;
        fpsTimer = 0;
    }

    cycle.update(delta);
    world.step(physicsStep);

    if (window.Vehicle) window.Vehicle.physicsUpdate();
    if (window.player)  window.player.update(delta);
    if (window.Angel)   window.Angel.physicsProcess();

    if (window._builtinWater) {
        window._builtinWater.material.uniforms['time'].value += 1 / 60;
    }

    if (DEBUG) cannonDebugger.update();

    const playerPos = window.player.mesh?.position ?? new THREE.Vector3();
    rain.update(delta, playerPos);

    // Camera follows car when driving, player otherwise
    const cameraTarget = (window.Vehicle?.isDriving && window.Vehicle.carMesh)
        ? window.Vehicle.carMesh.position
        : playerPos;
    cameraController.update(delta, cameraTarget, camera);

    minimap.update(playerPos, blips);
    missions.update(delta, playerPos);

    renderer.render(scene, camera);
}

animate();
