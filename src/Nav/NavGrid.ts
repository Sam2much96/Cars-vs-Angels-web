/**
 * NavGrid
 *
 * Builds a 2D walkability grid from the col_ box data exported by Buildings.ts,
 * then runs A* (8-directional, binary min-heap) to return world-space waypoints.
 *
 * Usage:
 *   const nav = new NavGrid(buildings.colBoxes, agentRadius);
 *   const path = nav.findPath(from, to);  // THREE.Vector3[]
 */

import * as THREE from 'three';

export interface ColBox {
    pos:   THREE.Vector3;
    scale: THREE.Vector3;
    quat:  THREE.Quaternion;
}

// ── Grid constants ────────────────────────────────────────────────────────────
const ORIGIN_X  = -200;
const ORIGIN_Z  = -200;
const EXTENT    = 400;   // world units covered on each axis
const CELL_SIZE = 2;     // world units per cell  →  200 × 200 = 40 k cells
const COLS = Math.ceil(EXTENT / CELL_SIZE);
const ROWS = Math.ceil(EXTENT / CELL_SIZE);
const N    = COLS * ROWS;

// 8-directional neighbours
const DIRS = [
    { dc:  1, dr:  0, cost: 1          },
    { dc: -1, dr:  0, cost: 1          },
    { dc:  0, dr:  1, cost: 1          },
    { dc:  0, dr: -1, cost: 1          },
    { dc:  1, dr:  1, cost: Math.SQRT2 },
    { dc:  1, dr: -1, cost: Math.SQRT2 },
    { dc: -1, dr:  1, cost: Math.SQRT2 },
    { dc: -1, dr: -1, cost: Math.SQRT2 },
];

// ── Binary min-heap (priority queue) ─────────────────────────────────────────
class MinHeap {
    private h: Array<[number, number]> = []; // [f-cost, cell-idx]

    push(f: number, idx: number): void {
        this.h.push([f, idx]);
        this._up(this.h.length - 1);
    }

    pop(): [number, number] {
        const top  = this.h[0];
        const last = this.h.pop()!;
        if (this.h.length > 0) { this.h[0] = last; this._down(0); }
        return top;
    }

    get size(): number { return this.h.length; }

    private _up(i: number): void {
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (this.h[p][0] <= this.h[i][0]) break;
            [this.h[p], this.h[i]] = [this.h[i], this.h[p]];
            i = p;
        }
    }

    private _down(i: number): void {
        const n = this.h.length;
        for (;;) {
            let s = i;
            const l = 2 * i + 1, r = 2 * i + 2;
            if (l < n && this.h[l][0] < this.h[s][0]) s = l;
            if (r < n && this.h[r][0] < this.h[s][0]) s = r;
            if (s === i) break;
            [this.h[s], this.h[i]] = [this.h[i], this.h[s]];
            i = s;
        }
    }
}

// ── NavGrid ───────────────────────────────────────────────────────────────────
export class NavGrid {
    private readonly grid: Uint8Array; // 0 = free, 1 = blocked

    // Reused working arrays — avoids GC churn on each findPath call
    private readonly _g      = new Float32Array(N);
    private readonly _f      = new Float32Array(N);
    private readonly _parent = new Int32Array(N);
    private readonly _closed = new Uint8Array(N);

    constructor(colBoxes: ColBox[], agentRadius = 1.0) {
        this.grid = new Uint8Array(N);
        for (const box of colBoxes) this._markBox(box, agentRadius);
    }

    // ── Grid building ─────────────────────────────────────────────────────────

    private _markBox(box: ColBox, inflate: number): void {
        // Half-extents of the Blender box (world scale / 2), inflated by agent radius
        const hx = box.scale.x / 2 + inflate;
        const hz = box.scale.z / 2 + inflate;

        // Compute XZ AABB of the (potentially rotated) box using the rotation matrix.
        // THREE.Matrix4 is column-major: elements[col*4 + row]
        // Row 0, Col 0 → e[0]  — X component of local-X axis in world space
        // Row 0, Col 2 → e[8]  — X component of local-Z axis in world space
        // Row 2, Col 0 → e[2]  — Z component of local-X axis in world space
        // Row 2, Col 2 → e[10] — Z component of local-Z axis in world space
        const e    = new THREE.Matrix4().makeRotationFromQuaternion(box.quat).elements;
        const aabx = Math.abs(e[0]) * hx + Math.abs(e[8])  * hz;
        const aabz = Math.abs(e[2]) * hx + Math.abs(e[10]) * hz;

        const c0 = Math.max(0,       Math.floor((box.pos.x - aabx - ORIGIN_X) / CELL_SIZE));
        const c1 = Math.min(COLS-1,  Math.ceil ((box.pos.x + aabx - ORIGIN_X) / CELL_SIZE));
        const r0 = Math.max(0,       Math.floor((box.pos.z - aabz - ORIGIN_Z) / CELL_SIZE));
        const r1 = Math.min(ROWS-1,  Math.ceil ((box.pos.z + aabz - ORIGIN_Z) / CELL_SIZE));

        for (let r = r0; r <= r1; r++)
            for (let c = c0; c <= c1; c++)
                this.grid[r * COLS + c] = 1;
    }

    // ── Coordinate helpers ────────────────────────────────────────────────────

