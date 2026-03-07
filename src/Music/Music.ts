/**
 * Music
 * Features:
 * (1) no dependencies
 * (2) graceful handling of browser-aborted play requests
 */

export class Music {

    public enable: boolean = true;

    private audio: HTMLAudioElement | null = null;
    private currentIndex: number = 0;

    private playlist: string[] = [
        "/audio/songs/yekm_gta_sa_2.mp3",
    ];

    // --------------------------------------------------
    // Public API
    // --------------------------------------------------

    async play(url?: string): Promise<void> {

        if (!this.enable) return;

        if (url) {
            const index = this.playlist.indexOf(url);
            this.currentIndex = index !== -1 ? index : 0;
        }

        // Cleanly tear down the previous element before creating a new one.
        // This prevents the "aborted by user agent" DOMException that fires when
        // pause() interrupts an in-flight load/play promise.
        await this.stopAsync();

        const audio = new Audio(this.playlist[this.currentIndex]);
        audio.loop = false;
        audio.volume = 1.0;

        audio.addEventListener("ended", () => this.nextTrack());

        this.audio = audio;

        try {

            await audio.play();
            console.log("Now playing:", this.playlist[this.currentIndex]);

        } catch (err) {

            // AbortError   – element was replaced before playback could start (harmless)
            // NotAllowedError – browser blocked autoplay before a user gesture
            if (err instanceof DOMException) {

                if (err.name === "AbortError") {
                    // Silently ignore — a newer play() call superseded this one
                    return;
                }

                if (err.name === "NotAllowedError") {
                    console.warn("Music: playback blocked until a user gesture has occurred.");
                    return;
                }

            }

            // Re-throw anything unexpected
            throw err;

        }

    }

    stop(): void {

        if (!this.audio) return;

        // Remove the src before pausing so the browser doesn't fire an
        // "interrupted" abort error on the pending play() promise.
        const audio = this.audio;
        this.audio = null;

        audio.pause();
        audio.src = "";     // releases the media resource immediately
        audio.load();       // resets the element to the "empty" network state

    }

    togglePause(): void {

        if (!this.audio) return;

        this.audio.paused ? this.audio.play() : this.audio.pause();

    }

    setVolume(volume: number): void {

        if (this.audio) this.audio.volume = Math.max(0, Math.min(1, volume / 100));

    }

    addTrack(url: string): void {

        this.playlist.push(url);

    }

    getCurrentTrack(): string {

        return this.playlist[this.currentIndex];

    }

    // --------------------------------------------------
    // Internal helpers
    // --------------------------------------------------

    /**
     * Async-safe stop: pauses, clears src, and yields one microtask tick so
     * any in-flight play() promise has a chance to settle before we discard
     * the element. This prevents the AbortError on rapid play() calls.
     */
    private async stopAsync(): Promise<void> {

        if (!this.audio) return;

        const audio = this.audio;
        this.audio = null;

        audio.pause();
        audio.src = "";
        audio.load();

        // One microtask tick — lets the browser resolve the aborted promise
        // before we create a brand-new Audio element on top of it.
        await Promise.resolve();

    }

    private async nextTrack(): Promise<void> {

        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        await this.play();

    }

}