import { useState, useEffect, useCallback } from 'react';

const BTN: React.CSSProperties = {
    display: 'block',
    width: '100%',
    padding: '12px 16px',
    marginBottom: '8px',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderLeft: '3px solid #ffe066',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '15px',
    fontFamily: 'sans-serif',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
    letterSpacing: '0.4px',
    userSelect: 'none',
    touchAction: 'none',
};

const BTN_ON: React.CSSProperties = {
    ...BTN,
    borderLeftColor: '#44ff88',
    background: 'rgba(68,255,136,0.1)',
};

const DIVIDER: React.CSSProperties = {
    border: 'none',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    margin: '12px 0',
};

export function PauseMenu() {
    const [open,    setOpen]    = useState(false);
    const [fps,     setFps]     = useState(false);
    const [physics, setPhysics] = useState(false);
    const [saveMsg, setSaveMsg] = useState('');

    const toggle = useCallback(() => setOpen(o => !o), []);

    // Escape key
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.code === 'Escape') toggle(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [toggle]);

    const toggleFps = () => {
        const next = !fps;
        setFps(next);
        window.dispatchEvent(new CustomEvent('toggle-fps-debug', { detail: next }));
    };

    const togglePhysics = () => {
        const next = !physics;
        setPhysics(next);
        window.dispatchEvent(new CustomEvent('toggle-physics-debug', { detail: next }));
    };

    const save = () => {
        window.dispatchEvent(new CustomEvent('save-game'));
        setSaveMsg('Saved!');
        setTimeout(() => setSaveMsg(''), 2000);
    };

    const load = () => {
        window.dispatchEvent(new CustomEvent('load-game'));
        setOpen(false);
    };

    // Prevent touch events leaking through the overlay into the game
    const eat = (e: React.TouchEvent | React.MouseEvent) => e.stopPropagation();

    return (
        <>
            {/* ── Hamburger button ─────────────────────────────────────── */}
            <button
                onMouseDown={(e) => { e.stopPropagation(); toggle(); }}
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
                style={{
                    position:       'fixed',
                    top:            '16px',
                    left:           '16px',
                    width:          '44px',
                    height:         '44px',
                    background:     'rgba(0,0,0,0.6)',
                    border:         '1px solid rgba(255,255,255,0.25)',
                    borderRadius:   '8px',
                    color:          '#fff',
                    fontSize:       '20px',
                    cursor:         'pointer',
                    zIndex:         1001,
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    pointerEvents:  'all',
                    backdropFilter: 'blur(4px)',
                    touchAction:    'none',
                    userSelect:     'none',
                }}
            >
                ☰
            </button>

            {/* ── Menu overlay ─────────────────────────────────────────── */}
            {open && (
                <div
                    onMouseDown={eat}
                    onTouchStart={eat}
                    style={{
                        position:      'fixed',
                        inset:         0,
                        background:    'rgba(0,0,0,0.75)',
                        zIndex:        1000,
                        display:       'flex',
                        alignItems:    'center',
                        justifyContent:'center',
                        pointerEvents: 'all',
                    }}
                >
                    <div style={{
                        width:          '290px',
                        background:     'rgba(8,8,8,0.96)',
                        border:         '1px solid rgba(255,255,255,0.1)',
                        borderTop:      '3px solid #ffe066',
                        borderRadius:   '10px',
                        padding:        '24px 20px',
                        backdropFilter: 'blur(8px)',
                    }}>
                        <div style={{
                            fontFamily:   'sans-serif',
                            fontSize:     '18px',
                            fontWeight:   800,
                            color:        '#ffe066',
                            marginBottom: '20px',
                            letterSpacing:'1.5px',
                        }}>
                            MENU
                        </div>

                        {/* Debug toggles */}
                        <button style={fps     ? BTN_ON : BTN}
                            onMouseDown={toggleFps}
                            onTouchStart={(e) => { e.preventDefault(); toggleFps(); }}>
                            FPS Overlay &nbsp; {fps     ? '● ON' : '○ OFF'}
                        </button>

                        <button style={physics ? BTN_ON : BTN}
                            onMouseDown={togglePhysics}
                            onTouchStart={(e) => { e.preventDefault(); togglePhysics(); }}>
                            Physics Debug &nbsp; {physics ? '● ON' : '○ OFF'}
                        </button>

                        <hr style={DIVIDER} />

                        {/* Save / Load */}
                        <button style={BTN}
                            onMouseDown={save}
                            onTouchStart={(e) => { e.preventDefault(); save(); }}>
                            {saveMsg || 'Save Game'}
                        </button>

                        <button style={BTN}
                            onMouseDown={load}
                            onTouchStart={(e) => { e.preventDefault(); load(); }}>
                            Load Game
                        </button>

                        <hr style={DIVIDER} />

                        {/* Resume */}
                        <button
                            style={{ ...BTN, borderLeftColor: '#ff6644', marginBottom: 0 }}
                            onMouseDown={toggle}
                            onTouchStart={(e) => { e.preventDefault(); toggle(); }}>
                            Resume
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
