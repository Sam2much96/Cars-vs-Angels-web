/**
 * 
 * UI
 * 
 * Features:
 * (1) GTA style UI in react
 * (2) Shows health and cash as react components
 * (3) usings ui-score.ts as database of health and cash numbers
 * 
 * to do:
 * (1) add gta style inventory UI
 * (2) add a titlescreen
 * (3) add a gta 3 style mouse icon
 * 
 */

import { useState, useEffect } from "react";
//import { uiStore } from "./ui-score";
import { Inventory } from "./Inventory/Inventory";


const inventory =new Inventory();

export default function UI() {

  const [cash, setCash] = useState<number>(inventory.cash);
  const [health, setHealth] = useState<number>(inventory.health);

    useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.cash !== undefined) setCash(detail.cash);
      if (detail.health !== undefined) setHealth(detail.health);
    };
    window.addEventListener('ui-update', handler);
    return () => window.removeEventListener('ui-update', handler);
  }, []);



  const getTimeString = (): string => {
    const now = new Date();
    return [
      now.getHours().toString().padStart(2, "0"),
      now.getMinutes().toString().padStart(2, "0"),
      now.getSeconds().toString().padStart(2, "0"),
    ].join(":");
  };

  const [time, setTime] = useState<string>(getTimeString);

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getTimeString());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      
      <div id="clock">{time}</div>
      <div id="cash">${cash.toLocaleString()}</div>
      <div id="health">❤ {health}</div>
    </>
  );
}


