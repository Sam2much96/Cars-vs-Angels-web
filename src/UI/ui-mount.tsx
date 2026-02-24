// ui-mount.tsx

/**
 * 
 * Ui mount.tsx
 * 
 * Mounts and renders the UI react component in the dom
 * 
 * to do:
 * (1) create player inventory object
 */
import ReactDOM from 'react-dom/client';
import UI from './UI.tsx';

import "./styles/react-gta-style.css"; // duplicate of styles.css

const container = document.createElement('div');
document.body.appendChild(container);
const root = ReactDOM.createRoot(container);

// rener the UI component as root
root.render(<UI/>);