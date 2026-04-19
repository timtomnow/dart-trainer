import { createBrowserRouter } from 'react-router-dom';
import { BootGate } from '@/app/BootGate';
import { HistoryScreen } from '@/screens/history';
import { HomeScreen } from '@/screens/home';
import { PlayScreen } from '@/screens/play';
import { SettingsScreen } from '@/screens/settings';
import { StatsScreen } from '@/screens/stats';
import { AppShell } from '@/ui/shell/AppShell';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <BootGate>
        <AppShell />
      </BootGate>
    ),
    children: [
      { index: true, element: <HomeScreen /> },
      { path: 'play', element: <PlayScreen /> },
      { path: 'history', element: <HistoryScreen /> },
      { path: 'stats', element: <StatsScreen /> },
      { path: 'settings', element: <SettingsScreen /> }
    ]
  }
]);
