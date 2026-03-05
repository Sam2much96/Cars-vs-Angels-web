/**
 * Input Manager
 * Professional keyboard, mouse & touch input system for 3D games
 */



export class InputManager {

    // --------------------------------------------------
    // Keyboard state
    // --------------------------------------------------

    private static keysDown = new Set<string>();
    private static keysPressed = new Set<string>();
    private static keysReleased = new Set<string>();

    // --------------------------------------------------
    // Mouse state
    // --------------------------------------------------

    private static mouseDown = new Set<number>();
    private static mousePressed = new Set<number>();
    private static mouseReleased = new Set<number>();

    private static mouseX = 0;
    private static mouseY = 0;

    private static mouseDeltaX = 0;
    private static mouseDeltaY = 0;

    private static locked = false;

    // --------------------------------------------------
    // Touch state
    // --------------------------------------------------

    // Active touches keyed by identifier
    private static touches = new Map<number, Touch>();

    // Touch equivalents of mouse pressed/released (maps touch id → button 0)
    private static touchPressed = new Set<number>();
    private static touchReleased = new Set<number>();

    // Aggregate touch delta (sum of all active touch movements this frame)
    private static touchDeltaX = 0;
    private static touchDeltaY = 0;

    // Position of the primary touch (first finger down), in canvas-local coords
    private static touchX = 0;
    private static touchY = 0;

    // Pinch state
    private static pinchDistance = 0;        // current distance between two fingers
    private static pinchDelta = 0;           // change in pinch distance this frame

    private static initialized = false;

    // --------------------------------------------------
    // Initialize
    // --------------------------------------------------

    static initialize(canvas?: HTMLElement) {

        if (this.initialized) return;
        this.initialized = true;

        const target: HTMLElement = canvas ?? document.body;

        // ---- Keyboard ----

        document.addEventListener("keydown", (e) => {

            if (!this.keysDown.has(e.code)) {
                this.keysPressed.add(e.code);
            }

            this.keysDown.add(e.code);

        });

        document.addEventListener("keyup", (e) => {

            this.keysDown.delete(e.code);
            this.keysReleased.add(e.code);

        });

        // ---- Mouse buttons ----

        target.addEventListener("mousedown", (e: MouseEvent) => {

            if (!this.mouseDown.has(e.button)) {
                this.mousePressed.add(e.button);
            }

            this.mouseDown.add(e.button);

        });

        target.addEventListener("mouseup", (e: MouseEvent) => {

            this.mouseDown.delete(e.button);
            this.mouseReleased.add(e.button);

        });

        // ---- Mouse move ----

        target.addEventListener("mousemove", (e: MouseEvent) => {

            if (this.locked) {

                this.mouseDeltaX += e.movementX;
                this.mouseDeltaY += e.movementY;

            } else {

                const rect = (target as HTMLElement).getBoundingClientRect();

                const newX = e.clientX - rect.left;
                const newY = e.clientY - rect.top;

                this.mouseDeltaX += newX - this.mouseX;
                this.mouseDeltaY += newY - this.mouseY;

                this.mouseX = newX;
                this.mouseY = newY;

            }

        });

        // ---- Pointer lock ----

        document.addEventListener("pointerlockchange", () => {

            this.locked = document.pointerLockElement === canvas;

        });

        // ---- Touch ----
        // Prevent default on the canvas to stop scroll/zoom interference.

        target.addEventListener("touchstart", (e: TouchEvent) => {

            e.preventDefault();

            const rect = target.getBoundingClientRect();

            for (let i = 0; i < e.changedTouches.length; i++) {

                const t = e.changedTouches[i];
                this.touches.set(t.identifier, t);
                this.touchPressed.add(t.identifier);

                // Primary touch drives the "mouse-like" position
                if (this.touches.size === 1) {
                    this.touchX = t.clientX - rect.left;
                    this.touchY = t.clientY - rect.top;
                }

            }

            this.updatePinch();

        }, { passive: false });

        target.addEventListener("touchmove", (e: TouchEvent) => {

            e.preventDefault();

            const rect = target.getBoundingClientRect();

            for (let i = 0; i < e.changedTouches.length; i++) {

                const t = e.changedTouches[i];
                const prev = this.touches.get(t.identifier);

                if (prev) {

                    const dx = t.clientX - prev.clientX;
                    const dy = t.clientY - prev.clientY;

                    this.touchDeltaX += dx;
                    this.touchDeltaY += dy;

                    // Keep primary touch position in sync
                    if (t.identifier === [...this.touches.keys()][0]) {
                        this.touchX = t.clientX - rect.left;
                        this.touchY = t.clientY - rect.top;
                    }

                }

                this.touches.set(t.identifier, t);

            }

            this.updatePinch();

        }, { passive: false });

        target.addEventListener("touchend", (e: TouchEvent) => {

            e.preventDefault();

            for (let i = 0; i < e.changedTouches.length; i++) {

                const t = e.changedTouches[i];
                this.touches.delete(t.identifier);
                this.touchReleased.add(t.identifier);

            }

            this.updatePinch();

        }, { passive: false });

        target.addEventListener("touchcancel", (e: TouchEvent) => {

            for (let i = 0; i < e.changedTouches.length; i++) {

                const t = e.changedTouches[i];
                this.touches.delete(t.identifier);
                this.touchReleased.add(t.identifier);

            }

            this.updatePinch();

        }, { passive: false });

    }

    // --------------------------------------------------
    // Internal: recalculate pinch distance from two active touches
    // --------------------------------------------------

