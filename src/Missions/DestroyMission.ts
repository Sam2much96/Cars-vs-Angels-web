import * as THREE from 'three';
import { Mission } from './Mission';

export interface DestroyTarget {
  mesh:       THREE.Object3D;
  health:     number;
  maxHealth:  number;
  label:      string;
  destroyed:  boolean;
}

export class DestroyMission extends Mission {
  targets: DestroyTarget[];

  constructor({
    id, title, reward = 1000,
    targets,
    timeLimit = 180,
  }: {
    id: string;
    title: string;
    reward?: number;
    targets:   DestroyTarget[];
    timeLimit?: number;
  }) {
    super(id, title, reward);
    this.targets   = targets;
    this.timeLimit = timeLimit;

    this.objectives = targets.map(t => ({
      label:     `Destroy ${t.label}`,
      completed: false,
    }));
  }

  protected onStart() {}

  protected update(_delta: number) {
    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[i];
      if (!target.destroyed && target.health <= 0) {
        target.destroyed = true;
        this.objectives[i].completed = true;
        // Hide the mesh
        target.mesh.visible = false;
      }
    }
  }

  // Call this from your combat/collision system
  damageTarget(index: number, amount: number) {
    const target = this.targets[index];
    if (!target || target.destroyed) return;
    target.health = Math.max(0, target.health - amount);
  }

  protected onEnd() {}
}