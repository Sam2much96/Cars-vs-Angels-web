import type * as THREE from 'three';
import type * as CANNON from 'cannon-es';
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface GameContext {
    scene:    THREE.Scene;
    world:    CANNON.World;
    loader:   GLTFLoader;
    camera:   THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
}
