import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { initInstallPromptCapture } from '@/app/install';
import { StorageProvider } from '@/app/providers/StorageProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { router } from '@/app/routes';
import '@/index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root in index.html');

initInstallPromptCapture();

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <StorageProvider>
          <RouterProvider router={router} />
        </StorageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);
