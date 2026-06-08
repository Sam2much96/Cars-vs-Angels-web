import { useState, useEffect } from 'react';

export function GameOver() {
    const [visible, setVisible] = useState(false);
    const [fading, setFading]   = useState(false);

    useEffect(() => {
        const onGameOver = () => {
            setFading(false);
            setVisible(true);
        };
        const onReset = () => {
            setFading(true);
            setTimeout(() => setVisible(false), 800);
        };
        window.addEventListener('game-over',       onGameOver);
        window.addEventListener('game-over-reset', onReset);
        return () => {
            window.removeEventListener('game-over',       onGameOver);
            window.removeEventListener('game-over-reset', onReset);
        };
    }, []);

    if (!visible) return null;

    return (
        <div style={{
            position:      'fixed',
            inset:         0,
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'center',
            justifyContent:'center',
            background:    'none',
            zIndex:        2000,
            pointerEvents: 'none',
            opacity:       fading ? 0 : 1,
            transition:    'opacity 0.8s ease',
        }}>
            <div style={{
                fontFamily:   'PricedownBl, sans-serif',
                fontSize:     'clamp(48px, 10vw, 96px)',
                color:        '#cc0000',
                textShadow:   '0 0 30px rgba(200,0,0,0.8), 4px 4px 0 #000, -4px -4px 0 #000',
                letterSpacing:'4px',
                animation:    'wasted-in 0.4s cubic-bezier(0.22,1,0.36,1) forwards',
            }}>
                WASTED
            </div>
            <div style={{
                fontFamily: 'sans-serif',
                fontSize:   '16px',
                color:      'rgba(255,255,255,0.6)',
                marginTop:  '16px',
                letterSpacing: '2px',
            }}>
                Respawning…
            </div>

            <style>{`
                @keyframes wasted-in {
                    from { opacity: 0; transform: scale(2.5); }
                    to   { opacity: 1; transform: scale(1);   }
                }
            `}</style>
        </div>
    );
}
