import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { PlaygroundApp } from './app/PlaygroundApp.js';
import './styles.css';

const root = document.querySelector<HTMLElement>('#root');
if (root === null) throw new Error('Missing Playground root');

createRoot(root).render(
  <StrictMode>
    <PlaygroundApp />
  </StrictMode>,
);