    private static updatePinch() {

        const pts = [...this.touches.values()];

        if (pts.length >= 2) {

            const dx = pts[0].clientX - pts[1].clientX;
            const dy = pts[0].clientY - pts[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (this.pinchDistance !== 0) {
                this.pinchDelta += dist - this.pinchDistance;
            }

            this.pinchDistance = dist;

        } else {

            this.pinchDistance = 0;

        }

    }

    // --------------------------------------------------
    // Call once per frame
    // --------------------------------------------------

    static update() {

        // Keyboard
        this.keysPressed.clear();
        this.keysReleased.clear();

        // Mouse
        this.mousePressed.clear();
        this.mouseReleased.clear();
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;

        // Touch
        this.touchPressed.clear();
        this.touchReleased.clear();
        this.touchDeltaX = 0;
        this.touchDeltaY = 0;
        this.pinchDelta = 0;

    }

    // --------------------------------------------------
    // Keyboard queries
    // --------------------------------------------------

    static isKeyDown(code: string): boolean {
        return this.keysDown.has(code);
    }

    static isKeyPressed(code: string): boolean {
        return this.keysPressed.has(code);
    }

    static isKeyReleased(code: string): boolean {
        return this.keysReleased.has(code);
    }

    // --------------------------------------------------
    // Mouse queries
    // --------------------------------------------------

    static isMouseDown(button: number): boolean {
        return this.mouseDown.has(button);
    }

    static isMousePressed(button: number): boolean {
        return this.mousePressed.has(button);
    }

    static isMouseReleased(button: number): boolean {
        return this.mouseReleased.has(button);
    }

    // --------------------------------------------------
    // Mouse position
    // --------------------------------------------------

    static getMouseX(): number {
        return this.mouseX;
    }

    static getMouseY(): number {
        return this.mouseY;
    }

    static getMouseDeltaX(): number {
        return this.mouseDeltaX;
    }

    static getMouseDeltaY(): number {
        return this.mouseDeltaY;
    }

    // --------------------------------------------------
    // Pointer lock
    // --------------------------------------------------

    static lockPointer(canvas: HTMLElement) {
        canvas.requestPointerLock();
    }

    static unlockPointer() {
        document.exitPointerLock();
    }

    static isPointerLocked(): boolean {
        return this.locked;
    }

    // --------------------------------------------------
    // Touch queries
    // --------------------------------------------------

    /** True while at least one finger is on screen */
    static isTouching(): boolean {
        return this.touches.size > 0;
    }

    /** True the frame a finger first touches down (any finger) */
    static isTouchPressed(): boolean {
        return this.touchPressed.size > 0;
    }

    /** True the frame a finger lifts off (any finger) */
    static isTouchReleased(): boolean {
        return this.touchReleased.size > 0;
    }

    /** Number of fingers currently on screen */
    static getTouchCount(): number {
        return this.touches.size;
    }

    /**
     * Canvas-local X position of the primary touch (first finger down).
     * Mirrors getMouseX() for unified handling.
     */
    static getTouchX(): number {
        return this.touchX;
    }

    /**
     * Canvas-local Y position of the primary touch (first finger down).
     * Mirrors getMouseY() for unified handling.
     */
    static getTouchY(): number {
        return this.touchY;
    }

    /**
     * Accumulated horizontal movement of all fingers this frame.
     * Use for camera look or swipe gestures (mirrors getMouseDeltaX).
     */
    static getTouchDeltaX(): number {
        return this.touchDeltaX;
    }

    /**
     * Accumulated vertical movement of all fingers this frame.
     * Use for camera look or swipe gestures (mirrors getMouseDeltaY).
     */
    static getTouchDeltaY(): number {
        return this.touchDeltaY;
    }

    /**
     * Raw snapshot of every active Touch, keyed by identifier.
     * Useful for building custom multi-finger gestures.
     */
    static getTouches(): ReadonlyMap<number, Touch> {
        return this.touches;
    }

    // --------------------------------------------------
    // Pinch / zoom
    // --------------------------------------------------

    /**
     * Change in distance between two fingers this frame.
     * Positive  → fingers moving apart  (zoom in)
     * Negative  → fingers moving together (zoom out)
     * Zero when fewer than two fingers are active.
     */
    static getPinchDelta(): number {
        return this.pinchDelta;
    }

    /**
     * Current absolute distance between the first two fingers.
     * Zero when fewer than two fingers are active.
     */
    static getPinchDistance(): number {
        return this.pinchDistance;
    }

    // --------------------------------------------------
    // Unified helpers (mouse + touch, whichever is active)
    // --------------------------------------------------

    /**
     * Returns true if either the mouse button 0 is held OR a finger is on screen.
     * Handy for "tap or click" logic without platform branching.
     */
    static isPointerDown(): boolean {
        return this.isMouseDown(0) || this.isTouching();
    }

    /**
     * Returns true the frame a primary interaction starts
     * (mouse button 0 pressed OR first touch began).
     */
    static isPointerPressed(): boolean {
        return this.isMousePressed(0) || this.isTouchPressed();
    }

    /**
     * Returns true the frame a primary interaction ends
     * (mouse button 0 released OR last touch lifted).
     */
    static isPointerReleased(): boolean {
        return this.isMouseReleased(0) || this.isTouchReleased();
    }

    /**
     * Horizontal delta from either mouse movement or touch drag this frame.
     * Useful for camera look code that should be platform-agnostic.
     */
    static getPointerDeltaX(): number {
        return this.mouseDeltaX + this.touchDeltaX;
    }

    /**
     * Vertical delta from either mouse movement or touch drag this frame.
     */
    static getPointerDeltaY(): number {
        return this.mouseDeltaY + this.touchDeltaY;
    }

}

//
// InputManager.initialize(canvas);