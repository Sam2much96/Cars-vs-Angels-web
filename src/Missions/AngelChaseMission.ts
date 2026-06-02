/**
 * AngelChaseMission
 *
 * The first playable mission.
 *
 * (1) Walk into the yellow marker near spawn to start
 * (2) The Angel teleports to the far corner of the map
 * (3) Get in the car, drive to it, and close within 10 units before time runs out
 * (4) Reward: $5,000
 */

import { Mission } from './Mission';

export class AngelChaseMission extends Mission {
    private readonly catchRadius: number;

    constructor({ catchRadius = 10 }: { catchRadius?: number } = {}) {
        super('angel-chase-1', 'Hunt the Angel', 5000);
        this.catchRadius = catchRadius;
        this.timeLimit   = 120;
        this.objectives  = [
            { label: 'Chase down and corner the Angel', completed: false },
        ];
    }

    protected onStart(): void {}

    protected update(_delta: number): void {
        const angelPos = window.Angel?.AngelMesh?.position;
        if (!angelPos) return;

        // Use vehicle position when driving, player position on foot
        const playerPos = window.Vehicle?.isDriving
            ? window.Vehicle?.carMesh?.position
            : window.player?.mesh?.position;

        if (!playerPos) return;

        if (playerPos.distanceTo(angelPos) < this.catchRadius) {
            this.completeObjectiveAt(0);
        }
    }

    protected onEnd(): void {}
}
