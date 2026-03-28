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
      public isDead : Boolean = false;
      private radius: number = 1; // fallback default
      public spawnpoint = new THREE.Vector3(-19, 26, 0.5);
      public ready : Promise<void>;
      public playerAnims  : THREE.AnimationMixer | null = null;
        clips               : THREE.AnimationClip[]       = [];
        currentAction       : THREE.AnimationAction | null = null;

      constructor(scene : THREE.Scene= window.scene, world: CANNON.World = window.world, loader : GLTFLoader = window.loader){
                // ------------------------------------------------------
                // (2) LOAD DODGE CHARGER MODEL
                // ------------------------------------------------------
                
        this.ready = new Promise((resolve) => {
                loader.load('./BiblicallyAcurateAngel.glb', 
                    (gltf) => {
                        this.AngelMesh = gltf.scene;
                        console.log("angel animation debug:", gltf.animations.map(a => a.name));
                        
                        scene.add(this.AngelMesh);

                            // Compute bounding box of the whole model
                    const box = new THREE.Box3().setFromObject(this.AngelMesh);
                    const sphere = new THREE.Sphere();
                    box.getBoundingSphere(sphere);

                    const shape = new CANNON.Sphere(this.radius);
                    this.body = new CANNON.Body({ 
                        mass: 10, 
                        shape: shape,
                        position: new CANNON.Vec3(this.spawnpoint.x, this.spawnpoint.y, this.spawnpoint.z),
                    });
                    world.addBody(this.body);

                    // Hit collision detection
                    // listen for collisions from only the Vehicle object class
                    this.body.addEventListener('collide', (e: Vehicle) => {
                        //const otherBody = e.carBody as CANNON.Body;
                        console.log('Enemy collided with vehicle:', e);
                        this.onCollide();
                    });

                    console.log("Angel mesh debug: ", this.AngelMesh);
                    resolve();
        
                    },
                    (progress) => {
                    const percent = progress.total > 0
                        ? Math.round((progress.loaded / progress.total) * 100)
                        : 0;
                    window.dispatchEvent(new CustomEvent("load-progress", {
                        detail: { percent, label: "Loading Angel character..." }
                    }));
                },
                (err) => console.error('CHARACTER LOAD ERROR:', err)
                
                
                )
        });

      
                

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

          //play the default angel animation
        //this.State()["FLOATING"]();
        this.playAnimation("Armature.001|Armature.001|Armature.002Action.002");
    }

    // ── ANIMATION ─────────────────────────────────────────────────────────────
    
    playAnimation(name: string, fadeTime: number = 0.2) {
            if (!this.playerAnims || this.isDead) return;
            const clip = THREE.AnimationClip.findByName(this.clips, name);
            if (!clip) { console.warn(`Animation "${name}" not found`); return; }
            const nextAction = this.playerAnims.clipAction(clip);
            if (this.currentAction === nextAction && this.currentAction.isRunning()) return;
            if (this.currentAction && this.currentAction !== nextAction) {
                this.currentAction.fadeOut(fadeTime);
            }
            nextAction.reset().fadeIn(fadeTime).play();
            this.currentAction = nextAction;
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

            "FLOATING" : () => {

                this.playAnimation("Armature.001|Armature.001|Armature.002Action.002");
            }
        
        }
    }
}