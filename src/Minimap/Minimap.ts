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
import type { GameContext } from '../core/context';

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

  // Pre-allocated read-back resources — never recreated per frame
  private readonly TEX_SIZE: number;
  private readonly readCanvas: HTMLCanvasElement;
  private readonly readCtx:    CanvasRenderingContext2D;
  private readonly readBuffer: Uint8Array;

  // Throttle: only re-render the scene texture every N frames
  private frameCount   = 0;
  private readonly RENDER_EVERY: number;

  constructor(ctx: GameContext = window.ctx) {
    const { renderer, scene } = ctx;
    this.renderer = renderer;
    this.scene    = scene;

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    // Lower resolution on mobile — 128² is plenty for a 200px circle
    this.TEX_SIZE     = isMobile ? 128 : 256;
    this.RENDER_EVERY = isMobile ? 6   : 2;   // frames between full redraws

    // Pre-allocate once — avoids 1 MB garbage per frame from the old code
    this.readCanvas        = document.createElement('canvas');
    this.readCanvas.width  = this.TEX_SIZE;
    this.readCanvas.height = this.TEX_SIZE;
    this.readCtx           = this.readCanvas.getContext('2d')!;
    this.readBuffer        = new Uint8Array(this.TEX_SIZE * this.TEX_SIZE * 4);

    // Orthographic camera looking straight down
    const r = this.mapRange;
    this.orthoCamera = new THREE.OrthographicCamera(-r, r, r, -r, 0.1, 1000);
    this.orthoCamera.rotation.x = -Math.PI / 2;
    this.orthoCamera.up.set(0, 0, -1); // top of map = north

    // Render target at reduced resolution
    this.renderTarget = new THREE.WebGLRenderTarget(this.TEX_SIZE, this.TEX_SIZE, {
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
    this.frameCount++;

    // ── Expensive GPU work — throttled to every RENDER_EVERY frames ───────────
    if (this.frameCount % this.RENDER_EVERY === 0) {
      const S = this.TEX_SIZE;

      // Move ortho camera above player
      this.orthoCamera.position.set(playerPosition.x, playerPosition.y + 200, playerPosition.z);
      this.orthoCamera.lookAt(playerPosition.x, playerPosition.y, playerPosition.z);

      // Render scene into render target
      const prevTarget = this.renderer.getRenderTarget();
      this.renderer.setRenderTarget(this.renderTarget);
      this.renderer.render(this.scene, this.orthoCamera);
      this.renderer.setRenderTarget(prevTarget);

      // Read pixels into pre-allocated buffer (no allocation here)
      this.renderer.readRenderTargetPixels(this.renderTarget, 0, 0, S, S, this.readBuffer);

      // Flip vertically (WebGL is bottom-up) into pre-allocated canvas
      const imageData = this.readCtx.createImageData(S, S);
      const Sm1 = S - 1;
      for (let y = 0; y < S; y++) {
        const srcRow = (Sm1 - y) * S * 4;
        const dstRow = y * S * 4;
        for (let x = 0; x < S * 4; x++) {
          imageData.data[dstRow + x] = this.readBuffer[srcRow + x];
        }
      }
      this.readCtx.putImageData(imageData, 0, 0);
      (document.getElementById('minimap-img') as HTMLImageElement).src =
        this.readCanvas.toDataURL();
    }

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
      const rawBx = half + (dx / this.mapRange) * half;
      const rawBy = half + (dz / this.mapRange) * half;
      const distFromCenter = Math.hypot(rawBx - half, rawBy - half);
      const edgeMargin = 10;

      if (distFromCenter > half - edgeMargin) {
        // Off-map: draw an arrow at the circle edge pointing toward the target
        const angle = Math.atan2(rawBy - half, rawBx - half);
        const edgeR = half - edgeMargin;
        const ex = half + Math.cos(angle) * edgeR;
        const ey = half + Math.sin(angle) * edgeR;

        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(angle + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(5, 4);
        ctx.lineTo(-5, 4);
        ctx.closePath();
        ctx.fillStyle = blip.color;
        ctx.fill();
        ctx.restore();
      } else {
        // On-map: draw normal dot
        ctx.beginPath();
        ctx.arc(rawBx, rawBy, 4, 0, Math.PI * 2);
        ctx.fillStyle = blip.color;
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
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