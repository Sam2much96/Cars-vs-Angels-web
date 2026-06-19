/**
 * 
 * UI
 * 
 * Features:
 * (1) GTA style UI in react
 * (2) Shows health and cash as react components
 * (3) usings ui-score.ts as database of health and cash numbers
 * (4) Title screen that hides once Human.ts finishes loading
 * 
 * to do:
 * (1) add gta style inventory UI (done)
 * (2) add a gta 3 style mouse icon
 * 
 */
import { useState, useEffect } from "react";
import { Inventory } from "./Inventory/Inventory";
import { VirtualJoystickOverlay, CameraJoystickOverlay } from '../UI/Inputs/VirtualJoystick.tsx';
import { VirtualButton } from '../UI/Inputs/VirtualButton.tsx';
import { TitleScreen } from './TitleScreen.tsx';
import { PauseMenu }   from './PauseMenu.tsx';
import { GameOver }    from './GameOver.tsx';
import { FPSOverlay }  from './FPSOverlay.tsx';
import './styles/styles.css';

const inventory = new Inventory();

export default function UI() {

    const [cash,      setCash]      = useState<number>(inventory.cash);
    const [health,    setHealth]    = useState<number>(inventory.health);
    const [inVehicle, setInVehicle] = useState<boolean>(false);
    const [inFPS,     setInFPS]     = useState<boolean>(false);

    // ── inventory / health updates ──────────────────────────────
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail.cash   !== undefined) setCash(detail.cash);
            if (detail.health !== undefined) setHealth(detail.health);
        };
        window.addEventListener('ui-update', handler);
        return () => window.removeEventListener('ui-update', handler);
    }, []);

    // ── vehicle enter / exit ────────────────────────────────────
    useEffect(() => {
        const onEnter = () => {
            console.log("vehicle-enter received in UI");
            setInVehicle(true);
        };
        const onExit = () => {
            console.log("vehicle-exit received in UI");
            setInVehicle(false);
        };

        window.addEventListener("vehicle-enter", onEnter);
        window.addEventListener("vehicle-exit",  onExit);

        return () => {
            window.removeEventListener("vehicle-enter", onEnter);
            window.removeEventListener("vehicle-exit",  onExit);
        };
    }, []);

    // ── clock ───────────────────────────────────────────────────
    const getTimeString = (): string => {
        const now = new Date();
        return [
            now.getHours()  .toString().padStart(2, "0"),
            now.getMinutes().toString().padStart(2, "0"),
            now.getSeconds().toString().padStart(2, "0"),
        ].join(":");
    };

    const [time, setTime] = useState<string>(getTimeString);

    useEffect(() => {
        const interval = setInterval(() => setTime(getTimeString()), 1000);
        return () => clearInterval(interval);
    }, []);

    // ── FPS mode enter / exit ───────────────────────────────────
    useEffect(() => {
        const onEnter = () => setInFPS(true);
        const onExit  = () => setInFPS(false);
        window.addEventListener('fps-mode-enter', onEnter);
        window.addEventListener('fps-mode-exit',  onExit);
        return () => {
            window.removeEventListener('fps-mode-enter', onEnter);
            window.removeEventListener('fps-mode-exit',  onExit);
        };
    }, []);

    // ── button handlers ─────────────────────────────────────────
    const handleInteract   = () => window.dispatchEvent(new CustomEvent("player-interact"));
    const handleGravityOff = () => window.dispatchEvent(new CustomEvent("vehicle-gravity-off"));
    const handleGravityOn  = () => window.dispatchEvent(new CustomEvent("vehicle-gravity-on"));
    const handleFPSToggle  = () => window.dispatchEvent(new CustomEvent("fps-toggle"));

    // ── render ──────────────────────────────────────────────────
    return (
        <>
            {/* Title screen — sits above everything, removes itself once Human loads */}
            <TitleScreen />
            <PauseMenu />
            <GameOver />
            <FPSOverlay />

            <div id="clock">{time}</div>
            <div id="cash">${cash.toLocaleString()}</div>
            <div id="health">❤ {health}</div>

            <VirtualJoystickOverlay />
            <CameraJoystickOverlay />

            {/* Circular action-button cluster — bottom-right corner */}
            {!inFPS && (
                <div style={{
                    position:      'fixed',
                    bottom:        '10px',
                    right:         '10px',
                    width:         '200px',
                    height:        '200px',
                    pointerEvents: 'none',
                    zIndex:        10,
                }}>
                    {/* Circle: centre (100,100), r=65. Button 60px → offset -30 to centre.
                        FPS   top:  5px  left: 70px  (top    of circle)
                        Enter top: 70px  left:135px  (right  of circle)
                        Fly   top: 70px  left:  5px  (left   of circle)
                        Land  top:135px  left: 70px  (bottom of circle) */}
                    <VirtualButton label="FPS"   top="5px"   left="70px"  onClick={handleFPSToggle}  />
                    <VirtualButton label="Enter" top="70px"  left="135px" onClick={handleInteract}   />
                    {inVehicle && <VirtualButton label="Fly"  top="70px"  left="5px"  onClick={handleGravityOff} />}
                    {inVehicle && <VirtualButton label="Land" top="135px" left="70px" onClick={handleGravityOn}  />}
                </div>
            )}
        </>
    );
}