import { useState, useEffect } from 'react';

interface FPSState {
    active:     boolean;
    crosshair:  string;
    weaponName: string;
    hitMarker:  boolean;
}

export function FPSOverlay() {
    const [state, setState] = useState<FPSState>({
        active:     false,
        crosshair:  './crosshair.png',
        weaponName: '',
        hitMarker:  false,
    });

    useEffect(() => {
        const onEnter = (e: Event) => {
            const { crosshair, name } = (e as CustomEvent).detail;
            setState(s => ({ ...s, active: true, crosshair, weaponName: name }));
        };
        const onExit = () => setState(s => ({ ...s, active: false, hitMarker: false }));
        const onWeaponChange = (e: Event) => {
            const { crosshair, name } = (e as CustomEvent).detail;
            setState(s => ({ ...s, crosshair, weaponName: name }));
        };
        const onHitMarker = (e: Event) => {
            setState(s => ({ ...s, hitMarker: (e as CustomEvent<{ active: boolean }>).detail.active }));
        };

        window.addEventListener('fps-mode-enter',    onEnter);
        window.addEventListener('fps-mode-exit',     onExit);
        window.addEventListener('fps-weapon-change', onWeaponChange);
        window.addEventListener('fps-hitmarker',     onHitMarker);

        return () => {
            window.removeEventListener('fps-mode-enter',    onEnter);
            window.removeEventListener('fps-mode-exit',     onExit);
            window.removeEventListener('fps-weapon-change', onWeaponChange);
            window.removeEventListener('fps-hitmarker',     onHitMarker);
        };
    }, []);

    if (!state.active) return null;

    const handleExit         = () => window.dispatchEvent(new CustomEvent('fps-toggle'));
    const handleSwitchWeapon = () => window.dispatchEvent(new CustomEvent('fps-switch-weapon'));
    const handleFireStart    = () => window.dispatchEvent(new CustomEvent('fps-fire-start'));
    const handleFireStop     = () => window.dispatchEvent(new CustomEvent('fps-fire-stop'));

    return (
        <div style={{
            position:      'fixed',
            inset:         0,
            pointerEvents: 'none',
            zIndex:        1500,
        }}>
            {/* Crosshair — centre of screen */}
            <img
                src={state.crosshair}
                style={{
                    position:        'absolute',
                    top:             '50%',
                    left:            '50%',
                    transform:       'translate(-50%, -50%)',
                    width:           32,
                    height:          32,
                    imageRendering:  'pixelated',
                    opacity:         0.9,
                }}
            />

            {/* Hit marker — flashes over crosshair when a shot connects */}
            {state.hitMarker && (
                <img
                    src="./hit.png"
                    style={{
                        position:       'absolute',
                        top:            '50%',
                        left:           '50%',
                        transform:      'translate(-50%, -50%)',
                        width:          28,
                        height:         28,
                        imageRendering: 'pixelated',
                    }}
                />
            )}

            {/* Fire — large primary button, bottom-right */}
            <button
                onPointerDown={handleFireStart}
                onPointerUp={handleFireStop}
                onPointerLeave={handleFireStop}
                onPointerCancel={handleFireStop}
                style={{
                    position:       'absolute',
                    bottom:         '24px',
                    right:          '24px',
                    pointerEvents:  'auto',
                    width:          '80px',
                    height:         '80px',
                    borderRadius:   '50%',
                    background:     'rgba(180,30,30,0.75)',
                    color:          '#fff',
                    border:         '2px solid rgba(255,100,100,0.6)',
                    fontSize:       '28px',
                    lineHeight:     1,
                    cursor:         'pointer',
                    userSelect:     'none',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    touchAction:    'none',
                }}
            >
                🔥
            </button>

            {/* Switch weapon — smaller button, above fire */}
            <button
                onPointerDown={handleSwitchWeapon}
                style={{
                    position:       'absolute',
                    bottom:         '120px',
                    right:          '24px',
                    pointerEvents:  'auto',
                    width:          '52px',
                    height:         '52px',
                    borderRadius:   '50%',
                    background:     'rgba(0,0,0,0.6)',
                    color:          '#fff',
                    border:         '2px solid rgba(255,255,255,0.35)',
                    fontSize:       '20px',
                    lineHeight:     1,
                    cursor:         'pointer',
                    userSelect:     'none',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    touchAction:    'none',
                }}
            >
                🔫
            </button>

            {/* Exit FPS — smaller button, above switch weapon */}
            <button
                onPointerDown={handleExit}
                style={{
                    position:       'absolute',
                    bottom:         '188px',
                    right:          '24px',
                    pointerEvents:  'auto',
                    width:          '52px',
                    height:         '52px',
                    borderRadius:   '50%',
                    background:     'rgba(0,0,0,0.6)',
                    color:          '#fff',
                    border:         '2px solid rgba(255,255,255,0.35)',
                    fontSize:       '18px',
                    lineHeight:     1,
                    cursor:         'pointer',
                    userSelect:     'none',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    touchAction:    'none',
                }}
            >
                ✕
            </button>

            {/* Weapon name — bottom right */}
            <div style={{
                position:   'absolute',
                bottom:     '280px',
                right:      '24px',
                textAlign:  'right',
                fontFamily: 'monospace',
                fontSize:   '15px',
                fontWeight: 'bold',
                color:      'rgba(255,255,255,0.75)',
                textShadow: '1px 1px 3px #000',
            }}>
                {state.weaponName}
            </div>
        </div>
    );
}