    private _toCell(x: number, z: number): [number, number] {
        return [
            Math.floor((x - ORIGIN_X) / CELL_SIZE),
            Math.floor((z - ORIGIN_Z) / CELL_SIZE),
        ];
    }

    private _toWorld(c: number, r: number, y: number): THREE.Vector3 {
        return new THREE.Vector3(
            ORIGIN_X + (c + 0.5) * CELL_SIZE,
            y,
            ORIGIN_Z + (r + 0.5) * CELL_SIZE,
        );
    }

    private _walkable(c: number, r: number): boolean {
        return c >= 0 && c < COLS && r >= 0 && r < ROWS && this.grid[r * COLS + c] === 0;
    }

    /**
     * Returns the centre of the nearest walkable cell to `pos`.
     * If `pos` is already in a walkable cell it is returned unchanged (y preserved).
     * Searches outward in expanding squares up to `maxSearch` cells away.
     */
    snapToWalkable(pos: THREE.Vector3, maxSearch = 10): THREE.Vector3 {
        let [c, r] = this._toCell(pos.x, pos.z);
        c = Math.max(0, Math.min(COLS - 1, c));
        r = Math.max(0, Math.min(ROWS - 1, r));

        if (this._walkable(c, r)) return this._toWorld(c, r, pos.y);

        for (let d = 1; d <= maxSearch; d++) {
            for (let dc = -d; dc <= d; dc++) {
                for (let dr = -d; dr <= d; dr++) {
                    if (this._walkable(c + dc, r + dr))
                        return this._toWorld(c + dc, r + dr, pos.y);
                }
            }
        }

        return pos.clone(); // no walkable cell found nearby — leave unchanged
    }

    private _octile(c1: number, r1: number, c2: number, r2: number): number {
        const dx = Math.abs(c1 - c2), dz = Math.abs(r1 - r2);
        return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
    }

    // ── A* ────────────────────────────────────────────────────────────────────

    findPath(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
        let [sc, sr] = this._toCell(from.x, from.z);
        let [ec, er] = this._toCell(to.x,   to.z);

        // Clamp to grid
        sc = Math.max(0, Math.min(COLS-1, sc));
        sr = Math.max(0, Math.min(ROWS-1, sr));
        ec = Math.max(0, Math.min(COLS-1, ec));
        er = Math.max(0, Math.min(ROWS-1, er));

        // If start or end cell is blocked (inside inflated obstacle zone), nudge to nearest free cell
        if (!this._walkable(sc, sr)) {
            outer1: for (let d = 1; d <= 5; d++) {
                for (let dc = -d; dc <= d; dc++) for (let dr = -d; dr <= d; dr++) {
                    if (this._walkable(sc + dc, sr + dr)) { sc += dc; sr += dr; break outer1; }
                }
            }
        }
        if (!this._walkable(ec, er)) {
            outer2: for (let d = 1; d <= 5; d++) {
                for (let dc = -d; dc <= d; dc++) for (let dr = -d; dr <= d; dr++) {
                    if (this._walkable(ec + dc, er + dr)) { ec += dc; er += dr; break outer2; }
                }
            }
        }

        if (sc === ec && sr === er) return [to.clone()];

        // Reset working arrays
        this._g.fill(Infinity);
        this._f.fill(Infinity);
        this._parent.fill(-1);
        this._closed.fill(0);

        const startIdx = sr * COLS + sc;
        const endIdx   = er * COLS + ec;
        this._g[startIdx] = 0;
        this._f[startIdx] = this._octile(sc, sr, ec, er);

        const open = new MinHeap();
        open.push(this._f[startIdx], startIdx);

        while (open.size > 0) {
            const [, curr] = open.pop();
            if (curr === endIdx) return this._reconstruct(endIdx, to);
            if (this._closed[curr]) continue;
            this._closed[curr] = 1;

            const cc = curr % COLS;
            const cr = (curr / COLS) | 0;

            for (const { dc, dr, cost } of DIRS) {
                const nc = cc + dc, nr = cr + dr;
                if (!this._walkable(nc, nr)) continue;
                const ni = nr * COLS + nc;
                if (this._closed[ni]) continue;
                const ng = this._g[curr] + cost;
                if (ng < this._g[ni]) {
                    this._g[ni]      = ng;
                    this._f[ni]      = ng + this._octile(nc, nr, ec, er);
                    this._parent[ni] = curr;
                    open.push(this._f[ni], ni);
                }
            }
        }

        return []; // unreachable
    }

    private _reconstruct(endIdx: number, to: THREE.Vector3): THREE.Vector3[] {
        const raw: THREE.Vector3[] = [];
        let curr = endIdx;
        while (curr !== -1) {
            const c = curr % COLS;
            const r = (curr / COLS) | 0;
            raw.push(this._toWorld(c, r, to.y));
            curr = this._parent[curr];
        }
        raw.reverse();
        if (raw.length > 0) raw[raw.length - 1] = to.clone();
        return this._pullString(raw);
    }

    // Simple waypoint reduction: keep every 3rd point + first + last
    private _pullString(path: THREE.Vector3[]): THREE.Vector3[] {
        if (path.length <= 3) return path;
        const out = [path[0]];
        for (let i = 3; i < path.length - 1; i += 3) out.push(path[i]);
        out.push(path[path.length - 1]);
        return out;
    }
}
