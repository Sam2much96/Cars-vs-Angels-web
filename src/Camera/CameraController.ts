import * as THREE from 'three';
import { InputManager } from '../UI/Inputs/InputManager';
import { CameraJoystick } from '../UI/Inputs/VirtualJoystick.tsx';

export class CameraController {
    yaw      = Math.PI; // start behind the player
    pitch    = 0.35;    // ~20° downward angle
    distance = 7;

    private readonly yawSpeed      = 2.0;
    private readonly pitchSpeed    = 1.5;
    private readonly pitchMin      = 0.05;
    private readonly pitchMax      = 1.3;
    private readonly mouseSensitivity = 0.004; // radians per pixel

    // Pending mouse delta — accumulated on mousemove, consumed in update()
    private _dx             = 0;
    private _dy             = 0;
    private _rightHeld      = false;

    constructor() {
        document.addEventListener('mousedown',    this._onDown);
        document.addEventListener('mouseup',      this._onUp);
        document.addEventListener('mousemove',    this._onMove);
        document.addEventListener('contextmenu',  this._onContext);
    }

    private readonly _onDown = (e: MouseEvent) => {
        if (e.button === 2) this._rightHeld = true;
    };
    private readonly _onUp = (e: MouseEvent) => {
        if (e.button === 2) this._rightHeld = false;
    };
    private readonly _onMove = (e: MouseEvent) => {
        // Skip when FPS mode has pointer lock — it owns the mouse there
        if (document.pointerLockElement) return;
        if (!this._rightHeld) return;
        this._dx += e.movementX;
        this._dy += e.movementY;
    };
    private readonly _onContext = (e: MouseEvent) => {
        // Suppress right-click menu so it doesn't interrupt camera drag
        if (this._rightHeld) e.preventDefault();
    };

    update(delta: number, target: THREE.Vector3, camera: THREE.PerspectiveCamera) {
        const axis = CameraJoystick.getAxis();

        // j/l = orbit left/right, i/k = tilt up/down, right-mouse drag = both
        this.yaw += (
            (InputManager.isKeyDown('KeyL') ? 1 : 0) -
            (InputManager.isKeyDown('KeyJ') ? 1 : 0) +
            axis.x
        ) * this.yawSpeed * delta - this._dx * this.mouseSensitivity;

        this.pitch = Math.max(this.pitchMin, Math.min(this.pitchMax,
            this.pitch + (
                (InputManager.isKeyDown('KeyK') ? 1 : 0) -
                (InputManager.isKeyDown('KeyI') ? 1 : 0) +
                axis.y
            ) * this.pitchSpeed * delta + this._dy * this.mouseSensitivity
        ));

        this._dx = 0;
        this._dy = 0;

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
