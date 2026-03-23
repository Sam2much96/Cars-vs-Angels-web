/**
 *
 * MissionHUD
 *
 * Features:
 * (1) displays active mission title, objectives and countdown timer
 * (2) shows MISSION PASSED / MISSION FAILED result screen with reward
 * (3) flashes timer red when under 10 seconds
 * (4) animates objectives as they complete
 * (5) shows fail reason on mission failed screen
 * (6) fully cleaned up via destroy()
 */
import type { Mission } from './Mission';

export class MissionHUD {

  private container:   HTMLDivElement;
  private titleEl:     HTMLDivElement;
  private timerEl:     HTMLDivElement;
  private objList:     HTMLDivElement;
  private resultEl:    HTMLDivElement;
  private resultTimer: ReturnType<typeof setTimeout> | null = null;

  // Track last known objective states to animate transitions
  private prevObjectiveStates: boolean[] = [];

  constructor() {

    // -------------------------------------------------------------------------
    // Inject styles
    // -------------------------------------------------------------------------
    const style = document.createElement('style');
    style.textContent = `
      @keyframes mhud-slidein {
        from { opacity: 0; transform: translateX(40px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes mhud-slideout {
        from { opacity: 1; transform: translateX(0); }
        to   { opacity: 0; transform: translateX(40px); }
      }
      @keyframes mhud-obj-complete {
        0%   { transform: scale(1);    background: rgba(255,255,255,0.08); }
        40%  { transform: scale(1.04); background: rgba(68,255,136,0.18); }
        100% { transform: scale(1);    background: transparent; }
      }
      @keyframes mhud-result-in {
        from { opacity: 0; transform: translate(-50%, -60%) scale(0.85); }
        to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      }
      @keyframes mhud-result-out {
        from { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        to   { opacity: 0; transform: translate(-50%, -40%) scale(0.9); }
      }
      @keyframes mhud-timer-flash {
        0%, 100% { opacity: 1; }
        50%      { opacity: 0.3; }
      }
      .mhud-obj-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 5px 8px;
        border-radius: 6px;
        transition: opacity 0.3s ease;
        font-size: 13px;
        color: #ffffff;
        font-family: sans-serif;
      }
      .mhud-obj-row.done {
        opacity: 0.45;
        text-decoration: line-through;
        color: #aaaaaa;
      }
      .mhud-obj-row.just-completed {
        animation: mhud-obj-complete 0.5s ease forwards;
      }
      .mhud-obj-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
        transition: background 0.3s ease;
      }
    `;
    document.head.appendChild(style);

    // -------------------------------------------------------------------------
    // Mission panel — top right
    // -------------------------------------------------------------------------
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      min-width: 230px;
      max-width: 290px;
      background: rgba(0, 0, 0, 0.72);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-left: 3px solid #ffe066;
      border-radius: 8px;
      padding: 14px 16px 12px;
      z-index: 998;
      pointer-events: none;
      display: none;
      animation: mhud-slidein 0.3s ease forwards;
      backdrop-filter: blur(4px);
    `;

    // Title
    this.titleEl = document.createElement('div');
    this.titleEl.style.cssText = `
      font-family: sans-serif;
      font-size: 15px;
      font-weight: 700;
      color: #ffe066;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    `;

    // Timer
    this.timerEl = document.createElement('div');
    this.timerEl.style.cssText = `
      font-family: monospace;
      font-size: 22px;
      font-weight: 700;
      color: #ff6644;
      margin-bottom: 10px;
      display: none;
      letter-spacing: 1px;
    `;

    // Divider
    const divider = document.createElement('div');
    divider.style.cssText = `
      height: 1px;
      background: rgba(255,255,255,0.1);
      margin-bottom: 10px;
    `;

    // Objectives list
    this.objList = document.createElement('div');
    this.objList.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 2px;
    `;

    this.container.append(this.titleEl, this.timerEl, divider, this.objList);
    document.body.appendChild(this.container);

    // -------------------------------------------------------------------------
    // Result overlay — center screen
    // -------------------------------------------------------------------------
    this.resultEl = document.createElement('div');
    this.resultEl.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
      pointer-events: none;
      z-index: 1000;
      display: none;
      font-family: sans-serif;
    `;
    document.body.appendChild(this.resultEl);
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Bind a mission to the HUD — shows the panel and renders initial state.
   * Pass null to hide the panel.
   */
  setMission(mission: Mission | null) {
    if (!mission) {
      this.container.style.animation = 'mhud-slideout 0.25s ease forwards';
      setTimeout(() => {
        this.container.style.display = 'none';
        this.container.style.animation = '';
      }, 250);
      this.prevObjectiveStates = [];
      return;
    }

    this.container.style.display = 'block';
    this.container.style.animation = 'mhud-slidein 0.3s ease forwards';
    this.titleEl.textContent = mission.title;

    // Timer visibility
    if (mission.timeLimit !== null) {
      this.timerEl.style.display = 'block';
    } else {
      this.timerEl.style.display = 'none';
    }

    // Snapshot initial objective states
    this.prevObjectiveStates = mission.objectives.map(o => o.completed);
    this.renderObjectives(mission, false);
  }

  /**
   * Called every frame while a mission is active.
   * Updates timer and objective list.
   */
  update(mission: Mission | null) {
    if (!mission || !mission.isActive) return;

    this.updateTimer(mission);
    this.renderObjectives(mission, true);
  }

  /**
   * Show the MISSION PASSED or MISSION FAILED result screen.
   * Auto-hides after 4 seconds.
   */
  showResult(
    type:       'complete' | 'failed',
    title:      string,
    reward      = 0,
    failReason  = 'Mission failed',
  ) {
    // Clear any existing result timer
    if (this.resultTimer) {
      clearTimeout(this.resultTimer);
      this.resultTimer = null;
    }

    this.resultEl.style.display = 'block';
    this.resultEl.style.animation = 'mhud-result-in 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards';

    if (type === 'complete') {
      this.resultEl.innerHTML = `
        <div style="
          font-size: 36px;
          font-weight: 900;
          color: #44ff88;
          text-shadow: 0 0 24px rgba(68,255,136,0.5), 0 2px 8px rgba(0,0,0,0.9);
          letter-spacing: 2px;
          margin-bottom: 8px;
        ">MISSION PASSED</div>
        <div style="
          font-size: 17px;
          font-weight: 600;
          color: #ffe066;
          margin-bottom: 6px;
          text-shadow: 0 2px 6px rgba(0,0,0,0.8);
        ">${title}</div>
        ${reward > 0 ? `
        <div style="
          font-size: 22px;
          font-weight: 700;
          color: #ffffff;
          text-shadow: 0 2px 6px rgba(0,0,0,0.8);
        ">+$${reward.toLocaleString()}</div>` : ''}
      `;
    } else {
      this.resultEl.innerHTML = `
        <div style="
          font-size: 36px;
          font-weight: 900;
          color: #ff3333;
          text-shadow: 0 0 24px rgba(255,51,51,0.5), 0 2px 8px rgba(0,0,0,0.9);
          letter-spacing: 2px;
          margin-bottom: 8px;
        ">MISSION FAILED</div>
        <div style="
          font-size: 15px;
          font-weight: 400;
          color: rgba(255,255,255,0.7);
          text-shadow: 0 2px 6px rgba(0,0,0,0.8);
        ">${failReason}</div>
      `;
    }

    // Auto-hide after 4s with fade out
    this.resultTimer = setTimeout(() => {
      this.resultEl.style.animation = 'mhud-result-out 0.4s ease forwards';
      setTimeout(() => {
        this.resultEl.style.display = 'none';
        this.resultEl.style.animation = '';
      }, 400);
    }, 4000);
  }

  /**
   * Remove all HUD elements from the DOM.
   * Call from MissionManager.destroy().
   */
  destroy() {
    if (this.resultTimer) clearTimeout(this.resultTimer);
    this.container.remove();
    this.resultEl.remove();
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private updateTimer(mission: Mission) {
    const remaining = mission.timeRemaining;
    if (remaining === null) return;

    const m   = Math.floor(remaining / 60).toString().padStart(2, '0');
    const s   = Math.floor(remaining % 60).toString().padStart(2, '0');
    const ms  = Math.floor((remaining % 1) * 10);

    // Show milliseconds when under 10 seconds for urgency
    this.timerEl.textContent = remaining < 10
      ? `${m}:${s}.${ms}`
      : `${m}:${s}`;

    // Color + flash based on urgency
    if (remaining < 10) {
      this.timerEl.style.color     = '#ff2222';
      this.timerEl.style.animation = 'mhud-timer-flash 0.5s ease infinite';
    } else if (remaining < 30) {
      this.timerEl.style.color     = '#ff6644';
      this.timerEl.style.animation = 'none';
    } else {
      this.timerEl.style.color     = '#ffaa44';
      this.timerEl.style.animation = 'none';
    }
  }

  private renderObjectives(mission: Mission, animate: boolean) {
    const objectives = mission.objectives;

    // Rebuild list only when objective count changes
    if (this.objList.children.length !== objectives.length) {
      this.objList.innerHTML = '';
      this.prevObjectiveStates = objectives.map(() => false);
    }

    objectives.forEach((obj, i) => {
      const justCompleted =
        animate &&
        obj.completed &&
        !this.prevObjectiveStates[i];

      // Create row if missing
      let row = this.objList.children[i] as HTMLDivElement | undefined;
      if (!row) {
        row = document.createElement('div');
        row.className = 'mhud-obj-row';

        const dot = document.createElement('span');
        dot.className = 'mhud-obj-dot';

        const label = document.createElement('span');

        row.append(dot, label);
        this.objList.appendChild(row);
      }

      const dot   = row.children[0] as HTMLSpanElement;
      const label = row.children[1] as HTMLSpanElement;

      // Update content
      label.textContent = obj.completed ? `✓  ${obj.label}` : obj.label;
      dot.style.background = obj.completed ? '#44ff88' : '#ffffff';

      // Toggle done style
      row.classList.toggle('done', obj.completed);

      // Trigger completion animation
      if (justCompleted) {
        row.classList.remove('just-completed');
        void row.offsetWidth; // force reflow to restart animation
        row.classList.add('just-completed');
        setTimeout(() => row!.classList.remove('just-completed'), 500);
      }

      // Sync snapshot
      this.prevObjectiveStates[i] = obj.completed;
    });
  }
}