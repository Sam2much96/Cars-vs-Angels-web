/**
 * ScoutMission
 *
 * Drive to two checkpoints around the map in order.
 * Cyan disc markers appear at each target when the mission starts.
 *
 * (1) Walk into the blue marker near spawn to start
 * (2) Reach checkpoint A (disc disappears on arrival)
 * (3) Reach checkpoint B
 * (4) Reward: $3,000
 */

import * as THREE from 'three';
import { Mission } from './Mission';

// Tweak these positions to land on solid ground if needed
const CHECKPOINTS = [
    { pos: new THREE.Vector3(-60, 2, -40),  label: 'Checkpoint A' },
    { pos: new THREE.Vector3(30,  2,  80),  label: 'Checkpoint B' },
];

const REACH_RADIUS = 8;

export class ScoutMission extends Mission {
    private current = 0;
    private discs: THREE.Mesh[] = [];

    constructor() {
        super('scout-city-1', 'Scout the City', 3000);
        this.timeLimit  = 180;
        this.objectives = CHECKPOINTS.map(c => ({ label: `Reach ${c.label}`, completed: false }));
    }

    protected onStart(): void {
        this.current = 0;
        this.discs   = [];

        for (const { pos } of CHECKPOINTS) {
            const geo  = new THREE.CylinderGeometry(REACH_RADIUS * 0.9, REACH_RADIUS * 0.9, 0.25, 32);
            const mat  = new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
            const disc = new THREE.Mesh(geo, mat);
            disc.position.copy(pos);
            window.scene.add(disc);
            this.discs.push(disc);
        }
    }

    protected update(_delta: number): void {
        const playerPos = window.Vehicle?.isDriving
            ? window.Vehicle?.carMesh?.position
            : window.player?.mesh?.position;

        if (!playerPos || this.current >= CHECKPOINTS.length) return;

        const target = CHECKPOINTS[this.current];

        if (playerPos.distanceTo(target.pos) < REACH_RADIUS) {
            this.completeObjectiveAt(this.current);

            // Remove the disc for this checkpoint
            const disc = this.discs[this.current];
            if (disc) window.scene.remove(disc);

            this.current++;
        }
    }

    protected onEnd(): void {
        for (const disc of this.discs) window.scene.remove(disc);
        this.discs = [];
    }
}
