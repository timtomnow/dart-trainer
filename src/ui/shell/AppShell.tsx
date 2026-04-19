import { NavLink, Outlet } from 'react-router-dom';

type NavItem = { to: string; label: string; end?: boolean };

const NAV: ReadonlyArray<NavItem> = [
  { to: '/', label: 'Home', end: true },
  { to: '/play', label: 'Play' },
  { to: '/history', label: 'History' },
  { to: '/stats', label: 'Stats' },
  { to: '/settings', label: 'Settings' }
];

const railLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white'
      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  ].join(' ');

const tabLinkClass = ({ isActive }: { isActive: boolean }) =>
  [
    'flex flex-1 flex-col items-center justify-center py-2 text-xs font-medium',
    isActive
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-slate-600 dark:text-slate-400'
  ].join(' ');

export function AppShell() {
  return (
    <div className="flex min-h-full flex-col md:flex-row">
      <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-slate-200 md:p-4 md:dark:border-slate-800">
        <div className="mb-6 text-lg font-semibold">TTN Darts Trainer</div>
        <nav aria-label="Primary">
          <ul className="flex flex-col gap-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={railLinkClass}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="flex-1 px-4 pb-24 pt-4 md:pb-6" role="main">
        <Outlet />
      </main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 md:hidden"
      >
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={tabLinkClass}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
