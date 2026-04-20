import { createBrowserRouter } from 'react-router-dom';
import { BootGate } from '@/app/BootGate';
import { GameScreen } from '@/screens/game';
import { HistoryScreen } from '@/screens/history';
import { SessionDetailScreen } from '@/screens/history/SessionDetailScreen';
import { HomeScreen } from '@/screens/home';
import { PlayScreen } from '@/screens/play';
import { SettingsScreen } from '@/screens/settings';
import { StatsScreen } from '@/screens/stats';
import { AppShell } from '@/ui/shell/AppShell';

export const router = createBrowserRouter(
  [
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
        { path: 'game/:sessionId', element: <GameScreen /> },
        { path: 'history', element: <HistoryScreen /> },
        { path: 'history/:sessionId', element: <SessionDetailScreen /> },
        { path: 'stats', element: <StatsScreen /> },
        { path: 'settings', element: <SettingsScreen /> }
      ]
    }
  ],
  { basename: '/dart-trainer' }
);
