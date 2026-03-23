/**
 *
 * Minimap
 *
 * Features:
 * (1) renders a top-down orthographic view of the scene into a WebGLRenderTarget
 * (2) displays it as a circular HUD element in the bottom-left corner
 * (3) shows a player blip and optional entity blips (NPCs, angels, etc.)
 */
import * as THREE from 'three';

export class Minimap {
  private renderer:      THREE.WebGLRenderer;
  private scene:         THREE.Scene;
  private orthoCamera:   THREE.OrthographicCamera;
  private renderTarget:  THREE.WebGLRenderTarget;

  // HTML overlay elements
  private canvas:        HTMLCanvasElement;
  private ctx:           CanvasRenderingContext2D;
  private container:     HTMLDivElement;

  private mapSize  = 200;   // px — diameter of the circle
  private mapRange = 150;   // world units visible from center outward

  constructor(
    renderer = window.renderer as THREE.WebGLRenderer,
    scene    = window.scene    as THREE.Scene,
  ) {
    this.renderer = renderer;
    this.scene    = scene;

    // Orthographic camera looking straight down
    const r = this.mapRange;
    this.orthoCamera = new THREE.OrthographicCamera(-r, r, r, -r, 0.1, 1000);
    this.orthoCamera.rotation.x = -Math.PI / 2;
    this.orthoCamera.up.set(0, 0, -1); // top of map = north

    // Render target — scene renders into this texture
    this.renderTarget = new THREE.WebGLRenderTarget(512, 512, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });

    // Canvas overlay for the circular mask + blips
    this.canvas = document.createElement('canvas');
    this.canvas.width  = this.mapSize;
    this.canvas.height = this.mapSize;
    this.ctx = this.canvas.getContext('2d')!;

    // Container div — bottom left, matching GTA SA style
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 24px;
      width:  ${this.mapSize}px;
      height: ${this.mapSize}px;
      border-radius: 50%;
      overflow: hidden;
      border: 3px solid rgba(255,255,255,0.25);
      box-shadow: 0 0 0 2px rgba(0,0,0,0.6);
      z-index: 100;
      pointer-events: none;
    `;

    // img element — displays the rendered scene texture
    const img = document.createElement('img');
    img.id = 'minimap-img';
    img.style.cssText = `
      width: 100%; height: 100%;
      border-radius: 50%;
      display: block;
    `;
    this.container.appendChild(img);

    // Canvas sits on top for blips
    this.canvas.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      border-radius: 50%;
      pointer-events: none;
    `;
    this.container.appendChild(this.canvas);

    document.body.appendChild(this.container);
  }

  /**
   * Call every frame, passing the player's world position
   * and optional array of { position: THREE.Vector3, color: string } blips
   */
  update(
    playerPosition: THREE.Vector3,
    blips: { position: THREE.Vector3; color: string }[] = [],
  ) {
    // Position ortho camera directly above the player
    this.orthoCamera.position.set(
      playerPosition.x,
      playerPosition.y + 200,
      playerPosition.z,
    );
    this.orthoCamera.lookAt(playerPosition.x, playerPosition.y, playerPosition.z);

    // Render scene into render target
    const prevTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.scene, this.orthoCamera);
    this.renderer.setRenderTarget(prevTarget);

    // Copy render target pixels to a temp canvas and push to img element
    // We use a hidden canvas to read back the texture
    const readCanvas = document.createElement('canvas');
    readCanvas.width  = 512;
    readCanvas.height = 512;
    const readCtx = readCanvas.getContext('2d')!;
    const buffer  = new Uint8Array(512 * 512 * 4);
    this.renderer.readRenderTargetPixels(this.renderTarget, 0, 0, 512, 512, buffer);

    const imageData = readCtx.createImageData(512, 512);
    // WebGL renders bottom-up — flip vertically
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        const src = ((511 - y) * 512 + x) * 4;
        const dst = (y * 512 + x) * 4;
        imageData.data[dst]     = buffer[src];
        imageData.data[dst + 1] = buffer[src + 1];
        imageData.data[dst + 2] = buffer[src + 2];
        imageData.data[dst + 3] = buffer[src + 3];
      }
    }
    readCtx.putImageData(imageData, 0, 0);
    (document.getElementById('minimap-img') as HTMLImageElement).src = readCanvas.toDataURL();

    // Draw blips on the overlay canvas
    const ctx  = this.ctx;
    const half = this.mapSize / 2;
    ctx.clearRect(0, 0, this.mapSize, this.mapSize);

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.clip();

    // Draw entity blips
    for (const blip of blips) {
      const dx = blip.position.x - playerPosition.x;
      const dz = blip.position.z - playerPosition.z;
      const bx = half + (dx / this.mapRange) * half;
      const by = half + (dz / this.mapRange) * half;

      // Skip if outside circle
      if (Math.hypot(bx - half, by - half) > half) continue;

      ctx.beginPath();
      ctx.arc(bx, by, 4, 0, Math.PI * 2);
      ctx.fillStyle = blip.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Player blip — always centered, white arrow pointing forward
    ctx.beginPath();
    ctx.arc(half, half, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    // North label
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font      = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', half, 14);
  }

  /**
   * Adjust how much of the world the minimap shows
   */
  setRange(units: number) {
    this.mapRange = units;
    const r = units;
    this.orthoCamera.left   = -r;
    this.orthoCamera.right  =  r;
    this.orthoCamera.top    =  r;
    this.orthoCamera.bottom = -r;
    this.orthoCamera.updateProjectionMatrix();
  }

  destroy() {
    this.renderTarget.dispose();
    document.body.removeChild(this.container);
  }
}