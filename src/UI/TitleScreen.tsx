/**
 * TitleScreen.tsx
 * src/UI/TitleScreen.tsx
 *
 * ── SETUP ──────────────────────────────────────────────────
 * Add to Human.ts at the end of loader.load() success callback,
 * after world.addBody(this.body):
 *
 *   window.dispatchEvent(new CustomEvent("human-loaded"));
 *
 * ── ASSETS in /public ──────────────────────────────────────
 *   PricedownBl-Regular-900.ttf
 *   car_art_transparent.png
 * ───────────────────────────────────────────────────────────
 */

import { useState, useEffect } from "react";
import "./styles/titlescreen.css";

type Phase = "visible" | "fading" | "gone";

export function TitleScreen() {
    const [phase, setPhase] = useState<Phase>("visible");

    useEffect(() => {
        const onLoaded = () => {
            setPhase("fading");
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

            {/* ── Car art — slides in from right, then throbs */}
            <img
                className="title-car-art"
                src="./car_art_transparent.png"
                alt="Dodge Charger"
                draggable={false}
            />

        </div>
    );
}