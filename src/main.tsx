import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { StorageProvider } from '@/app/providers/StorageProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { router } from '@/app/routes';
import '@/index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Missing #root in index.html');

createRoot(rootEl).render(
  <StrictMode>
    <ThemeProvider>
      <StorageProvider>
        <RouterProvider router={router} />
      </StorageProvider>
    </ThemeProvider>
  </StrictMode>
);
