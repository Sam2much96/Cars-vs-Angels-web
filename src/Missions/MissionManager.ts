/**
 *
 * MissionManager
 *
 * Features:
 * (1) registers and stores all missions
 * (2) starts missions when player enters a trigger marker
 * (3) ticks the active mission every frame
 * (4) handles complete / fail callbacks and awards cash reward
 * (5) prevents starting a new mission while one is active
 * (6) tracks mission history (completed, failed, attempts)
 */
import * as THREE from 'three';
import type { MissionStatus } from './Mission';
import      { Mission }       from './Mission';
import { MissionHUD }     from './MissionHUD.ts';
import { MissionMarker }  from './MissionMarker';

export interface MissionRecord {
  id:        string;
  title:     string;
  status:    MissionStatus;
  attempts:  number;
  reward:    number;
}

export class MissionManager {
  private missions: Map<string, Mission>       = new Map();
  private history:  Map<string, MissionRecord> = new Map();
  private active:   Mission | null             = null;
  private hud:      MissionHUD;
  markers:          MissionMarker[]            = [];

  // Fires whenever a mission completes or fails — hook into this
  // from game.ts to update save data, unlock next missions, etc.
  onMissionComplete?: (record: MissionRecord) => void;
  onMissionFail?:     (record: MissionRecord) => void;

  constructor() {
    this.hud = new MissionHUD();
  }

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  /**
   * Register a mission so the manager can start and track it.
   * Must be called before any markers are placed.
   */
  register(mission: Mission) {
    this.missions.set(mission.id, mission);

    // Seed history record
    this.history.set(mission.id, {
      id:       mission.id,
      title:    mission.title,
      status:   'idle',
      attempts: 0,
      reward:   mission.reward,
    });

    // Wire complete callback
    mission.onComplete = () => {
      const record = this.history.get(mission.id)!;
      record.status = 'complete';

      // Award cash
      //window.playerCash = (window.playerCash ?? 0) + mission.reward;

      // Show pass screen
      this.hud.showResult('complete', mission.title, mission.reward);

      // Restore trigger markers for incomplete missions
      // but hide the one that just completed
      //t
        }
    }
}