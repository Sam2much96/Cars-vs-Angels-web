import * as THREE from 'three';
import type { GameContext } from '../core/context';
import type { NavGrid }     from '../Nav/NavGrid';
import { Enemy }            from './Enemy';

const SPAWN_POINTS: THREE.Vector3[] = [
    new THREE.Vector3(-80,  3,  60),
    new THREE.Vector3( 30,  3,  20),
    new THREE.Vector3(-40,  3, -80),
    new THREE.Vector3( 90,  3,  50),
    new THREE.Vector3(-150, 3, -40),
];

export class AngelSpawner {
    public readonly angels: Enemy[];
    public readonly ready:  Promise<void>;

    constructor(ctx: GameContext, count = SPAWN_POINTS.length) {
        const n = Math.min(count, SPAWN_POINTS.length);
        this.angels = Array.from({ length: n }, (_, i) =>
            new Enemy(ctx, `angel-${i}`, SPAWN_POINTS[i]),
        );
        this.ready = Promise.all(this.angels.map(a => a.ready)).then(() => {});
    }

    setNavGrid(grid: NavGrid): void {
        for (const angel of this.angels) {
            angel.setNavGrid(grid);

            // Move the physics body to the nearest walkable cell if it spawned
            // inside a building's inflated collision zone
            if (angel.body) {
                const cur  = new THREE.Vector3(
                    angel.body.position.x,
                    angel.body.position.y,
                    angel.body.position.z,
                );
                const safe = grid.snapToWalkable(cur);
                if (safe.distanceTo(cur) > 0.01) {
                    angel.body.position.set(safe.x, safe.y, safe.z);
                    angel.body.velocity.set(0, 0, 0);
                    angel.body.wakeUp();
                }
            }
        }
    }
}
