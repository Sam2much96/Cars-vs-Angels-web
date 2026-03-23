/**
 *
 * MissionMarker
 *
 * Features:
 * (1) places a pulsing cylinder marker in the world at a given position
 * (2) triggers a mission when the player walks into it
 * (3) shows a floating label above the marker
 * (4) supports show/hide for multi-step missions (pickup → dropoff etc.)
 */
import * as THREE from 'three';

export class MissionMarker {
  private mesh:        THREE.Group;
  private cylinder:    THREE.Mesh;
  private ring:        THREE.Mesh;
  private label:       THREE.Sprite | null = null;
  private missionId:   string;
  private radius:      number;
  private triggered:   boolean = false;
  private scene:       THREE.Scene;
  private color:       number;

  constructor(
    missionId: string,
    position:  THREE.Vector3,
    scene      = window.scene as THREE.Scene,
    radius     = 5,
    color      = 0xffff00,
    label?:    string,
  ) {
    this.missionId = missionId;
    this.radius    = radius;
    this.scene     = scene;
    this.color     = color;
    this.mesh      = new THREE.Group();

    // --- Main cylinder ---
    const cylGeo = new THREE.CylinderGeometry(radius, radius, 0.15, 32);
    const cylMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.cylinder = new THREE.Mesh(cylGeo, cylMat);
    this.mesh.add(this.cylinder);

    // --- Outer ring (slightly larger, thinner) ---
    const ringGeo = new THREE.RingGeometry(radius, radius + 0.5, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.ring = new THREE.Mesh(ringGeo, ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.2;
    this.mesh.add(this.ring);

    // --- Vertical beam (tall thin cylinder pointing up) ---
    const beamGeo = new THREE.CylinderGeometry(0.15, 0.15, 20, 8);
    const beamMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 10;
    this.mesh.add(beam);

    // --- Floating label sprite ---
    if (label) {
      this.label = this.createLabel(label, color);
      this.label.position.y = 22;
      this.mesh.add(this.label);
    }

    this.mesh.position.copy(position);
    scene.add(this.mesh);
  }

  /**
   * Call every frame from MissionManager.update()
   * Pulses the marker and checks if the player is close enough to trigger
   */
  update(
    playerPosition: THREE.Vector3,
    onEnter: (id: string) => void,
  ) {
    if (!this.mesh.visible) return;

    const t = performance.now() * 0.0025;

    // Pulse opacity
    (this.cylinder.material as THREE.MeshBasicMaterial).opacity =
      0.3 + Math.abs(Math.sin(t)) * 0.35;

    // Pulse ring scale
    const pulse = 1 + Math.sin(t * 1.5) * 0.06;
    this.ring.scale.set(pulse, pulse, pulse);

    // Rotate ring slowly
    this.ring.rotation.z += 0.005;

    // Check player proximity (XZ plane only — ignore height)
    const dx   = playerPosition.x - this.mesh.position.x;
    const dz   = playerPosition.z - this.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < this.radius && !this.triggered) {
      this.triggered = true;
      onEnter(this.missionId);
    }

    // Reset so failed missions can be re-triggered when player re-enters
    if (dist > this.radius + 2) {
      this.triggered = false;
    }
  }

  /**
   * Show or hide the marker — used by missions to reveal
   * dropoff markers only after pickup is collected, etc.
   */
  setVisible(visible: boolean) {
    this.mesh.visible = visible;
    // Reset trigger state when hidden so it fires correctly on re-show
    if (!visible) this.triggered = false;
  }

  /**
   * Move the marker to a new world position at runtime
   */
  setPosition(position: THREE.Vector3) {
    this.mesh.position.copy(position);
  }

  /**
   * Change the marker color — e.g. turn green when objective is nearby
   */
  setColor(color: number) {
    this.color = color;
    (this.cylinder.material as THREE.MeshBasicMaterial).color.setHex(color);
    (this.ring.material     as THREE.MeshBasicMaterial).color.setHex(color);
  }

  /**
   * Remove the marker from the scene entirely
   */
  remove(scene = this.scene) {
    scene.remove(this.mesh);
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }

  get id()      { return this.missionId; }
  get visible() { return this.mesh.visible; }
  get position() { return this.mesh.position; }

  // --- Private ---

  private createLabel(text: string, color: number): THREE.Sprite {
    const canvas  = document.createElement('canvas');
    canvas.width  = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Background pill
    const hex = '#' + color.toString(16).padStart(6, '0');
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 56, 12);
    ctx.fill();

    // Border
    ctx.strokeStyle = hex;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 56, 12);
    ctx.stroke();

    // Text
    ctx.fillStyle   = '#ffffff';
    ctx.font        = 'bold 22px sans-serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 34);

    const texture  = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const sprite   = new THREE.Sprite(spriteMat);
    sprite.scale.set(8, 2, 1);
    return sprite;
  }
}