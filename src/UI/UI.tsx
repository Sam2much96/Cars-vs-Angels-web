import { useState, useEffect } from "react";
import { uiStore } from "./ui-score";



export default function UI() {

  const [cash, setCash] = useState<number>(uiStore.cash);
  const [health, setHealth] = useState<number>(uiStore.health);

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


