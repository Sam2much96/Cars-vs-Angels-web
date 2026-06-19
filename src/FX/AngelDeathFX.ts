import * as THREE from 'three';

const PARTICLE_SECS = 1.6;
const PARTICLE_N    = 80;
const GRAVITY       = 6;

export function playAngelDeathFX(position: THREE.Vector3, scene: THREE.Scene): void {
    _screenFlash();
    _particleBurst(position, scene);
}

function _screenFlash(): void {
    const div = document.createElement('div');
    div.style.cssText =
        'position:fixed;inset:0;background:#fff8cc;opacity:0.85;pointer-events:none;' +
        'z-index:9999;transition:opacity 0.5s ease-out;';
    document.body.appendChild(div);
    requestAnimationFrame(() => { div.style.opacity = '0'; });
    setTimeout(() => div.remove(), 600);
}

function _particleBurst(origin: THREE.Vector3, scene: THREE.Scene): void {
    const positions = new Float32Array(PARTICLE_N * 3);
    const vel: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < PARTICLE_N; i++) {
        positions[i * 3]     = origin.x;
        positions[i * 3 + 1] = origin.y;
        positions[i * 3 + 2] = origin.z;

        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const speed = 4 + Math.random() * 9;
        vel.push({
            x: Math.sin(phi) * Math.cos(theta) * speed,
            y: Math.abs(Math.cos(phi)) * speed * 0.9 + 2,
            z: Math.sin(phi) * Math.sin(theta) * speed,
        });
    }

    const geo  = new THREE.BufferGeometry();
    const attr = new THREE.BufferAttribute(positions, 3);
    geo.setAttribute('position', attr);

    const mat = new THREE.PointsMaterial({
        color: 0xffdd44, size: 0.3, transparent: true, opacity: 1,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });

    const pts = new THREE.Points(geo, mat);
    scene.add(pts);

    const start = performance.now();
    const ox = origin.x, oy = origin.y, oz = origin.z;

    (function tick() {
        const t = (performance.now() - start) / 1000;
        if (t > PARTICLE_SECS) { scene.remove(pts); geo.dispose(); mat.dispose(); return; }

        const arr = attr.array as Float32Array;
        for (let i = 0; i < PARTICLE_N; i++) {
            arr[i * 3]     = ox + vel[i].x * t;
            arr[i * 3 + 1] = oy + vel[i].y * t - 0.5 * GRAVITY * t * t;
            arr[i * 3 + 2] = oz + vel[i].z * t;
        }
        attr.needsUpdate = true;
        mat.opacity = 1 - t / PARTICLE_SECS;

        requestAnimationFrame(tick);
    })();
}
