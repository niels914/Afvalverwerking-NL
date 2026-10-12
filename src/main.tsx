import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles/tokens.css';
import './styles/components.css';
import './styles/print.css';
import { App } from './App';
import { RolProvider } from './components/betaalmuur/RolContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <RolProvider>
        <App />
      </RolProvider>
    </BrowserRouter>
  </StrictMode>,
);
