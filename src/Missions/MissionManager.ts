/**
 * MissionManager
 *
 * (1) Register missions and bind their complete/fail callbacks
 * (2) Place world markers that trigger missions when the player enters
 * (3) Tick the active mission every frame and drive the HUD
 * (4) Award cash on completion via uiStore
 * (5) Allow retry after failure by re-entering the marker
 */

import * as THREE from 'three';
import type { MissionStatus } from './Mission';
import      { Mission }       from './Mission';
import { MissionHUD }    from './MissionHUD.ts';
import { MissionMarker } from './MissionMarker';
import { uiStore }       from '../UI/ui-score';

export interface MissionRecord {
    id:       string;
    title:    string;
    status:   MissionStatus;
    attempts: number;
    reward:   number;
}

export class MissionManager {
    private missions: Map<string, Mission>       = new Map();
    private history:  Map<string, MissionRecord> = new Map();
    private active:   Mission | null             = null;
    private hud:      MissionHUD;
    private markers:  MissionMarker[]            = [];

    onMissionComplete?: (record: MissionRecord) => void;
    onMissionFail?:     (record: MissionRecord) => void;

    constructor() {
        this.hud = new MissionHUD();
    }

    // ── Registration ───────────────────────────────────────────────────────────

    register(mission: Mission) {
        this.missions.set(mission.id, mission);
        this.history.set(mission.id, {
            id:       mission.id,
            title:    mission.title,
            status:   'idle',
            attempts: 0,
            reward:   mission.reward,
        });

        mission.onComplete = () => {
            const record = this.history.get(mission.id)!;
            record.status = 'complete';

            uiStore.setCash(uiStore.getCash() + mission.reward);
            this.hud.showResult('complete', mission.title, mission.reward);
            this.hud.setMission(null);
            this.active = null;

            // Hide this mission's markers permanently
            for (const m of this.markers) {
                if (m.id === mission.id) m.setVisible(false);
            }

            this.onMissionComplete?.(record);
        };

        mission.onFail = () => {
            const record = this.history.get(mission.id)!;
            record.status = 'failed';

            this.hud.showResult('failed', mission.title, 0, mission.failReason);
            this.hud.setMission(null);
            this.active = null;

            // Keep markers visible so the player can retry
            this.onMissionFail?.(record);
        };
    }

    // ── Marker placement ───────────────────────────────────────────────────────

    addMarker(
        missionId: string,
        position:  THREE.Vector3,
        label?:    string,
        color      = 0xffff00,
        radius     = 5,
    ): MissionMarker {
        const marker = new MissionMarker(missionId, position, window.scene, radius, color, label);
        this.markers.push(marker);
        return marker;
    }

    // ── Manual start (called by marker trigger) ────────────────────────────────

    start(id: string): boolean {
        if (this.active) return false; // one mission at a time

        const mission = this.missions.get(id);
        if (!mission) return false;
        if (mission.isComplete) return false; // can't replay completed missions

        const record = this.history.get(id)!;
        record.attempts++;
        record.status = 'active';

        this.active = mission;
        mission.start();
        this.hud.setMission(mission);
        return true;
    }

    // ── Per-frame update ───────────────────────────────────────────────────────

    update(delta: number, playerPosition: THREE.Vector3) {
        // Tick the active mission and keep HUD in sync
        if (this.active?.isActive) {
            this.active.tick(delta);
            this.hud.update(this.active);
        }

        // Update markers — they fire start() when the player steps in
        for (const marker of this.markers) {
            marker.update(playerPosition, (id) => this.start(id));
        }
    }

    // ── Accessors ──────────────────────────────────────────────────────────────

    getActive()  { return this.active; }
    getHistory() { return Array.from(this.history.values()); }

    destroy() {
        this.hud.destroy();
        for (const m of this.markers) m.remove();
        this.markers = [];
    }
}
