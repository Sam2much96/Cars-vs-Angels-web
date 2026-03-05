/**
 * 
 * 
 * 
 * Inputs
 * 
 * Depreciated Input Class
 * 
 * Features:
 * (1) captures button inputss
 * (2) captures swipe inputs
 * 
 * to do:
 * 
 * (1) 
 */



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



export class Input{
    /**
     * to do:
     * (1) serialise input into a class with branches for mobile and pc controls
     * (2) export an update function for calling inputs by breaking down the code bloc below
     * 
     */

};
/**
 * 
 * 
 */

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
     * (2) Implement Touch UI  for touch mobile buttons
     * 
     * 
     * Bugs:
     * (1) Screen touch input is buggy
     * (2) input function should only register the player input and has no business applying force to the vehicle object
     * 
     */
    // capture input
    if (!window.Vehicle.vehicle || !window.Vehicle.carBody) return;

    const GRAVITY = window.Vehicle.gravity;//window.world.gravity.y;



    //console.log("Gravity debug: ", GRAVITY);
    
    // Keybindings
    // Add force on keydown

/**
 * 
 * 
 * document.addEventListener('keydown', e => {})
document.addEventListener('keyup', e => {})
document.addEventListener('mousemove', e => {})
document.addEventListener('mousedown', e => {})
document.addEventListener('mouseup', e => {})





 * 
 * 
 */

    document.addEventListener('keydown', (event) => {
          switch (event.key) {
            case 'w':
            case 'ArrowUp':
                if (GRAVITY === -10){
                window.Vehicle.vehicle!.applyEngineForce(-window.Vehicle.maxForce, 2)
                window.Vehicle.vehicle!.applyEngineForce(-window.Vehicle.maxForce, 3)
                 }
                else if (GRAVITY === 0){
                    // fly forward
                    window.Vehicle.carBody?.applyLocalForce(new CANNON.Vec3(-window.Vehicle.thrust, 0, 0), new CANNON.Vec3(0, 0, 0));
                }

              break

            case 's':
            case 'ArrowDown':
                if (GRAVITY === -10){
                window.Vehicle.vehicle?.applyEngineForce(window.Vehicle.maxForce, 2)
                window.Vehicle.vehicle?.applyEngineForce(window.Vehicle.maxForce, 3)
                }
                else if (GRAVITY == 0){
                    window.Vehicle.carBody?.applyLocalForce(new CANNON.Vec3(window.Vehicle.thrust, 0, 0), new CANNON.Vec3(0, 0, 0));
                }
              break

            case 'a':
            case 'ArrowLeft':
                if (GRAVITY === -10){
               window.Vehicle.vehicle?.setSteeringValue(window.Vehicle.maxSteerVal, 0)
               window.Vehicle.vehicle?.setSteeringValue(window.Vehicle.maxSteerVal, 1)
               }
               else if (GRAVITY === 0){
                window.Vehicle.carBody!.angularVelocity.y += window.Vehicle.turn;
               }
              break

            case 'd':
            case 'ArrowRight':
                if (GRAVITY === -10){
               window.Vehicle.vehicle?.setSteeringValue(-window.Vehicle.maxSteerVal, 0)
               window.Vehicle.vehicle?.setSteeringValue(-window.Vehicle.maxSteerVal, 1)
                }
                else if (GRAVITY === 0){
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
                if (GRAVITY === -10) {
                window.Vehicle.vehicle?.applyEngineForce(0, 2)
                window.Vehicle.vehicle?.applyEngineForce(0, 3)
                }

                // air
                else if (GRAVITY === 0) {
                    window.Vehicle.carBody?.applyLocalForce(new CANNON.Vec3(0, 0, 0), new CANNON.Vec3(0, 0, 0));
                }

              break

            case 's':
            case 'ArrowDown':
                if (GRAVITY === -10){
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
        hammer.on('swipeend', () => {
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




//function applyFlightControls(set: boolean) {
 //   if (!carBody) return;
 //   if (false) return;



    //if (keys["KeyW"]) carBody.applyLocalForce(new CANNON.Vec3(0, 0, -thrust), new CANNON.Vec3(0, 0, 0));
    //if (keys["KeyS"]) carBody.applyLocalForce(new CANNON.Vec3(0, 0, thrust), new CANNON.Vec3(0, 0, 0));
    //if (keys["KeyA"]) carBody.angularVelocity.y += turn;
    //if (keys["KeyD"]) carBody.angularVelocity.y -= turn;
    //if (keys["Space"]) carBody.applyLocalForce(new CANNON.Vec3(0, lift, 0), new CANNON.Vec3(0, 0, 0));
    //if (keys["ShiftLeft"]) carBody.applyLocalForce(new CANNON.Vec3(0, -lift, 0), new CANNON.Vec3(0, 0, 0));
//}




/**
 * Requests permission and initializes device orientation controls
 * @returns Promise that resolves to true if permission granted, false otherwise
 */
export async function initDeviceOrientationControls(): Promise<boolean> {
  try {
    // Check if DeviceOrientationEvent exists and has requestPermission (iOS 13+)
    if (typeof DeviceOrientationEvent !== 'undefined' && 
        typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      
      // Request permission (required for iOS 13+)
      const permission = await (DeviceOrientationEvent as any).requestPermission();
      
      if (permission === 'granted') {
        setupDeviceOrientationListener();
        return true;
      } else {
        console.warn('Device orientation permission denied');
        return false;
      }
    } else {
      // For browsers that don't require permission (Android, older iOS)
      setupDeviceOrientationListener();
      return true;
    }
  } catch (error) {
    console.error('Error requesting device orientation permission:', error);
    return false;
  }
}


/**
 * Sets up the device orientation event listener
 */
function setupDeviceOrientationListener(): void {
  window.addEventListener('deviceorientation', (event: DeviceOrientationEvent) => {
    const gamma = event.gamma; // left-right tilt (-90 to 90)
    const beta = event.beta;   // front-back tilt (-180 to 180)
    
    if (gamma === null || beta === null) {
      return; // Sensor data not available
    }
    
    // Map gamma (-90..90) to steering
    const maxSteer = 0.5;
    const steer = THREE.MathUtils.clamp(gamma / 45, -1, 1) * maxSteer;
    
    window.Vehicle.vehicle?.setSteeringValue(steer, 0);
    window.Vehicle.vehicle?.setSteeringValue(steer, 1);
    
    // Map beta to acceleration/brake
    const engineForce = 80000;
    const throttle = THREE.MathUtils.clamp(beta / 45, -1, 1);
    
    window.Vehicle.vehicle?.applyEngineForce(-throttle * engineForce, 2);
    window.Vehicle.vehicle?.applyEngineForce(-throttle * engineForce, 3);
  }, { passive: true }); // Add passive flag for better performance
}

// Example usage with a button click (required for iOS):
/*
const enableTiltButton = document.getElementById('enable-tilt-controls');
enableTiltButton?.addEventListener('click', async () => {
  const granted = await initDeviceOrientationControls();
  if (granted) {
    console.log('Tilt controls enabled');
    enableTiltButton.style.display = 'none';
  } else {
    alert('Please allow access to device orientation in your browser settings');
  }
});
*/