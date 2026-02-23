// ui-mount.tsx

/**
 * 
 * Ui mount.tsx
 * 
 * Mounts and renders the UI react component in the dom
 * 
 */
import ReactDOM from 'react-dom/client';
import UI from './UI.tsx';

const container = document.createElement('div');
document.body.appendChild(container);
const root = ReactDOM.createRoot(container);
root.render(<UI/>);