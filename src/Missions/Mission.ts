/**
 *
 * Mission (base class)
 *
 * Features:
 * (1) base class for all mission types — extend this for each mission
 * (2) tracks objectives, timer, status and reward
 * (3) emits onComplete / onFail callbacks consumed by MissionManager
 * (4) subclasses implement onStart(), update(), onEnd()
 */

export type MissionStatus = 'idle' | 'active' | 'complete' | 'failed';

export interface MissionObjective {
  label:     string;
  completed: boolean;
}

export abstract class Mission {
  // Identity
  readonly id:     string;
  readonly title:  string;
  readonly reward: number;

  // State
  status:     MissionStatus = 'idle';
  objectives: MissionObjective[] = [];

  // Timer — set to a number (seconds) to enable countdown, null = no limit
  timeLimit:  number | null = null;
  elapsed:    number = 0;

  // Fail reason shown in HUD
  failReason: string = 'Mission failed';

  // Set by MissionManager after register()
  onComplete?: () => void;
  onFail?:     () => void;

  constructor(id: string, title: string, reward = 0) {
    this.id     = id;
    this.title  = title;
    this.reward = reward;
  }

  // -------------------------------------------------------------------------
  // Public API — called by MissionManager
  // -------------------------------------------------------------------------

  /**
   * Starts the mission. Resets timer and calls subclass onStart().
   * Safe to call again after a failed attempt.
   */
  start() {
    if (this.status === 'complete') return; // can't restart a completed mission
    this.status     = 'active';
    this.elapsed    = 0;
    this.failReason = 'Mission failed';

    // Reset all objectives so the mission can be retried after failure
    for (const obj of this.objectives) {
      obj.completed = false;
    }

    this.onStart();
  }

  /**
   * Called every frame by MissionManager while status === 'active'.
   * Handles timer and delegates logic to subclass update().
   */
  tick(delta: number) {
    if (this.status !== 'active') return;

    // Advance timer
    if (this.timeLimit !== null) {
      this.elapsed += delta;
      if (this.elapsed >= this.timeLimit) {
        this.fail("Time's up!");
        return;
      }
    }

    // Delegate to subclass
    this.update(delta);

    // Auto-complete when all objectives are done
    if (
      this.objectives.length > 0 &&
      this.objectives.every(o => o.completed)
    ) {
      this.complete();
    }
  }

  /**
   * Marks the mission as passed, fires onComplete callback.
   */
  complete() {
    if (this.status !== 'active') return;
    this.status = 'complete';
    this.onEnd();
    this.onComplete?.();
  }

  /**
   * Marks the mission as failed with an optional reason, fires onFail callback.
   */
  fail(reason = 'Mission failed') {
    if (this.status !== 'active') return;
    this.status     = 'failed';
    this.failReason = reason;
    this.onEnd();
    this.onFail?.();
  }

  // -------------------------------------------------------------------------
  // Convenience getters
  // -------------------------------------------------------------------------

  /**
   * Seconds remaining on the countdown timer.
   * Returns null if this mission has no time limit.
   */
  get timeRemaining(): number | null {
    if (this.timeLimit === null) return null;
    return Math.max(0, this.timeLimit - this.elapsed);
  }

  /**
   * Progress as a 0–1 fraction based on completed objectives.
   */
  get progress(): number {
    if (this.objectives.length === 0) return 0;
    return this.objectives.filter(o => o.completed).length / this.objectives.length;
  }

  /**
   * How many objectives are still pending.
   */
  get remainingObjectives(): number {
    return this.objectives.filter(o => !o.completed).length;
  }

  get isActive():   boolean { return this.status === 'active';   }
  get isComplete(): boolean { return this.status === 'complete'; }
  get isFailed():   boolean { return this.status === 'failed';   }
  get isIdle():     boolean { return this.status === 'idle';     }

  // -------------------------------------------------------------------------
  // Subclass interface — must be implemented by every mission type
  // -------------------------------------------------------------------------

  /**
   * Called once when the mission starts.
   * Use to show markers, spawn NPCs, play intro audio, etc.
   */
  protected abstract onStart(): void;

  /**
   * Called every frame while the mission is active (after timer check).
   * Use to check proximity, NPC states, collision results, etc.
   */
  protected abstract update(delta: number): void;

  /**
   * Called once when the mission ends — whether passed or failed.
   * Use to clean up markers, despawn NPCs, remove HUD elements, etc.
   */
  protected abstract onEnd(): void;

  // -------------------------------------------------------------------------
  // Helpers available to all subclasses
  // -------------------------------------------------------------------------

  /**
   * Mark a single objective complete by its label.
   */
  protected completeObjective(label: string) {
    const obj = this.objectives.find(o => o.label === label);
    if (obj) obj.completed = true;
  }

  /**
   * Mark a single objective complete by its index.
   */
  protected completeObjectiveAt(index: number) {
    if (this.objectives[index]) {
      this.objectives[index].completed = true;
    }
  }

  /**
   * Update the label of an objective at a given index.
   * Useful for countdowns like "Evade for 43s".
   */
  protected updateObjectiveLabel(index: number, label: string) {
    if (this.objectives[index]) {
      this.objectives[index].label = label;
    }
  }

  /**
   * Add a new objective at runtime — useful for multi-stage missions
   * that reveal steps progressively.
   */
  protected addObjective(label: string) {
    this.objectives.push({ label, completed: false });
  }
}