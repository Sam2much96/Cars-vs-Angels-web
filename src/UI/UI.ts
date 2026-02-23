/**
 * 
 * 
 * UI in Typescript
 * 
 * to do:
 * (1) port to react
 * 
 */

// ------------------------------------------------------
// UI
// ------------------------------------------------------
import "../style.css";


export class UI{

    private clockElement: HTMLDivElement;
    private cashElement: HTMLDivElement;
    private healthElement: HTMLDivElement;

    constructor(){

        this.clockElement = document.createElement('div');
        this.clockElement.id = 'clock';
        this.clockElement.textContent = '00:00:00';

        // Create cash element
        this.cashElement = document.createElement('div');
        this.cashElement.id = 'cash';
        this.cashElement.textContent = '$10000000';

        // Create health element
        this.healthElement = document.createElement('div');
        this.healthElement.id = 'health';
        this.healthElement.textContent = " ❤️ "+'100';


           // Add elements to the document
        document.body.appendChild(this.clockElement);
        document.body.appendChild(this.cashElement);
        document.body.appendChild(this.healthElement);


        const clockElement = document.getElementById('clock');

        function updateClock() {
        if (!clockElement) return;

        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');

        clockElement.textContent = `${hours}:${minutes}:${seconds}`;
        }
        // Update every second
        setInterval(updateClock, 1000);

        // Initialize immediately
        updateClock();
    }


}
