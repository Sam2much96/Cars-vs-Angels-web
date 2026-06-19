import * as THREE from 'three';
import type { GameContext } from '../core/context';
import { uiStore } from '../UI/ui-score';

const PICKUP_RADIUS = 3;
const REWARD        = 1000;
const BOB_SPEED     = 2.0;
const BOB_HEIGHT    = 0.4;
const SPIN_SPEED    = 1.5;

const SPAWN_POSITIONS: THREE.Vector3[] = [
    new THREE.Vector3(-109,  2,   22), // TEST — near player spawn, remove when done
    new THREE.Vector3( -80,  2,   50),
    new THREE.Vector3(  30,  2,  -10),
    new THREE.Vector3( -40,  2,  -70),
    new THREE.Vector3(  90,  2,   40),
    new THREE.Vector3( -20,  2,   90),
    new THREE.Vector3(  60,  2,  -50),
    new THREE.Vector3(-120,  2,   20),
    new THREE.Vector3(  10,  2,   60),
    new THREE.Vector3( -60,  2,  -30),
    new THREE.Vector3(  50,  2, -100),
];

interface GemInstance {
    mesh:      THREE.Object3D;
    baseY:     number;
    collected: boolean;
}

export class Gems {
    public readonly ready: Promise<void>;

    private static _template: THREE.Object3D | null   = null;
    private static _tplLoad:  Promise<void>   | null  = null;

    private readonly gems: GemInstance[] = [];
    private elapsed = 0;

    // Flash div reused for collect feedback
    private readonly _flash: HTMLDivElement;

    constructor(ctx: GameContext) {
        const { scene, loader } = ctx;

        this._flash = document.createElement('div');
        this._flash.style.cssText =
            'position:fixed;inset:0;background:#aaff44;opacity:0;pointer-events:none;' +
            'z-index:9998;transition:opacity 0.3s ease-out;';
        document.body.appendChild(this._flash);

        if (!Gems._tplLoad) {
            Gems._tplLoad = new Promise<void>((resolve, reject) => {
                loader.load(
                    './gem.glb',
                    (gltf) => { Gems._template = gltf.scene; resolve(); },
                    undefined,
                    (err) => { console.error('Gems: failed to load gem.glb', err); reject(err); },
                );
            });
        }

        this.ready = Gems._tplLoad.then(() => {
            for (const pos of SPAWN_POSITIONS) {
                const mesh = Gems._template!.clone();
                mesh.scale.setScalar(1.5);
                mesh.position.copy(pos);

                // Emissive tint so gems glow
                mesh.traverse((child) => {
                    if (child instanceof THREE.Mesh) {
                        const mats = Array.isArray(child.material) ? child.material : [child.material];
                        for (const mat of mats) {
                            if (mat instanceof THREE.MeshStandardMaterial) {
                                mat.emissive.set(0x44ffaa);
                                mat.emissiveIntensity = 0.8;
                            }
                        }
                    }
                });

                scene.add(mesh);
                this.gems.push({ mesh, baseY: pos.y, collected: false });
            }
        });
    }

    update(delta: number, scene: THREE.Scene): void {
        this.elapsed += delta;

        // Player and car positions for proximity check
        const playerPos = window.player?.body?.position;
        const carPos    = window.Vehicle?.isDriving ? window.Vehicle?.carBody?.position : null;

        for (const gem of this.gems) {
            if (gem.collected) continue;

            // Spin + bob
            gem.mesh.rotation.y += SPIN_SPEED * delta;
            gem.mesh.position.y  = gem.baseY + Math.sin(this.elapsed * BOB_SPEED + gem.baseY) * BOB_HEIGHT;

            // Proximity check against player or car
            const mx = gem.mesh.position.x;
            const mz = gem.mesh.position.z;

            let inRange = false;
            if (playerPos) {
                const dx = mx - playerPos.x, dz = mz - playerPos.z;
                if (Math.sqrt(dx * dx + dz * dz) < PICKUP_RADIUS) inRange = true;
            }
            if (!inRange && carPos) {
                const dx = mx - carPos.x, dz = mz - carPos.z;
                if (Math.sqrt(dx * dx + dz * dz) < PICKUP_RADIUS) inRange = true;
            }

            if (inRange) this._collect(gem, scene);
        }
    }

    private _collect(gem: GemInstance, scene: THREE.Scene): void {
        gem.collected = true;
        scene.remove(gem.mesh);
        uiStore.setCash(uiStore.getCash() + REWARD);
        this._playFlash();
    }

    private _playFlash(): void {
        this._flash.style.opacity = '0.6';
        requestAnimationFrame(() => { this._flash.style.opacity = '0'; });
    }
}
