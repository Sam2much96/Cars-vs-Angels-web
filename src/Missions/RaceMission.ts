import * as THREE from 'three';
import { Mission } from './Mission';
import { MissionMarker } from './MissionMarker';

export class RaceMission extends Mission {
  private checkpoints:        THREE.Vector3[];
  private checkpointMarkers:  MissionMarker[];
  private currentCheckpoint:  number = 0;
  private playerPos:          () => THREE.Vector3;
  private scene:              THREE.Scene;

  constructor({
    id, title, reward = 600,
    checkpoints,
    playerPosition,
    timeLimit = 180,
    scene = window.scene as THREE.Scene,
  }: {
    id: string;
    title: string;
    reward?: number;
    checkpoints:    THREE.Vector3[];
    playerPosition: () => THREE.Vector3;
    timeLimit?:     number;
    scene?:         THREE.Scene;
  }) {
    super(id, title, reward);
    this.checkpoints = checkpoints;
    this.playerPos   = playerPosition;
    this.timeLimit   = timeLimit;
    this.scene       = scene;

    this.objectives = checkpoints.map((_, i) => ({
      label:     i === checkpoints.length - 1
        ? 'Reach the finish line'
        : `Checkpoint ${i + 1}`,
      completed: false,
    }));

    // Create checkpoint markers — only show the current one
    this.checkpointMarkers = checkpoints.map((pos, i) =>
      new MissionMarker(`cp_${i}`, pos, scene, 5,
        i === checkpoints.length - 1 ? 0xff2222 : 0xffff00
      )
    );

    // Hide all except first
    this.checkpointMarkers.forEach((m, i) => m.setVisible(i === 0));
  }

  protected onStart() {
    this.currentCheckpoint = 0;
    this.checkpointMarkers[0].setVisible(true);
  }

  protected update(_delta: number) {
    const pos = this.playerPos();
    const target = this.checkpoints[this.currentCheckpoint];
    if (!target) return;

    if (pos.distanceTo(target) < 6) {
      this.objectives[this.currentCheckpoint].completed = true;
      this.checkpointMarkers[this.currentCheckpoint].setVisible(false);
      this.currentCheckpoint++;

      if (this.currentCheckpoint < this.checkpoints.length) {
        this.checkpointMarkers[this.currentCheckpoint].setVisible(true);
      }
    }
  }

  protected onEnd() {
    this.checkpointMarkers.forEach(m => m.remove(this.scene));
  }
}