/**
 * 
 * 
 * Enemy 2 
 * 
 * Features: 
 * (1) enemy material
 * (2) proper state machine
 * (3) Hit collision detection
 * 
 * to do:
 * (1) enemy state machine
 * (2) enemy glow
 * (3) win and lose game conditional
 * (4) enemy attack
 */

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { uiStore } from '../UI/ui-score';
import { Vehicle } from '../Vehicle/Vehicle';


// temporarily disabled for refactoring
// Enemy states
//enum EnemyState {
//  IDLE = 'IDLE',
//  PATROL = 'PATROL',
//  CHASE = 'CHASE',
//  ATTACK = 'ATTACK',
//  STUNNED = 'STUNNED'
//}

export class Enemy {
        // Visual components
      public AngelMesh: THREE.Object3D  | null = null;
      public body?: CANNON.Body ;

      private radius: number = 1; // fallback default

      constructor(scene : THREE.Scene= window.scene, world: CANNON.World = window.world, loader : GLTFLoader = window.loader){
                // ------------------------------------------------------
                // (2) LOAD DODGE CHARGER MODEL
                // ------------------------------------------------------
                
                loader.load('./Angel.glb', (gltf) => {
                    this.AngelMesh = gltf.scene;
                    
                    this.AngelMesh.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            console.log("Mesh found:", child.name);
                            console.log("Material debug: ",child.material.map); // should NOT be null
                              const material = new THREE.MeshStandardMaterial({
                                color: 0x00ffe7,
                                emissive: new THREE.Color(0xff4500), // lava orange
                                emissiveIntensity: 10.0,
                                roughness: 0.3,
                                metalness: 0.1,
                            });

                            child.material = material;
                        } 
                    }
                );
            scene.add(this.AngelMesh);

                            // Compute bounding box of the whole model
            const box = new THREE.Box3().setFromObject(this.AngelMesh);
            const sphere = new THREE.Sphere();
            box.getBoundingSphere(sphere);

            const shape = new CANNON.Sphere(this.radius);
            this.body = new CANNON.Body({ 
                mass: 10, 
                shape: shape,
                position: new CANNON.Vec3(5, 2, 0),
            });
             world.addBody(this.body);

             // Hit collision detection
            // listen for collisions from only the Vehicle object class
            this.body.addEventListener('collide', (e: Vehicle) => {
                //const otherBody = e.carBody as CANNON.Body;
                console.log('Enemy collided with vehicle:', e);
                this.onCollide();
            });

            
            })


                

      }

    private onCollide(): void {
   
        /**
         * 3D Hit Collision Detection
         * 
         */
        //if (!window.Vehicle) return; 
        
        // check if it's the player by comparing body reference
        //if (otherBody === window.Vehicle.carBody) {
            console.log('Hit the player!');
            // deal damage, trigger stun, etc.
            // update the UI cash hud
            uiStore.setCash(uiStore.getCash() + 5);
            uiStore.setHealth(uiStore.getHealth() -1);


        //}
    }
    
    physicsProcess(){
        // sync angel mesh's position and rotation to the collision object's position & rotation
        if (!window.Angel || !window.Angel.body) return;
        window.Angel.AngelMesh?.position.copy(window.Angel.body.position);
        window.Angel.AngelMesh?.quaternion.copy(window.Angel.body.quaternion);

    }

    State(): Record<string, () => void>  {
    /**
     * Car vehicle Finine State Machine
     * @returns 
     * car state
     */

        return {
            "IDLE" : () => {

            },

            "FLOATING" : () => {}
        
        }
    }
}