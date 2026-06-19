import * as THREE from 'three';

export interface WeaponConfig {
    id:            string;
    name:          string;
    modelPath:     string;
    damage:        number;
    cooldown:      number;  // seconds between shots
    spread:        number;  // NDC ray jitter per shot
    shotCount:     number;  // pellets per trigger pull
    maxDistance:   number;  // world-unit raycast length
    soundPath:     string;
    crosshairSrc:  string;
    isAutomatic:   boolean; // hold to fire vs. click per shot
    // Position/rotation of the gun model in camera-local space
    modelPosition: THREE.Vector3;
    modelRotation: THREE.Euler;
    modelScale:    number;
    knockbackPitch: number; // radians of upward camera kick per shot
}

export const WEAPONS: WeaponConfig[] = [
    {
        id:           'gun1',
        name:         'Blaster',
        modelPath:    './gun1.glb',
        damage:       25,
        cooldown:     0.3,
        spread:       0.01,
        shotCount:    1,
        maxDistance:  100,
        soundPath:    '/blaster.ogg',
        crosshairSrc: './crosshair.png',
        isAutomatic:  false,
        modelPosition: new THREE.Vector3(0.22, -0.18, -0.55),
        modelRotation: new THREE.Euler(0, Math.PI, 0),
        modelScale:    0.3,
        knockbackPitch: 0.008,
    },
    {
        id:           'gun2',
        name:         'Repeater',
        modelPath:    './gun2.glb',
        damage:       15,
        cooldown:     0.1,
        spread:       0.025,
        shotCount:    1,
        maxDistance:  80,
        soundPath:    '/blaster_repeater.ogg',
        crosshairSrc: './crosshair-repeater.png',
        isAutomatic:  true,
        modelPosition: new THREE.Vector3(0.22, -0.18, -0.55),
        modelRotation: new THREE.Euler(0, Math.PI, 0),
        modelScale:    0.3,
        knockbackPitch: 0.004,
    },
];
