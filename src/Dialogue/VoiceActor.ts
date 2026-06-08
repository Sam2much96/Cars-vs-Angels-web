/**
 * VoiceActor
 *
 * Thin wrapper around the Web Speech API.
 * Each character gets its own pitch/rate so voices are distinguishable.
 */

export interface VoiceOptions {
    pitch?: number;  // 0–2  (default 1)
    rate?:  number;  // 0.1–10 (default 1)
}

export class VoiceActor {
    private readonly synth = window.speechSynthesis;
    private readonly defaults: VoiceOptions;

    constructor(defaults: VoiceOptions = {}) {
        this.defaults = defaults;
    }

    speak(text: string, overrides: VoiceOptions = {}): void {
        this.synth.cancel();
        const utt   = new SpeechSynthesisUtterance(text);
        utt.pitch   = overrides.pitch ?? this.defaults.pitch ?? 1.0;
        utt.rate    = overrides.rate  ?? this.defaults.rate  ?? 1.0;
        this.synth.speak(utt);
    }

    stop(): void {
        this.synth.cancel();
    }
}

// ── Pre-configured character voices ──────────────────────────────────────────

export const PlayerVoice = new VoiceActor({ pitch: 0.85, rate: 0.9 });
export const AngelVoice  = new VoiceActor({ pitch: 1.5,  rate: 0.75 });
