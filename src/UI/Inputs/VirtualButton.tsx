import { useState } from "react";

interface VirtualButtonProps {
    label:   string;
    top?:    string;
    left?:   string;
    onClick: () => void;
}

export function VirtualButton({ label, top = "0px", left = "0px", onClick }: VirtualButtonProps) {

    const [pressed, setPressed] = useState(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        setPressed(true);
        onClick();
    };
    const handleTouchEnd   = () => setPressed(false);
    const handleMouseDown  = () => { setPressed(true); onClick(); };
    const handleMouseUp    = () => setPressed(false);

    return (
        <button
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
                position:       "absolute",
                top,
                left,
                width:          "60px",
                height:         "60px",
                borderRadius:   "50%",
                background:     "rgba(0,0,0,0.45)",
                border:         "2px solid rgba(255,255,255,0.6)",
                color:          "white",
                fontSize:       "12px",
                fontWeight:     "bold",
                letterSpacing:  "1px",
                cursor:         "pointer",
                pointerEvents:  "all",
                backdropFilter: "blur(3px)",
                userSelect:     "none",
                touchAction:    "none",
                opacity:        pressed ? 1.0 : 0.7,
                transition:     "opacity 0.15s ease",
            }}
        >
            {label}
        </button>
    );
}