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
import { VirtualJoystickOverlay } from '../UI/Inputs/VirtualJoystick.tsx';
import { VirtualButton } from '../UI/Inputs/VirtualButton.tsx';
import { TitleScreen } from './TitleScreen.tsx';

const inventory = new Inventory();

export default function UI() {

    const [cash,      setCash]      = useState<number>(inventory.cash);
    const [health,    setHealth]    = useState<number>(inventory.health);
    const [inVehicle, setInVehicle] = useState<boolean>(false);

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

    // ── button handlers ─────────────────────────────────────────
    const handleInteract   = () => window.dispatchEvent(new CustomEvent("player-interact"));
    const handleGravityOff = () => window.dispatchEvent(new CustomEvent("vehicle-gravity-off"));
    const handleGravityOn  = () => window.dispatchEvent(new CustomEvent("vehicle-gravity-on"));

    // ── render ──────────────────────────────────────────────────
    return (
        <>
            {/* Title screen — sits above everything, removes itself once Human loads */}
            <TitleScreen />

            <div id="clock">{time}</div>
            <div id="cash">${cash.toLocaleString()}</div>
            <div id="health">❤ {health}</div>

            <VirtualJoystickOverlay />

            <VirtualButton label="Enter" onClick={handleInteract} />

            {inVehicle && (
                <>
                    <VirtualButton label="Fly"  onClick={handleGravityOff} bottom="160px" right="60px"  />
                    <VirtualButton label="Land" onClick={handleGravityOn}  bottom="160px" right="150px" />
                </>
            )}
        </>
    );
}