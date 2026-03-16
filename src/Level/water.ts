/**
 * 
 * Water
 * 
 * Features:
 * (1) loads the water mesh into the scene
 * (2) 
 */

import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';


//import * as THREE from 'three';
//import { Water } from 'three/addons/objects/Water.js';

export class Waters {
  constructor(loader = window.loader, scene = window.scene) {
    loader.load('./water_mesh.glb', (gltf) => {
      const water = gltf.scene;

      water.traverse((obj) => {
        if (obj instanceof THREE.Mesh === false) return;

        /**
        const waterSurface = new Water(obj.geometry, {
          textureWidth:  256,
          textureHeight: 256,
          waterNormals: new THREE.TextureLoader().load(
            'https://threejs.org/examples/textures/waternormals.jpg',
            (tex) => { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; }
          ),
          sunDirection: new THREE.Vector3(1, 1, 0).normalize(),
          sunColor: 0xffffff,
          waterColor: 0x001e0f,
          distortionScale: 3.5,
          fog: scene.fog !== undefined,
        });

        waterSurface.position.copy(obj.position);
        waterSurface.rotation.copy(obj.rotation);

        // Throttle the reflection pass — skip 2 out of every 3 frames
        const originalOnBeforeRender = waterSurface.onBeforeRender.bind(waterSurface);
        let reflFrame = 0;
        waterSurface.onBeforeRender = function(
        renderer, scene, camera, geometry, material, group
        ) {
        reflFrame++;
        if (reflFrame % 3 !== 0) return;
        originalOnBeforeRender(renderer, scene, camera, geometry, material, group);
        };

        scene.add(waterSurface);
        //window._builtinWater = waterSurface;

         */
        scene.add(water);
      });

    }, undefined, (err) => {
      console.error('WATER LOAD ERROR:', err);
    });
  }
}
