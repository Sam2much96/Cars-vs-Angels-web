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
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';


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
import { PlayerVoice }                   from './src/Dialogue/VoiceActor';

let fpsDebugEnabled     = false;
let physicsDebugEnabled = false;
const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
let gameOverActive = false;

const VOID_THRESHOLD = -15; // y below this = fallen off map

function triggerGameOver() {
    if (gameOverActive) return;
    gameOverActive = true;

    // Teleport player to spawn first so the ragdoll falls visibly on the map,
    // not in the void. updateWorldMatrix forces bones to recalculate immediately
    // so enableRagdoll() snaps ragdoll parts to the correct spawn position.
    if (!window.player.isDriving && !window.player.isDead) {
        const sp = window.player.spawnPoint;
        if (window.player.body) {
            window.player.body.position.set(sp.x, sp.y, sp.z);
            window.player.body.velocity.set(0, 0, 0);
            window.player.body.wakeUp();
        }
        if (window.player.mesh) {
            window.player.mesh.position.set(sp.x, sp.y - 0.8, sp.z);
            window.player.mesh.updateWorldMatrix(true, true);
        }
        window.player.takeDamage(1000);

        // Snap camera to look at spawn so the ragdoll is in frame.
        // Positioned slightly above and behind — camera is then frozen by gameOverActive.
        camera.position.set(sp.x, sp.y + 5, sp.z - 10);
        camera.lookAt(sp.x, sp.y + 1, sp.z);
    }

    uiStore.setHealth(0);
    window.dispatchEvent(new CustomEvent('game-over'));

    setTimeout(() => {
        // Force-exit vehicle state
        if (window.Vehicle.isDriving) {
            window.Vehicle.isDriving  = false;
            window.player.isDriving   = false;
            window.Vehicle.toggleGravity(true);
        }

        // Reset car to spawn
        const cs = window.Vehicle.spawnPoint;
        if (window.Vehicle.carBody) {
            window.Vehicle.carBody.position.set(cs.x, cs.y, cs.z);
            window.Vehicle.carBody.velocity.set(0, 0, 0);
            window.Vehicle.carBody.angularVelocity.set(0, 0, 0);
            window.Vehicle.vehicle?.applyEngineForce(0, 2);
            window.Vehicle.vehicle?.applyEngineForce(0, 3);
            window.Vehicle.carBody.wakeUp();
        }

        // Reset player
        window.player.respawn();
        uiStore.setHealth(100);
        uiStore.setCash(0);

        gameOverActive = false;
        window.dispatchEvent(new CustomEvent('game-over-reset'));
    }, 3000);
}



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
const debugGroup = new THREE.Group();
debugGroup.visible = false;
scene.add(debugGroup);
const cannonDebugger = (await import('cannon-es-debugger')).default(debugGroup as unknown as THREE.Scene, world);

// ── Loader ────────────────────────────────────────────────────────────────────
window.loader = new GLTFLoader();
window.loader.setMeshoptDecoder(MeshoptDecoder);

// ── GameContext — single object passed to every system ────────────────────────
const ctx: GameContext = { scene, world, loader: window.loader, camera, renderer };
window.ctx = ctx;

// ── Day / Night Cycle ─────────────────────────────────────────────────────────
const cycle = new DayNightCycle(scene, dirLight, ambientLight, renderer);
await cycle.loadHDRs();
cycle.dayDuration = 300;

const rain = new Rain(ctx, isMobile ? 1500 : 5000);
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

// Intro dialogue — fires after the first user interaction to satisfy autoplay policy
window.addEventListener('pointerdown', () => {
    setTimeout(() => PlayerVoice.speak("Oh shit, here we go again."), 500);
}, { once: true });

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
fpsDisplay.style.display = 'none'; // hidden until toggled on
document.body.appendChild(fpsDisplay);
let fpsTimer = 0;
let fpsCount = 0;

// ── Debug / Save / Load events (driven by PauseMenu) ──────────────────────────
window.addEventListener('toggle-fps-debug',     (e) => {
    fpsDebugEnabled = (e as CustomEvent<boolean>).detail;
    fpsDisplay.style.display = fpsDebugEnabled ? 'block' : 'none';
});

window.addEventListener('toggle-physics-debug', (e) => {
    physicsDebugEnabled = (e as CustomEvent<boolean>).detail;
    debugGroup.visible  = physicsDebugEnabled;
});

window.addEventListener('save-game', () => {
    const data = {
        cash:      uiStore.getCash(),
        health:    uiStore.getHealth(),
        playerPos: window.player.body
            ? { x: window.player.body.position.x, y: window.player.body.position.y, z: window.player.body.position.z }
            : null,
        vehiclePos: window.Vehicle.carBody
            ? { x: window.Vehicle.carBody.position.x, y: window.Vehicle.carBody.position.y, z: window.Vehicle.carBody.position.z }
            : null,
    };
    localStorage.setItem('cva-save', JSON.stringify(data));
    console.log('Game saved');
});

window.addEventListener('load-game', () => {
    const raw = localStorage.getItem('cva-save');
    if (!raw) return;
    try {
        const data = JSON.parse(raw);
        uiStore.setCash(data.cash);
        uiStore.setHealth(data.health);
        if (data.playerPos && window.player.body) {
            window.player.body.position.set(data.playerPos.x, data.playerPos.y, data.playerPos.z);
            window.player.body.velocity.set(0, 0, 0);
            window.player.body.wakeUp();
        }
        if (data.vehiclePos && window.Vehicle.carBody) {
            window.Vehicle.carBody.position.set(data.vehiclePos.x, data.vehiclePos.y, data.vehiclePos.z);
            window.Vehicle.carBody.velocity.set(0, 0, 0);
            window.Vehicle.carBody.angularVelocity.set(0, 0, 0);
            window.Vehicle.carBody.wakeUp();
        }
        console.log('Game loaded');
    } catch {
        console.error('Failed to load save data');
    }
});

// ── Game loop ─────────────────────────────────────────────────────────────────
const clock      = new THREE.Clock();
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
    if (window.Angel)   window.Angel.physicsProcess(delta);

    // Void detection — check car and player
    if (!gameOverActive) {
        const carY = window.Vehicle.carBody?.position.y ?? 0;
        // Player body is intentionally parked at y=-1000 while driving — skip that check
        const playerY = window.player.isDriving
            ? 0
            : (window.player.body?.position.y ?? 0);
        if (carY < VOID_THRESHOLD || playerY < VOID_THRESHOLD) {
            triggerGameOver();
        }
    }

    if (window._builtinWater) {
        window._builtinWater.material.uniforms['time'].value += 1 / 60;
    }

    if (physicsDebugEnabled) cannonDebugger?.update();

    const playerPos = window.player.mesh?.position ?? new THREE.Vector3();
    rain.update(delta, playerPos);

    if (gameOverActive && window.player.mesh) {
        // Death cam: slowly dolly toward the ragdoll
        const mp = window.player.mesh.position;
        camera.position.lerp(new THREE.Vector3(mp.x, mp.y + 2.5, mp.z - 5), 0.04);
        camera.lookAt(mp.x, mp.y + 1, mp.z);
    } else if (!gameOverActive) {
        const cameraTarget = (window.Vehicle?.isDriving && window.Vehicle.carMesh)
            ? window.Vehicle.carMesh.position
            : playerPos;
        cameraController.update(delta, cameraTarget, camera);
    }

    minimap.update(playerPos, blips);
    missions.update(delta, playerPos);

    renderer.render(scene, camera);
}

animate();
