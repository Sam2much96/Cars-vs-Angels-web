import { Mission } from './Mission';
import { AngelSpawner } from '../Characters/AngelSpawner';
import type { NavGrid }     from '../Nav/NavGrid';
import type { GameContext } from '../core/context';

export class KillAllAngelsMission extends Mission {
    private readonly ctx:     GameContext;
    private readonly navGrid: NavGrid;

    private total      = 0;
    private remaining  = 0;
    private spawning   = false; // true while GLBs are loading

    private readonly _onDefeated = () => {
        if (!this.isActive || this.spawning) return;
        this.remaining = Math.max(0, this.remaining - 1);
        this.updateObjectiveLabel(0, this._label());
        if (this.remaining === 0) this.completeObjectiveAt(0);
    };

    constructor(ctx: GameContext, navGrid: NavGrid) {
        super('kill-all-angels', 'Purge the Angels', 10000);
        this.ctx     = ctx;
        this.navGrid = navGrid;
        this.timeLimit  = 600;
        this.objectives = [{ label: 'Kill all Angels', completed: false }];
    }

    protected onStart(): void {
        this.spawning  = true;
        this.remaining = 0;
        this.total     = 0;
        this.updateObjectiveLabel(0, 'Spawning angels…');

        window.addEventListener('angel-defeated', this._onDefeated);

        const spawner = new AngelSpawner(this.ctx);

        spawner.ready.then(() => {
            if (!this.isActive) {
                for (const a of spawner.angels) a.silentRemove();
                return;
            }
            window.angels = spawner.angels;
            spawner.setNavGrid(this.navGrid);
            this.total     = spawner.angels.length;
            this.remaining = this.total;
            this.spawning  = false;
            this.updateObjectiveLabel(0, this._label());
        });
    }

    protected update(_delta: number): void {}

    protected onEnd(): void {
        window.removeEventListener('angel-defeated', this._onDefeated);

        // Silently remove any angels still alive
        for (const angel of window.angels) angel.silentRemove();
        window.angels = [];
    }

    private _label(): string {
        return `Kill all Angels (${this.total - this.remaining}/${this.total})`;
    }
}
