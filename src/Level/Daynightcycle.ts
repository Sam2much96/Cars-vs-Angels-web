/**
 * Day / Night Cycle
 *
 * Features:
 * (1) Moves a directional "sun" light along an arc
 * (2) Swaps HDR backgrounds for each time of day:
 *       day   → autumn_field_puresky_1k.hdr
 *       dusk  → mud_road_puresky_1k.hdr       (cloudy/golden hour)
 *       night → kloppenheim_07_puresky_1k.hdr
 * (3) Adjusts ambient and directional light intensity by time of day
 * (4) Exposes current time as a 0-1 normalised value and a HH:MM string
 *
 * Usage:
 *   const cycle = new DayNightCycle(scene, dirLight, ambientLight, renderer);
 *   await cycle.loadHDRs();   // call once before the game loop
 *   // in animate():
 *   cycle.update(delta);
 */

import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// ── Light intensity per phase ─────────────────────────────────────────────────

const AMBIENT_INTENSITY = {
    night:  0.05,
    dawn:   0.4,
    day:    1.5,
    dusk:   0.4,
};

const DIR_INTENSITY = {
    night:  0.0,
    dawn:   1.0,
    day:    5.0,
    dusk:   1.0,
};

// ── Which HDR is currently applied ───────────────────────────────────────────

type HDRSlot = "day" | "dusk" | "night";

// ─────────────────────────────────────────────────────────────────────────────

export class DayNightCycle {

    // How long one full day lasts in real seconds (default: 5 minutes)
    public dayDuration: number = 300;

    // Current time as 0–1 (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset)
    public timeOfDay: number = 0.25;

    private orbitRadius: number = 400;

    private scene:       THREE.Scene;
    private dirLight:    THREE.DirectionalLight;
    private ambient:     THREE.AmbientLight;
    private renderer:    THREE.WebGLRenderer;

    // Preloaded HDR textures
    private hdrs: Record<HDRSlot, THREE.Texture | null> = {
        day:   null,
        dusk:  null,
        night: null,
    };

    private currentHDR: HDRSlot | null = null;

    constructor(
        scene:       THREE.Scene,
        dirLight:    THREE.DirectionalLight,
        ambient:     THREE.AmbientLight,
        renderer:    THREE.WebGLRenderer,
        dayDurationSeconds: number = 300
    ) {
        this.scene    = scene;
        this.dirLight = dirLight;
        this.ambient  = ambient;
        this.renderer = renderer;
        this.dayDuration = dayDurationSeconds;
    }

    // ── Preload all three HDRs before the game loop starts ───────────────────

    async loadHDRs(): Promise<void> {

        const pmrem  = new THREE.PMREMGenerator(this.renderer);
        pmrem.compileEquirectangularShader();

        const loader = new RGBELoader();

        const load = async (path: string): Promise<THREE.Texture> => {
            const raw = await loader.loadAsync(path);
            raw.mapping = THREE.EquirectangularReflectionMapping;
            const envMap = pmrem.fromEquirectangular(raw).texture;
            raw.dispose();
            return envMap;
        };

        console.log("DayNightCycle: loading HDRs...");

        const [day, dusk, night] = await Promise.all([
            load("autumn_field_puresky_1k.hdr"),
            load("mud_road_puresky_1k.hdr"),
            load("kloppenheim_07_puresky_1k.hdr"),
        ]);

        this.hdrs.day   = day;
        this.hdrs.dusk  = dusk;
        this.hdrs.night = night;

        pmrem.dispose();

        console.log("DayNightCycle: HDRs ready.");

        // Apply the correct HDR immediately based on starting time
        this.applyHDR(this.getHDRSlot());

    }

    // ── Call once per frame with delta in seconds ─────────────────────────────

    update(delta: number): void {

        this.timeOfDay = (this.timeOfDay + delta / this.dayDuration) % 1;

        this.updateSunPosition();
        this.updateLighting();
        this.updateHDR();

    }

    // ── Returns time as "HH:MM" for the in-game clock ────────────────────────

    getTimeString(): string {

        const totalMinutes = Math.floor(this.timeOfDay * 24 * 60);
        const hours   = Math.floor(totalMinutes / 60) % 24;
        const minutes = totalMinutes % 60;

        return [
            hours  .toString().padStart(2, "0"),
            minutes.toString().padStart(2, "0"),
        ].join(":");

    }

    // ── HDR slot logic ────────────────────────────────────────────────────────
    //
    //   0.00 – 0.20  night
    //   0.20 – 0.30  dawn transition  (night → day)
    //   0.30 – 0.55  day
    //   0.55 – 0.70  dusk transition  (day → dusk)
    //   0.70 – 0.80  sunset           (dusk → night)
    //   0.80 – 1.00  night

    private getHDRSlot(): HDRSlot {

        const t = this.timeOfDay;

        if (t < 0.20) return "night";
        if (t < 0.30) return "day";   // sunrise — snap to day HDR
        if (t < 0.55) return "day";
        if (t < 0.70) return "dusk";  // golden hour / cloudy HDR
        if (t < 0.80) return "night"; // sunset into night
        return "night";

    }

    private updateHDR(): void {

        const slot = this.getHDRSlot();
        if (slot !== this.currentHDR) {
            this.applyHDR(slot);
        }

    }

    private applyHDR(slot: HDRSlot): void {

        const texture = this.hdrs[slot];
        if (!texture) return; // HDRs not loaded yet

        this.scene.background   = texture;
        this.scene.environment  = texture;
        this.currentHDR         = slot;

        console.log(`DayNightCycle: switched to ${slot} HDR`);

    }

    // ── Sun arc ───────────────────────────────────────────────────────────────

    private updateSunPosition(): void {

        const angle = (this.timeOfDay * Math.PI * 2) - Math.PI / 2;

        this.dirLight.position.set(
            Math.cos(angle) * this.orbitRadius,
            Math.sin(angle) * this.orbitRadius,
            0
        );

        this.dirLight.target.position.set(0, 0, 0);

    }

    // ── Light intensity ───────────────────────────────────────────────────────

    private updateLighting(): void {

        const t = this.timeOfDay;

        this.dirLight.intensity = this.lerpPhase(t,
            DIR_INTENSITY.night,
            DIR_INTENSITY.dawn,
            DIR_INTENSITY.day,
            DIR_INTENSITY.dusk
        );

        this.ambient.intensity = this.lerpPhase(t,
            AMBIENT_INTENSITY.night,
            AMBIENT_INTENSITY.dawn,
            AMBIENT_INTENSITY.day,
            AMBIENT_INTENSITY.dusk
        );

    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private lerpPhase(
        t: number,
        night: number, dawn: number, day: number, dusk: number
    ): number {

        if (t < 0.20) return night;
        if (t < 0.30) return THREE.MathUtils.lerp(night, dawn, (t - 0.20) / 0.10);
        if (t < 0.45) return THREE.MathUtils.lerp(dawn,  day,  (t - 0.30) / 0.15);
        if (t < 0.55) return day;
        if (t < 0.70) return THREE.MathUtils.lerp(day,   dusk, (t - 0.55) / 0.15);
        if (t < 0.80) return THREE.MathUtils.lerp(dusk,  night,(t - 0.70) / 0.10);
        return night;

    }

}