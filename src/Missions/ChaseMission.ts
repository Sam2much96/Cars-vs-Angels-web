import * as THREE from 'three';
import { Mission } from './Mission';

export class ChaseMission extends Mission {
  private targetMesh:    THREE.Object3D;
  private playerPos:     () => THREE.Vector3;
  private mode:          'chase' | 'evade';
  private catchRadius:   number;
  private evadeDuration: number;
  private evadeElapsed:  number = 0;
  private isCaught:      boolean = false;

  constructor({
    id, title, reward = 750,
    targetMesh,
    playerPosition,
    mode = 'chase',
    catchRadius   = 6,
    evadeDuration = 60,
    timeLimit     = 90,
  }: {
    id: string;
    title: string;
    reward?: number;
    targetMesh:     THREE.Object3D;
    playerPosition: () => THREE.Vector3;
    mode?:          'chase' | 'evade';
    catchRadius?:   number;
    evadeDuration?: number;
    timeLimit?:     number;
  }) {
    super(id, title, reward);
    this.targetMesh    = targetMesh;
    this.playerPos     = playerPosition;
    this.mode          = mode;
    this.catchRadius   = catchRadius;
    this.evadeDuration = evadeDuration;
    this.timeLimit     = timeLimit;

    this.objectives = mode === 'chase'
      ? [{ label: 'Catch the target',          completed: false }]
      : [{ label: `Evade for ${evadeDuration}s`, completed: false }];
  }

  protected onStart() {}

  protected update(delta: number) {
    const playerPos = this.playerPos();
    const dist = playerPos.distanceTo(this.targetMesh.position);

    if (this.mode === 'chase') {
      if (dist < this.catchRadius) {
        this.objectives[0].completed = true;
      }
    } else {
      // Evade mode — fail if target catches player
      if (dist < this.catchRadius) {
        this.fail('You were caught!');
        return;
      }
      this.evadeElapsed += delta;
      // Update label with countdown
      const remaining = Math.max(0, this.evadeDuration - this.evadeElapsed);
        this.objectives[0].label = `Evade for ${Math.ceil(remaining)}s`;
      if (this.evadeElapsed >= this.evadeDuration) {
        this.objectives[0].completed = true;
      }
    }
  }

  protected onEnd() {}
}