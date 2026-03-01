export class Music {
    private audio: HTMLAudioElement | null = null;
    private currentIndex: number = 0;

    private playlist: string[] = [
        "/audio/songs/yekm_gta_sa_2.ogg",
        // add more tracks here:
        "/audio/songs/beaach sex chike san 2.ogg",
        // "/audio/songs/track3.ogg",
    ];

    async play(url?: string): Promise<void> {
        // if a specific url is passed, find it in the playlist or start from it
        if (url) {
            const index = this.playlist.indexOf(url);
            this.currentIndex = index !== -1 ? index : 0;
        }

        this.stop();

        this.audio = new Audio(this.playlist[this.currentIndex]);
        this.audio.loop = false; // manual cycling instead of looping
        this.audio.volume = 1.0;

        // when track ends, automatically play the next one
        this.audio.addEventListener('ended', () => {
            this.nextTrack();
        });

        await this.audio.play();
        console.log("Now playing:", this.playlist[this.currentIndex]);
    }

    private async nextTrack(): Promise<void> {
        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        await this.play();
    }

    stop(): void {
        this.audio?.pause();
        this.audio = null;
    }

    togglePause(): void {
        if (!this.audio) return;
        this.audio.paused ? this.audio.play() : this.audio.pause();
    }

    setVolume(volume: number): void {
        if (this.audio) this.audio.volume = volume / 100;
    }

    addTrack(url: string): void {
        this.playlist.push(url);
    }

    getCurrentTrack(): string {
        return this.playlist[this.currentIndex];
    }
}