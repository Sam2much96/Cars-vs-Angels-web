/**
 * Input Manager
 * Professional keyboard & mouse input system for 3D games
 * 
 * to do:
 * (1) add mobile controls for touch screens
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

    private static initialized = false;

    // --------------------------------------------------
    // Initialize
    // --------------------------------------------------

    static initialize(canvas?: HTMLElement) {

        if (this.initialized) return;
        this.initialized = true;

        const target: HTMLElement = canvas ?? document.body;

        // Keyboard

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

        // Mouse buttons

        target.addEventListener("mousedown", (e :  MouseEvent) => {

            if (!this.mouseDown.has(e.button)) {
                this.mousePressed.add(e.button);
            }

            this.mouseDown.add(e.button);

        });

        target.addEventListener("mouseup", (e : MouseEvent) => {

            this.mouseDown.delete(e.button);
            this.mouseReleased.add(e.button);

        });

        // Mouse move

        target.addEventListener("mousemove", (e : MouseEvent) => {

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

        // Pointer lock change

        document.addEventListener("pointerlockchange", () => {

            this.locked = document.pointerLockElement === canvas;

        });

    }

    // --------------------------------------------------
    // Call once per frame
    // --------------------------------------------------

    static update() {

        this.keysPressed.clear();
        this.keysReleased.clear();

        this.mousePressed.clear();
        this.mouseReleased.clear();

        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;

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

}

//
//InputManager.initialize(canvas);