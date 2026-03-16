// src/globals.d.ts
import type { Vehicle } from './src/Vehicle/Vehicle';
import {Human} from "./src/Characters/Human";
import type { Enemy } from "./src/Characters/Enemy";
import type { Music } from './src/Music/Music';
import type * as THREE from 'three';
import type * as CANNON from 'cannon-es';
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

declare global {
  interface Window {
    Vehicle: Vehicle;
    Angel: Enemy;
    player : Human;
    music: Music;
    scene: THREE.Scene;
    world: CANNON.World;
    loader : GLTFLoader
    camera: THREE.PerspectiveCamera;
    _builtinWater: any;
  }
}