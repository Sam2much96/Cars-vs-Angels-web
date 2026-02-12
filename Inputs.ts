import * as CANNON from "cannon-es";
import * as THREE from 'three';


// mobile input
// buggy: does not work and requires on screen debugging for better calibration
import Hammer from 'hammerjs';

//
// Mobile touchscreen
//
// Attach Hammer to the document body or a specific container
const hammer = new Hammer(document.body);

    // Enable swipe detection in all directions
hammer.get('swipe').set({ direction: Hammer.DIRECTION_ALL });



export function input(){
    /**
     * All game inputs
     * 
     * Features:
     * (1) key up and down keyboard presses
     * (2) mobile touch and gyroscope presses
     * 
     * To Do:
     * (1) decouple code base
     * 
     */
    // capture input
    if (!window.Vehicle.vehicle) return;
    if (!window.Vehicle.carBody) return;

    const GRAVITY = window.world.gravity.y;



    //console.log("Gravity debug: ", GRAVITY);
    
    // Keybindings
    // Add force on keydown
    document.addEventListener('keydown', (event) => {
          switch (event.key) {
            case 'w':
            case 'ArrowUp':
                if (GRAVITY == -10){
                window.Vehicle.vehicle!.applyEngineForce(-window.Vehicle.maxForce, 2)
                window.Vehicle.vehicle!.applyEngineForce(-window.Vehicle.maxForce, 3)
                 }
                else if (GRAVITY == 0){
                    // fly forward
                    window.Vehicle.carBody?.applyLocalForce(new CANNON.Vec3(-window.Vehicle.thrust, 0, 0), new CANNON.Vec3(0, 0, 0));
                }

              break

            case 's':
            case 'ArrowDown':
                if (GRAVITY == -10){
                window.Vehicle.vehicle?.applyEngineForce(window.Vehicle.maxForce, 2)
                window.Vehicle.vehicle?.applyEngineForce(window.Vehicle.maxForce, 3)
                }
                else if (GRAVITY == 0){
                    window.Vehicle.carBody?.applyLocalForce(new CANNON.Vec3(window.Vehicle.thrust, 0, 0), new CANNON.Vec3(0, 0, 0));
                }
              break

            case 'a':
            case 'ArrowLeft':
                if (GRAVITY == -10){
               window.Vehicle.vehicle?.setSteeringValue(window.Vehicle.maxSteerVal, 0)
               window.Vehicle.vehicle?.setSteeringValue(window.Vehicle.maxSteerVal, 1)
               }
               else if (GRAVITY == 0){
                window.Vehicle.carBody!.angularVelocity.y += window.Vehicle.turn;
               }
              break

            case 'd':
            case 'ArrowRight':
                if (GRAVITY == -10){
               window.Vehicle.vehicle?.setSteeringValue(-window.Vehicle.maxSteerVal, 0)
               window.Vehicle.vehicle?.setSteeringValue(-window.Vehicle.maxSteerVal, 1)
                }
                else if (GRAVITY == 0){
                    window.Vehicle.carBody!.angularVelocity.y -= window.Vehicle.turn;
                }
              break

            case 'space':
               window.Vehicle.vehicle?.setBrake(window.Vehicle.brakeForce, 0)
               window.Vehicle.vehicle?.setBrake(window.Vehicle.brakeForce, 1)
               window.Vehicle.vehicle?.setBrake(window.Vehicle.brakeForce, 2)
               window.Vehicle.vehicle?.setBrake(window.Vehicle.brakeForce, 3)
              break
            case "p":
              //console.log("setting gravity");
              window.world.gravity.set(0, 0, 0);
              //applyFlightControls(true);
              // apply lift to car 
              window.Vehicle.carBody?.applyLocalForce(new CANNON.Vec3(0, window.Vehicle.lift, 0), new CANNON.Vec3(0, 0, 0));
              break
          }
        })

    // Reset force on keyup
    document.addEventListener('keyup', (event) => {
        //carSfx.pause(); // pause sfx
          switch (event.key) {
            case 'w':
            case 'ArrowUp':
                // ground
                if (GRAVITY == -10) {
                window.Vehicle.vehicle?.applyEngineForce(0, 2)
                window.Vehicle.vehicle?.applyEngineForce(0, 3)
                }

                // air
                else if (GRAVITY == 0) {
                    window.Vehicle.carBody?.applyLocalForce(new CANNON.Vec3(0, 0, 0), new CANNON.Vec3(0, 0, 0));
                }

              break

            case 's':
            case 'ArrowDown':
                if (GRAVITY == -10){
              window.Vehicle.vehicle?.applyEngineForce(0, 2)
              window.Vehicle.vehicle?.applyEngineForce(0, 3)
                }
              break

            case 'a':
            case 'ArrowLeft':
              if (GRAVITY == -10) { 
              window.Vehicle.vehicle?.setSteeringValue(0, 0)
              window.Vehicle.vehicle?.setSteeringValue(0, 1)
              }
              break

            case 'd':
            case 'ArrowRight':
              if (GRAVITY == -10){
                window.Vehicle.vehicle?.setSteeringValue(0, 0)
              window.Vehicle.vehicle?.setSteeringValue(0, 1)
              }
              break

            case 'b':
              window.Vehicle.vehicle?.setBrake(0, 0)
              window.Vehicle.vehicle?.setBrake(0, 1)
              window.Vehicle.vehicle?.setBrake(0, 2)
              window.Vehicle.vehicle?.setBrake(0, 3)
              break
            case "o":
                // reset gravity
                //console.log("reseting world gravity");
                window.world.gravity.set(0, -10, 0);
                
                break
          }
        })


        

        // mobile steering
        window.addEventListener('deviceorientation', (event) => {
            const gamma = event.gamma; // left-right tilt
            const beta = event.beta;   // front-back tilt

            // Map gamma (-90..90) to steering
            const maxSteer = 0.5;
            const steer = THREE.MathUtils.clamp(gamma! / 45, -1, 1) * maxSteer;
            window.Vehicle.vehicle?.setSteeringValue(steer, 0);
            window.Vehicle.vehicle?.setSteeringValue(steer, 1);

            // Map beta to acceleration/brake
            const engineForce = 80000;
            const throttle = THREE.MathUtils.clamp(beta! / 45, -1, 1);
            window.Vehicle.vehicle?.applyEngineForce(-throttle * engineForce, 2);
            window.Vehicle.vehicle?.applyEngineForce(-throttle * engineForce, 3);
        });

        //swipe events
        // 
        hammer.on('swipe', (ev) => {
            console.log("Swipe detected!", ev.direction);

            if (!window.Vehicle) return;

            const maxSteer = 0.5; 
            const engineForce = 80000;

            switch(ev.direction) {
                case Hammer.DIRECTION_LEFT:
                    console.log("Swipe left → steer left");
                    window.Vehicle.vehicle?.setSteeringValue(maxSteer, 0); // front-left
                    window.Vehicle.vehicle?.setSteeringValue(maxSteer, 1); // front-right
                    break;
                case Hammer.DIRECTION_RIGHT:
                    console.log("Swipe right → steer right");
                    window.Vehicle.vehicle?.setSteeringValue(-maxSteer, 0);
                    window.Vehicle.vehicle?.setSteeringValue(-maxSteer, 1);
                    break;
                case Hammer.DIRECTION_UP:
                    console.log("Swipe up → accelerate");
                    window.Vehicle.vehicle?.applyEngineForce(-engineForce, 2);
                    window.Vehicle.vehicle?.applyEngineForce(-engineForce, 3);
                    break;
                case Hammer.DIRECTION_DOWN:
                    console.log("Swipe down → brake");
                    window.Vehicle.vehicle?.setBrake(5000, 0);
                    window.Vehicle.vehicle?.setBrake(5000, 1);
                    window.Vehicle.vehicle?.setBrake(5000, 2);
                    window.Vehicle.vehicle?.setBrake(5000, 3);
                    break;
            }
        });

        //reset on swipe end
        hammer.on('swipeend', (ev) => {
            if (!window.Vehicle.vehicle) return;
            // Reset steering and engine force
            window.Vehicle.vehicle.setSteeringValue(0, 0);
            window.Vehicle.vehicle.setSteeringValue(0, 1);
            window.Vehicle.vehicle.applyEngineForce(0, 2);
            window.Vehicle.vehicle.applyEngineForce(0, 3);
            window.Vehicle.vehicle.setBrake(0, 0);
            window.Vehicle.vehicle.setBrake(0, 1);
            window.Vehicle.vehicle.setBrake(0, 2);
            window.Vehicle.vehicle.setBrake(0, 3);
        });



    // mouse and mobile pointer
    document.addEventListener('pointerdown', () => {
    
    // accelerate

     if (GRAVITY == -10){
                window.Vehicle.vehicle?.applyEngineForce(-window.Vehicle.maxForce, 2)
                window.Vehicle.vehicle?.applyEngineForce(-window.Vehicle.maxForce, 3)
                 }
                else if (GRAVITY == 0){
                    // fly forward
                    window.Vehicle.carBody?.applyLocalForce(new CANNON.Vec3(-window.Vehicle.thrust, 0, 0), new CANNON.Vec3(0, 0, 0));
        }
});
document.addEventListener('pointerup', () => {
    //console.log("Released!");
    // stop accelerating

     if (GRAVITY == -10) {
        //ground    
        window.Vehicle.vehicle?.applyEngineForce(0, 2)
            window.Vehicle.vehicle?.applyEngineForce(0, 3)
            }

                // air
                else if (GRAVITY == 0) {
                    window.Vehicle.carBody?.applyLocalForce(new CANNON.Vec3(0, 0, 0), new CANNON.Vec3(0, 0, 0));
                }
});
}
