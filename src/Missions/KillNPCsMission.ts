import { Mission } from './Mission';

const TARGET = 3;

export class KillNPCsMission extends Mission {
    private kills = 0;

    private readonly _onKill = () => {
        if (!this.isActive) return;
        this.kills = Math.min(TARGET, this.kills + 1);
        this.updateObjectiveLabel(0, this._label());
        if (this.kills >= TARGET) this.completeObjectiveAt(0);
    };

    constructor() {
        super('kill-npcs', 'Eliminate Targets', 5000);
        this.timeLimit  = 180;
        this.objectives = [{ label: this._label(), completed: false }];
    }

    protected onStart(): void {
        this.kills = 0;
        this.updateObjectiveLabel(0, this._label());
        window.addEventListener('npc-killed', this._onKill);
    }

    protected update(_delta: number): void {}

    protected onEnd(): void {
        window.removeEventListener('npc-killed', this._onKill);
    }

    private _label(): string {
        return `Eliminate civilians (${this.kills}/${TARGET})`;
    }
}
