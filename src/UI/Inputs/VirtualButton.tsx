import { useState } from "react";

interface VirtualButtonProps {
    label: string;
    bottom?: string;
    right?: string;
    onClick: () => void;
}

export function VirtualButton({ label, bottom = "60px", right = "60px", onClick }: VirtualButtonProps) {
    
    const [pressed, setPressed] = useState(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        e.preventDefault();
        setPressed(true);
        onClick();
    };

    const handleTouchEnd = () => {
        setPressed(false);
    };

    const handleMouseDown = () => {
        setPressed(true);
        onClick();
    };

    const handleMouseUp = () => {
        setPressed(false);
    };

    return (
        <button
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
                position:       "fixed",
                bottom,
                right,
                width:          "70px",
                height:         "70px",
                borderRadius:   "50%",
                background:     "rgba(255,255,255,0.15)",
                border:         "2px solid rgba(255,255,255,0.5)",
                color:          "white",
                fontSize:       "13px",
                fontWeight:     "bold",
                letterSpacing:  "1px",
                cursor:         "pointer",
                pointerEvents:  "all",
                backdropFilter: "blur(4px)",
                userSelect:     "none",
                touchAction:    "none",
                zIndex:         10,
                // ✅ fade in/out based on pressed state
                opacity:        pressed ? 1 : 0.4,
                transition:     "opacity 0.15s ease",
            }}
        >
            {label}
        </button>
    );
}