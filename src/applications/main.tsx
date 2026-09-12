import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ApplicationsPage } from './ApplicationsPage';
import './applications.css';

createRoot(document.getElementById('applications-root')!).render(
  <StrictMode>
    <ApplicationsPage />
  </StrictMode>,
);
