import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { TooltipProvider } from './components/charts/TooltipContext';
import { StoreProvider } from './store/StoreContext';
import { ToastProvider } from './store/ToastContext';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('找不到 #root 挂载点');

createRoot(container).render(
  <StrictMode>
    <StoreProvider>
      <ToastProvider>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </ToastProvider>
    </StoreProvider>
  </StrictMode>,
);
