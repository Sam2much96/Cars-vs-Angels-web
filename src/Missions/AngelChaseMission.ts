/**
 * AngelChaseMission
 *
 * (1) Walk into the yellow marker near spawn to start
 * (2) Hunt down and kill the Angel before time runs out
 * (3) Reward: $5,000
 *
 * The angel spawns at a random city position and is static (no nav grid),
 * making it a fixed target the player must find and eliminate.
 */

import * as THREE from 'three';
import { Mission } from './Mission';
import { Enemy }   from '../Characters/Enemy';
import type { GameContext } from '../core/context';

const SPAWN_POINTS: THREE.Vector3[] = [
    new THREE.Vector3( -60, 4,  80),
    new THREE.Vector3(  50, 4, -30),
    new THREE.Vector3(-120, 4, -60),
    new THREE.Vector3(  70, 4, 100),
    new THREE.Vector3( -30, 4, -120),
    new THREE.Vector3( 100, 4, -80),
    new THREE.Vector3(  20, 4,  60),
    new THREE.Vector3( -90, 4,  10),
];

export class AngelChaseMission extends Mission {
    private readonly ctx: GameContext;
    private angel: Enemy | null = null;

    private readonly _onDefeated = () => {
        if (!this.isActive) return;
        this.completeObjectiveAt(0);
    };

    constructor(ctx: GameContext) {
        super('angel-chase-1', 'Hunt the Angel', 5000);
        this.ctx       = ctx;
        this.timeLimit = 120;
        this.objectives = [{ label: 'Kill the Angel', completed: false }];
    }

    protected onStart(): void {
        window.addEventListener('angel-defeated', this._onDefeated);

        const spawnPoint = SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
        const angel = new Enemy(this.ctx, 'hunt-angel', spawnPoint);
        this.angel = angel;

        // Don't call setNavGrid — angel stays static
        angel.ready.then(() => {
            if (!this.isActive) { angel.silentRemove(); return; }
            window.angels = [angel];
        });
    }

    protected update(_delta: number): void {}

    protected onEnd(): void {
        window.removeEventListener('angel-defeated', this._onDefeated);
        for (const a of window.angels) a.silentRemove();
        window.angels = [];
        this.angel = null;
    }
}
