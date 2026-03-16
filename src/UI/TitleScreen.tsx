import { useState, useEffect } from "react";
import "./styles/titlescreen.css";

type Phase = "visible" | "fading" | "gone";

export function TitleScreen() {
    const [phase, setPhase]       = useState<Phase>("visible");
    const [percent, setPercent]   = useState<number>(0);
    const [label, setLabel]       = useState<string>("Loading...");

    useEffect(() => {
        const onProgress = (e: Event) => {
            const { percent, label } = (e as CustomEvent).detail;
            setPercent(percent);
            setLabel(label);
        };

        const onLoaded = () => {
            setPercent(100);
            setTimeout(() => setPhase("fading"), 300); // brief pause at 100%
            setTimeout(() => setPhase("gone"), 1100);
        };

        window.addEventListener("load-progress", onProgress);
        window.addEventListener("human-loaded", onLoaded, { once: true });

        return () => {
            window.removeEventListener("load-progress", onProgress);
            window.removeEventListener("human-loaded", onLoaded);
        };
    }, []);

    if (phase === "gone") return null;

    return (
        <div className={`title-screen${phase === "fading" ? " fading" : ""}`}>

            <div className="title-logo">
                <span className="title-word">Cars</span>
                <span className="title-word vs">vs</span>
                <span className="title-word">Angels</span>
            </div>

            <div className="title-throbber">
                {/* Label */}
                <p className="throbber-label">{label}</p>

                {/* Progress bar */}
                <div className="progress-track">
                    <div
                        className="progress-fill"
                        style={{ width: `${percent}%` }}
                    />
                </div>

                {/* Percentage number */}
                <p className="progress-percent">{percent}%</p>
            </div>

            <img
                className="title-car-art"
                src="/car_art_transparent.png"
                alt="Dodge Charger"
                draggable={false}
            />
        </div>
    );
}