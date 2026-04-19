import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { StorageProvider } from '@/app/providers/StorageProvider';
import { HomeScreen } from '@/screens/home';
import { DartTrainerDB, DexieStorageAdapter } from '@/storage/dexie';

function makeAdapter() {
  const db = new DartTrainerDB(`smoke_${Math.random().toString(36).slice(2)}`);
  return new DexieStorageAdapter({ db, appVersion: '0.0.0-test' });
}

describe('HomeScreen', () => {
  it('renders the Home heading', async () => {
    render(
      <MemoryRouter>
        <StorageProvider adapter={makeAdapter()}>
          <HomeScreen />
        </StorageProvider>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /home/i })).toBeInTheDocument();
    });
  });
});

describe('test environment', () => {
  it('has indexedDB available via fake-indexeddb', () => {
    expect(typeof indexedDB.open).toBe('function');
  });
});
