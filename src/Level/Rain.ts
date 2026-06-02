/**
 * Rain
 *
 * Particle rain that transitions between two visual modes as intensity rises:
 *
 *   0.00 → 0.45  dots  fade in   (THREE.Points)
 *   0.45 → 0.65  dots  fade out, streaks fade in  (crossfade)
 *   0.65 → 1.00  streaks at full opacity  (THREE.LineSegments)
 *
 * Intensity is driven externally by DayNightCycle.
 * Call fadeTo(target, delta) from DayNightCycle each frame.
 * Call update(delta, origin) from the game loop each frame.
 */

import * as THREE from 'three';
import type { GameContext } from '../core/context';

const DOT_OPACITY    = 0.55;
const STREAK_OPACITY = 0.55;

export class Rain {
    private readonly COUNT      : number;
    private readonly AREA       = 200;
    private readonly SPEED      = 45;
    private readonly STREAK_LEN = 1.8;

    // Per-particle positions (top of each drop)
    private readonly px: Float32Array;
    private readonly py: Float32Array;
    private readonly pz: Float32Array;

    // Points geometry (one vertex per drop)
    private readonly pointsPos : Float32Array;
    private readonly pointsGeo : THREE.BufferGeometry;
    private readonly pointsMat : THREE.PointsMaterial;
    private readonly pointsMesh: THREE.Points;

    // LineSegments geometry (two vertices per drop: top + bottom)
    private readonly streakPos : Float32Array;
    private readonly streakGeo : THREE.BufferGeometry;
    private readonly streakMat : THREE.LineBasicMaterial;
    private readonly streakMesh: THREE.LineSegments;

    // 0 = no rain, 1 = full heavy rain with streaks
    public intensity = 0;

    constructor(ctx: GameContext, count = 5000) {
        const { scene } = ctx;
        this.COUNT = count;

        this.px = new Float32Array(count);
        this.py = new Float32Array(count);
        this.pz = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            this.px[i] = (Math.random() - 0.5) * this.AREA;
            this.py[i] = Math.random() * 80;
            this.pz[i] = (Math.random() - 0.5) * this.AREA;
        }

        // ── Points ────────────────────────────────────────────────────────────
        this.pointsPos = new Float32Array(count * 3);
        this.pointsGeo = new THREE.BufferGeometry();
        this.pointsGeo.setAttribute('position', new THREE.BufferAttribute(this.pointsPos, 3));

        this.pointsMat = new THREE.PointsMaterial({
            color:       0xaaccff,
            size:        0.18,
            transparent: true,
            opacity:     0,
            depthWrite:  false,
        });

        this.pointsMesh = new THREE.Points(this.pointsGeo, this.pointsMat);
        this.pointsMesh.frustumCulled = false;
        this.pointsMesh.visible = false;
        scene.add(this.pointsMesh);

        // ── LineSegments ──────────────────────────────────────────────────────
        this.streakPos = new Float32Array(count * 6); // 2 verts × 3 floats
        this.streakGeo = new THREE.BufferGeometry();
        this.streakGeo.setAttribute('position', new THREE.BufferAttribute(this.streakPos, 3));

        this.streakMat = new THREE.LineBasicMaterial({
            color:       0xaaccff,
            transparent: true,
            opacity:     0,
            depthWrite:  false,
        });

        this.streakMesh = new THREE.LineSegments(this.streakGeo, this.streakMat);
        this.streakMesh.frustumCulled = false;
        this.streakMesh.visible = false;
        scene.add(this.streakMesh);
    }

    // ── Per-frame update ──────────────────────────────────────────────────────

    update(delta: number, origin: THREE.Vector3) {
        if (this.intensity <= 0) return;

        const drop = this.SPEED * delta;

        for (let i = 0; i < this.COUNT; i++) {
            this.py[i] -= drop;

            if (this.py[i] < 0) {
                this.px[i] = origin.x + (Math.random() - 0.5) * this.AREA;
                this.py[i] = 60 + Math.random() * 20;
                this.pz[i] = origin.z + (Math.random() - 0.5) * this.AREA;
            }

            // Points buffer
            const pi = i * 3;
            this.pointsPos[pi]     = this.px[i];
            this.pointsPos[pi + 1] = this.py[i];
            this.pointsPos[pi + 2] = this.pz[i];

            // Streaks buffer (top vertex, then bottom vertex)
            const si = i * 6;
            this.streakPos[si]     = this.px[i];
            this.streakPos[si + 1] = this.py[i];
            this.streakPos[si + 2] = this.pz[i];
            this.streakPos[si + 3] = this.px[i];
            this.streakPos[si + 4] = this.py[i] - this.STREAK_LEN;
            this.streakPos[si + 5] = this.pz[i];
        }

        // ── Opacity based on intensity thresholds ─────────────────────────────
        //   0.00 – 0.45  dots   fade in
        //   0.45 – 0.65  crossfade dots → streaks
        //   0.65 – 1.00  streaks at full opacity

        const t = this.intensity;

        const dotOpacity = t < 0.45
            ? (t / 0.45) * DOT_OPACITY
            : t < 0.65
                ? (1 - (t - 0.45) / 0.20) * DOT_OPACITY
                : 0;

        const strOpacity = t < 0.45
            ? 0
            : t < 0.65
                ? ((t - 0.45) / 0.20) * STREAK_OPACITY
                : STREAK_OPACITY;

        this.pointsMesh.visible   = dotOpacity > 0.01;
        this.streakMesh.visible   = strOpacity > 0.01;
        this.pointsMat.opacity    = dotOpacity;
        this.streakMat.opacity    = strOpacity;

        if (this.pointsMesh.visible)
            (this.pointsGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        if (this.streakMesh.visible)
            (this.streakGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    // ── Smooth intensity transition ───────────────────────────────────────────

    fadeTo(target: number, delta: number, speed = 0.8) {
        const diff = target - this.intensity;
        if (Math.abs(diff) < 0.001) {
            this.intensity = target;
        } else {
            this.intensity += diff * speed * delta;
        }

        if (this.intensity <= 0) {
            this.pointsMesh.visible = false;
            this.streakMesh.visible = false;
        }
    }
}
