// src/globals.d.ts
import type { Vehicle } from './src/Vehicle/Vehicle';
import type { Enemy } from "./src/Characters/Enemy2";
import type { Music } from './src/Music/Music';
import type * as THREE from 'three';
import type * as CANNON from 'cannon-es';

declare global {
  interface Window {
    Vehicle: Vehicle;
    Angel: Enemy;
    music: Music;
    scene: THREE.Scene;
    world: CANNON.World;
    camera: THREE.PerspectiveCamera;
  }
}