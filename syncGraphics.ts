/**
 * 
 * 
 * Physics Update Funtion for all 3d physics objects
 * 
 */


// for 3d mesh and texture rendering
import * as THREE from 'three';

// for 3d physics and collisions
import * as CANNON from "cannon-es";


// to do: (1) rewrite as static functions
export function syncCarGraphics() {
    /**
     * 
     * Features:
     * (1) syncs the car mesh with the Collision physics forces
     * 
     * bugs:
     * 
     * (1) buggy wheel rotation
     * (2) buggy camera positioning
     */
    if (!window.Vehicle.carMesh || !window.Vehicle.carBody || !window.Vehicle.vehicle) return; //guar clause

    // Sync chassis
    window.Vehicle.carMesh.position.copy(window.Vehicle.carBody.position).add(window.Vehicle?.carOffset); // sync car body with physics
    window.Vehicle.carMesh.quaternion.copy(window.Vehicle.carBody.quaternion).multiply(window.Vehicle.meshRotationOffset); //sync car rotation with colliision

    // Get wheel meshes in correct order: FL, FR, BL, BR
    const wheelMeshes = [
        window.Vehicle.carMesh?.getObjectByName("Círculo004"), // FL
        window.Vehicle.carMesh?.getObjectByName("Círculo005"), // FR
        window.Vehicle.carMesh?.getObjectByName("Círculo006"), // BL
        window.Vehicle.carMesh?.getObjectByName("Círculo007"), // BR
    ];

    // Per-wheel axis correction quaternions
    // Adjust X/Y/Z based on Blender export
    const leftWheelCorrection = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(-Math.PI / 2, Math.PI / 2, 0)
    );
    const rightWheelCorrection = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(-Math.PI / 2, Math.PI, 0) // mirror for right side
    );

    // Sync each wheel
    window.Vehicle.vehicle?.wheelInfos.forEach((wheel, i) => {
        const mesh = wheelMeshes[i];
        if (!mesh) return;

        // Update wheel physics transform
        window.Vehicle.vehicle?.updateWheelTransform(i);
        const wt = wheel.worldTransform;

        // Copy position
        //mesh.position.copy(wt.position);

        // Copy rotation safely
        const q = new THREE.Quaternion(
            wt.quaternion.x,
            wt.quaternion.y,
            wt.quaternion.z,
            wt.quaternion.w
        );

        // Apply per-wheel correction
        if (i === 0 || i === 2) {
            // FL / BL
            q.multiply(leftWheelCorrection);
        } else {
            // FR / BR
            q.multiply(rightWheelCorrection);
        }

        mesh.quaternion.copy(q);
    });
}


export function syncAngelGraphics(){

    if (!window.Angel || !window.Angel.body) return;
    window.Angel.AngelMesh?.position.copy(window.Angel.body.position);
    window.Angel.AngelMesh?.quaternion.copy(window.Angel.body.quaternion);



}