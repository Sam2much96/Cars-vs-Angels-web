import { useEffect, useRef, useState, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// VirtualJoystick — pure static class (unchanged API, used by Human.ts)
// ─────────────────────────────────────────────────────────────────────────────

export class VirtualJoystick {

    static readonly RADIUS = 60;

    // Touch state
    private static activeId:  number | null = null;
    private static originX  = 0;
    private static originY  = 0;
    private static currentX = 0;
    private static currentY = 0;


    // Mouse-sim state (PC debugging)
    private static mouseSimActive = false;
    private static mouseSimOriginX = 0;
    private static mouseSimOriginY = 0;
    private static mouseSimX = 0;
    private static mouseSimY = 0;

    

    // React setter — component registers this so it re-renders on change
    private static _onStateChange: ((s: JoystickState) => void) | null = null;

    static _setReactBridge(fn: ((s: JoystickState) => void) | null) {
        this._onStateChange = fn;
    }

    private static _notify() {
        if (!this._onStateChange) return;
        const { x, y } = this.getAxis();
        const simActive = this.mouseSimActive;
        const active    = simActive || this.activeId !== null;
        const oX = simActive ? this.mouseSimOriginX : this.originX;
        const oY = simActive ? this.mouseSimOriginY : this.originY;
        let   dX = simActive ? this.mouseSimX - oX  : this.currentX - oX;
        let   dY = simActive ? this.mouseSimY - oY  : this.currentY - oY;
        const dist = Math.sqrt(dX * dX + dY * dY);
        if (dist > this.RADIUS) { dX = (dX / dist) * this.RADIUS; dY = (dY / dist) * this.RADIUS; }
        this._onStateChange({ active, originX: oX, originY: oY, knobDX: dX, knobDY: dY, axisX: x, axisY: y });
    }

    // ── Touch handlers (called by the React component) ──────────────────────

    

    static _onTouchStart(x: number, y: number, id: number, zoneWidth: number) {
        if (this.activeId !== null) return;
        if (x > zoneWidth / 2) return; // left half only
        this.activeId  = id;
        this.originX   = x;
        this.originY   = y;
        this.currentX  = x;
        this.currentY  = y;
        this._notify();
    }

    static _onTouchMove(x: number, y: number, id: number) {
        if (this.activeId !== id) return;
        this.currentX = x;
        this.currentY = y;
        this._notify();
    }

    static _onTouchEnd(id: number) {
        if (this.activeId !== id) return;
        this.activeId  = null;
        this.currentX  = this.originX;
        this.currentY  = this.originY;
        this._notify();
    }

    // ── Mouse sim handlers (called by the React component) ──────────────────

    static _onMouseDown(x: number, y: number, zoneWidth: number) {
        if (x > zoneWidth / 2) return;
        this.mouseSimActive  = true;
        this.mouseSimOriginX = x;
        this.mouseSimOriginY = y;
        this.mouseSimX       = x;
        this.mouseSimY       = y;
        this._notify();
    }

    static _onMouseMove(x: number, y: number) {
        if (!this.mouseSimActive) return;
        this.mouseSimX = x;
        this.mouseSimY = y;
        this._notify();
    }

    static _onMouseUp() {
        if (!this.mouseSimActive) return;
        this.mouseSimActive = false;
        this._notify();
    }

    // ── Public API (unchanged — Human.ts keeps calling these) ───────────────

    static getAxis(): { x: number; y: number } {
        const simActive = this.mouseSimActive;
        const active    = simActive || this.activeId !== null;
        if (!active) return { x: 0, y: 0 };

        const oX  = simActive ? this.mouseSimOriginX : this.originX;
        const oY  = simActive ? this.mouseSimOriginY : this.originY;
        let   dX  = (simActive ? this.mouseSimX : this.currentX) - oX;
        let   dY  = (simActive ? this.mouseSimY : this.currentY) - oY;

        const dist = Math.sqrt(dX * dX + dY * dY);
        if (dist > this.RADIUS) { dX = (dX / dist) * this.RADIUS; dY = (dY / dist) * this.RADIUS; }

        return { x: dX / this.RADIUS, y: dY / this.RADIUS };
    }

    static isActive(): boolean {
        return this.mouseSimActive || this.activeId !== null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface JoystickState {
    active:   boolean;
    originX:  number;
    originY:  number;
    knobDX:   number;
    knobDY:   number;
    axisX:    number;
    axisY:    number;
}

const DEFAULT_STATE: JoystickState = {
    active: false, originX: 0, originY: 0,
    knobDX: 0, knobDY: 0, axisX: 0, axisY: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// React component
// ─────────────────────────────────────────────────────────────────────────────

export function VirtualJoystickOverlay() {

    const overlayRef          = useRef<HTMLDivElement>(null);
    const [js, setJs]         = useState<JoystickState>(DEFAULT_STATE);
    const R                   = VirtualJoystick.RADIUS;

    // Register the React bridge so the class can push updates
    useEffect(() => {
        VirtualJoystick._setReactBridge(setJs);
        return () => VirtualJoystick._setReactBridge(null);
    }, []);

    // ── Touch events ─────────────────────────────────────────────────────────

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        const rect = overlayRef.current!.getBoundingClientRect();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            VirtualJoystick._onTouchStart(
                t.clientX - rect.left,
                t.clientY - rect.top,
                t.identifier,
                rect.width
            );
        }
    }, []);

    const onTouchMove = useCallback((e: React.TouchEvent) => {
        const rect = overlayRef.current!.getBoundingClientRect();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            VirtualJoystick._onTouchMove(
                t.clientX - rect.left,
                t.clientY - rect.top,
                t.identifier
            );
        }
    }, []);

    const onTouchEnd = useCallback((e: React.TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            VirtualJoystick._onTouchEnd(e.changedTouches[i].identifier);
        }
    }, []);

    // ── Mouse sim events (PC debugging) ──────────────────────────────────────

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        const rect = overlayRef.current!.getBoundingClientRect();
        VirtualJoystick._onMouseDown(e.clientX - rect.left, e.clientY - rect.top, rect.width);
    }, []);

    const onMouseMove = useCallback((e: React.MouseEvent) => {
        const rect = overlayRef.current!.getBoundingClientRect();
        VirtualJoystick._onMouseMove(e.clientX - rect.left, e.clientY - rect.top);
    }, []);

    const onMouseUp = useCallback(() => {
        VirtualJoystick._onMouseUp();
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div
            ref={overlayRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            style={{
                position:      "fixed",
                inset:         0,
                pointerEvents: "none",    // let Three.js canvas receive events by default…
                zIndex:        10,
                overflow:      "hidden",
                userSelect:    "none",
            }}
        >
            {/* Left half interaction zone — this half captures pointer events */}
            <div style={{
                position:      "absolute",
                left: 0, top: 0,
                width:         "50%",
                height:        "100%",
                pointerEvents: "all",     // …except the left half which owns the joystick
            }} />

            {/* Joystick visual — only shown while active */}
            {js.active && (
                <svg
                    style={{
                        position:   "absolute",
                        left:       js.originX - R,
                        top:        js.originY - R,
                        width:      R * 2,
                        height:     R * 2,
                        overflow:   "visible",
                        pointerEvents: "none",
                    }}
                >
                    {/* Outer ring */}
                    <circle
                        cx={R} cy={R} r={R - 2}
                        fill="rgba(255,255,255,0.08)"
                        stroke="rgba(255,255,255,0.35)"
                        strokeWidth={2}
                    />

                    {/* Direction tick marks */}
                    {[0, 90, 180, 270].map((deg) => {
                        const rad = (deg * Math.PI) / 180;
                        const inner = R * 0.72;
                        const outer = R * 0.92;
                        return (
                            <line
                                key={deg}
                                x1={R + Math.cos(rad) * inner}
                                y1={R + Math.sin(rad) * inner}
                                x2={R + Math.cos(rad) * outer}
                                y2={R + Math.sin(rad) * outer}
                                stroke="rgba(255,255,255,0.25)"
                                strokeWidth={1.5}
                                strokeLinecap="round"
                            />
                        );
                    })}

                    {/* Knob */}
                    <circle
                        cx={R + js.knobDX}
                        cy={R + js.knobDY}
                        r={R * 0.38}
                        fill="rgba(255,255,255,0.55)"
                        stroke="rgba(255,255,255,0.9)"
                        strokeWidth={1.5}
                    />

                    {/* Subtle glow on knob */}
                    <circle
                        cx={R + js.knobDX}
                        cy={R + js.knobDY}
                        r={R * 0.38}
                        fill="none"
                        stroke="rgba(120,200,255,0.3)"
                        strokeWidth={6}
                    />
                </svg>
            )}
        </div>
    );
}