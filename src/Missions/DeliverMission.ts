import * as THREE from 'three';
import { Mission } from './Mission';
import { MissionMarker } from './MissionMarker';

export class DeliverMission extends Mission {
  private pickupMarker:  MissionMarker;
  private dropoffMarker: MissionMarker;
  private pickupPos:     THREE.Vector3;
  private dropoffPos:    THREE.Vector3;
  private hasPickedUp:   boolean = false;
  private playerPos:     () => THREE.Vector3;
  private scene:         THREE.Scene;

  constructor({
    id, title, reward = 500,
    pickupPosition,
    dropoffPosition,
    timeLimit = 120,
    playerPosition,
    scene = window.scene as THREE.Scene,
  }: {
    id: string;
    title: string;
    reward?: number;
    pickupPosition:  THREE.Vector3;
    dropoffPosition: THREE.Vector3;
    timeLimit?: number;
    playerPosition: () => THREE.Vector3;
    scene?: THREE.Scene;
  }) {
    super(id, title, reward);
    this.timeLimit  = timeLimit;
    this.playerPos  = playerPosition;
    this.scene      = scene;
    this.pickupPos  = pickupPosition;
    this.dropoffPos = dropoffPosition;

    this.objectives = [
      { label: 'Pick up the package',  completed: false },
      { label: 'Deliver the package',  completed: false },
    ];

    // Create world markers — dropoff hidden until pickup
    this.pickupMarker  = new MissionMarker('pickup',  pickupPosition,  scene, 4, 0x00ffff);
    this.dropoffMarker = new MissionMarker('dropoff', dropoffPosition, scene, 4, 0xff8800);
    this.dropoffMarker.setVisible(false);
  }

  protected onStart() {
    this.pickupMarker.setVisible(true);
  }

  protected update(delta: number) {
    const pos = this.playerPos();

    if (!this.hasPickedUp) {
      // Check pickup proximity
      if (pos.distanceTo(this.pickupPos) < 5) {
        this.hasPickedUp = true;
        this.objectives[0].completed = true;
        this.pickupMarker.setVisible(false);
        this.dropoffMarker.setVisible(true);
      }
    } else {
      // Check dropoff proximity
      if (pos.distanceTo(this.dropoffPos) < 5) {
        this.objectives[1].completed = true;
        this.dropoffMarker.setVisible(false);
      }
    }
  }

  protected onEnd() {
    this.pickupMarker.remove(this.scene);
    this.dropoffMarker.remove(this.scene);
  }
}