import * as THREE from 'three';
import { InputManager } from '../UI/Inputs/InputManager';
import { CameraJoystick } from '../UI/Inputs/VirtualJoystick.tsx';

export class CameraController {
    yaw      = Math.PI; // start behind the player
    pitch    = 0.35;    // ~20° downward angle
    distance = 7;

    private readonly yawSpeed   = 2.0;
    private readonly pitchSpeed = 1.5;
    private readonly pitchMin   = 0.05; // roughly eye-level
    private readonly pitchMax   = 1.3;  // ~75° overhead

    update(delta: number, target: THREE.Vector3, camera: THREE.PerspectiveCamera) {
        const axis = CameraJoystick.getAxis();

        // j/l = orbit left/right, i/k = tilt up/down
        this.yaw += (
            (InputManager.isKeyDown('KeyL') ? 1 : 0) -
            (InputManager.isKeyDown('KeyJ') ? 1 : 0) +
            axis.x
        ) * this.yawSpeed * delta;

        this.pitch = Math.max(this.pitchMin, Math.min(this.pitchMax,
            this.pitch + (
                (InputManager.isKeyDown('KeyK') ? 1 : 0) -
                (InputManager.isKeyDown('KeyI') ? 1 : 0) +
                axis.y
            ) * this.pitchSpeed * delta
        ));

        const sinY = Math.sin(this.yaw);
        const cosY = Math.cos(this.yaw);
        const cosP = Math.cos(this.pitch);
        const sinP = Math.sin(this.pitch);

        camera.position.set(
            target.x + sinY * cosP * this.distance,
            target.y + sinP * this.distance,
            target.z + cosY * cosP * this.distance,
        );
        camera.lookAt(target);
    }
}
