import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomeScreen } from '@/screens/home';

describe('HomeScreen', () => {
  it('renders the Home heading', () => {
    render(<HomeScreen />);
    expect(screen.getByRole('heading', { name: /home/i })).toBeInTheDocument();
  });
});

describe('test environment', () => {
  it('has indexedDB available via fake-indexeddb', () => {
    expect(typeof indexedDB.open).toBe('function');
  });
});
