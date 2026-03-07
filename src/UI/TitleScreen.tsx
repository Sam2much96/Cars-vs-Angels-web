/**
 * TitleScreen.tsx
 * src/UI/TitleScreen.tsx
 *
 * Full-screen title card shown while the game loads.
 * Disappears the moment Human.ts dispatches "human-loaded".
 *
 * ── SETUP ──────────────────────────────────────────────────
 * Add this ONE line to Human.ts at the very end of the
 * loader.load() success callback, after world.addBody(this.body):
 *
 *   window.dispatchEvent(new CustomEvent("human-loaded"));
 *
 * ── FONT ───────────────────────────────────────────────────
 * Font is loaded from /public/PricedownBl-Regular 900.ttf
 * via titlescreen.css — no extra setup needed.
 * ───────────────────────────────────────────────────────────
 */

import { useState, useEffect } from "react";

// White GTA style
import "./styles/titlescreen.css";



// Dark red cinematic style
//import "./styles/titlescreen-red.css";

type Phase = "visible" | "fading" | "gone";

export function TitleScreen() {
    const [phase, setPhase] = useState<Phase>("visible");

    useEffect(() => {
        const onLoaded = () => {
            setPhase("fading");
            // Remove from DOM after CSS transition completes (800 ms)
            setTimeout(() => setPhase("gone"), 800);
        };

        window.addEventListener("human-loaded", onLoaded, { once: true });
        return () => window.removeEventListener("human-loaded", onLoaded);
    }, []);

    if (phase === "gone") return null;

    return (
        <div className={`title-screen${phase === "fading" ? " fading" : ""}`}>

            {/* ── Title logo ──────────────────────────────── */}
            <div className="title-logo">
                <span className="title-word">Cars</span>
                <span className="title-word vs">vs</span>
                <span className="title-word">Angels</span>
            </div>

            {/* ── Loading throbber ────────────────────────── */}
            <div className="title-throbber">
                <div className="throbber-dots">
                    <div className="throbber-dot" />
                    <div className="throbber-dot" />
                    <div className="throbber-dot" />
                </div>
                <p className="throbber-label">Loading</p>
            </div>

        </div>
    );
}