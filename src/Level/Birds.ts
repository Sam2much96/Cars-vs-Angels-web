import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { GameContext } from '../core/context';

// Orbital parameters — each bird gets its own centre, radius, altitude, and angular speed
const BIRD_CONFIGS = [
    { cx: -50, cz:  30, r: 80, alt: 32, speed: 0.20, phase: 0.0 },
    { cx:  20, cz: -40, r: 65, alt: 38, speed: 0.28, phase: 1.1 },
    { cx: -90, cz: -60, r: 55, alt: 26, speed: 0.35, phase: 2.3 },
    { cx:  70, cz:  50, r: 70, alt: 44, speed: 0.22, phase: 0.7 },
    { cx: -20, cz:  80, r: 45, alt: 30, speed: 0.40, phase: 3.5 },
    { cx:  30, cz: -20, r: 90, alt: 50, speed: 0.18, phase: 1.9 },
    { cx: -60, cz: -30, r: 60, alt: 36, speed: 0.30, phase: 4.2 },
    { cx:  50, cz:  70, r: 50, alt: 28, speed: 0.38, phase: 0.4 },
];

interface BirdInstance {
    mesh:    THREE.Object3D;
    mixer:   THREE.AnimationMixer;
    angle:   number;
    cfg:     typeof BIRD_CONFIGS[0];
}

export class Birds {
    public readonly ready: Promise<void>;

    private static _tpl: { scene: THREE.Object3D; clips: THREE.AnimationClip[] } | null = null;
    private static _tplLoad: Promise<void> | null = null;

    private readonly birds: BirdInstance[] = [];

    constructor(ctx: GameContext) {
        const { scene, loader } = ctx;

        if (!Birds._tplLoad) {
            Birds._tplLoad = new Promise<void>((resolve, reject) => {
                loader.load(
                    './bird.glb',
                    (gltf) => {
                        Birds._tpl = { scene: gltf.scene, clips: gltf.animations };
                        resolve();
                    },
                    undefined,
                    (err) => { console.error('Birds: failed to load bird.glb', err); reject(err); },
                );
            });
        }

        this.ready = Birds._tplLoad.then(() => {
            const tpl = Birds._tpl!;

            for (const cfg of BIRD_CONFIGS) {
                const mesh  = skeletonClone(tpl.scene);
                mesh.scale.setScalar(0.6);
                scene.add(mesh);

                const mixer = new THREE.AnimationMixer(mesh);

                // Use Flap as the default flying animation
                const flapClip = THREE.AnimationClip.findByName(tpl.clips, 'Flap');
                if (flapClip) mixer.clipAction(flapClip).play();

                const startAngle = cfg.phase;
                const x = cfg.cx + cfg.r * Math.cos(startAngle);
                const z = cfg.cz + cfg.r * Math.sin(startAngle);
                mesh.position.set(x, cfg.alt, z);

                this.birds.push({ mesh, mixer, angle: startAngle, cfg });
            }
        });
    }

    update(delta: number): void {
        for (const bird of this.birds) {
            bird.angle += bird.cfg.speed * delta;

            const { cx, cz, r, alt } = bird.cfg;
            const x = cx + r * Math.cos(bird.angle);
            const z = cz + r * Math.sin(bird.angle);

            bird.mesh.position.set(x, alt, z);

            // Face the direction of travel (tangent to circle)
            const tx = -Math.sin(bird.angle);
            const tz =  Math.cos(bird.angle);
            bird.mesh.rotation.y = Math.atan2(tx, tz);

            bird.mixer.update(delta);
        }
    }
}
