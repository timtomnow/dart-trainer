import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CRICKET_DEFAULT_CONFIG,
  CRICKET_GAME_ID,
  type CricketConfig
} from '@/games/cricket';
import {
  X01_DEFAULT_CONFIG,
  X01_GAME_ID,
  type X01Config,
  type X01InRule,
  type X01OutRule,
  type X01StartScore
} from '@/games/x01';
import { useKeypadLayout, useProfile, useSessions } from '@/hooks';

export function PlayScreen() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { create } = useSessions({ status: 'in_progress' });
  const [x01Config, setX01Config] = useState<X01Config>(X01_DEFAULT_CONFIG);
  const [cricketConfig, setCricketConfig] = useState<CricketConfig>(CRICKET_DEFAULT_CONFIG);
  const { keypadLayout, setKeypadLayout } = useKeypadLayout();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onStartX01 = async () => {
    if (!profile) return;
    setStarting(true);
    setError(null);
    try {
      const session = await create({
        gameModeId: X01_GAME_ID,
        gameConfig: x01Config,
        participants: [profile.id]
      });
      navigate(`/game/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStarting(false);
    }
  };

  const onStartCricket = async () => {
    if (!profile) return;
    setStarting(true);
    setError(null);
    try {
      const session = await create({
        gameModeId: CRICKET_GAME_ID,
        gameConfig: cricketConfig,
        participants: [profile.id]
      });
      navigate(`/game/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStarting(false);
    }
  };

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">Play</h1>

      <div className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <h2 className="text-lg font-semibold">X01</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          301 / 501 / 701 with double-in and double/masters/straight out rules.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-slate-500 dark:text-slate-400">Start score</span>
            <select
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={x01Config.startScore}
              onChange={(e) =>
                setX01Config((c) => ({ ...c, startScore: Number(e.target.value) as X01StartScore }))
              }
              data-testid="x01-start-score"
            >
              <option value={301}>301</option>
              <option value={501}>501</option>
              <option value={701}>701</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="text-slate-500 dark:text-slate-400">Legs to win</span>
            <input
              type="number"
              min={1}
              max={9}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={x01Config.legsToWin}
              onChange={(e) =>
                setX01Config((c) => ({
                  ...c,
                  legsToWin: Math.max(1, Math.min(9, Number(e.target.value) || 1))
                }))
              }
              data-testid="x01-legs-to-win"
            />
          </label>

          <label className="text-sm">
            <span className="text-slate-500 dark:text-slate-400">In rule</span>
            <select
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={x01Config.inRule}
              onChange={(e) =>
                setX01Config((c) => ({ ...c, inRule: e.target.value as X01InRule }))
              }
              data-testid="x01-in-rule"
            >
              <option value="straight">Straight in</option>
              <option value="double">Double in</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="text-slate-500 dark:text-slate-400">Out rule</span>
            <select
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={x01Config.outRule}
              onChange={(e) =>
                setX01Config((c) => ({ ...c, outRule: e.target.value as X01OutRule }))
              }
              data-testid="x01-out-rule"
            >
              <option value="straight">Straight out</option>
              <option value="double">Double out</option>
              <option value="masters">Masters out</option>
            </select>
          </label>

          <label className="text-sm sm:col-span-2">
            <span className="text-slate-500 dark:text-slate-400">Keypad layout</span>
            <select
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={keypadLayout}
              onChange={(e) => setKeypadLayout(e.target.value as 'sequential' | 'dartboard')}
              data-testid="x01-keypad-layout"
            >
              <option value="sequential">Sequential (1–20)</option>
              <option value="dartboard">Dartboard (clock layout)</option>
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={onStartX01}
          disabled={!profile || starting}
          className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="x01-start"
        >
          {starting ? 'Starting…' : 'Start X01'}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <h2 className="text-lg font-semibold">Cricket</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          15–20 and bull. Close numbers and outscore your opponents.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-slate-500 dark:text-slate-400">Legs to win</span>
            <input
              type="number"
              min={1}
              max={9}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              value={cricketConfig.legsToWin}
              onChange={(e) =>
                setCricketConfig((c) => ({
                  ...c,
                  legsToWin: Math.max(1, Math.min(9, Number(e.target.value) || 1))
                }))
              }
              data-testid="cricket-legs-to-win"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={onStartCricket}
          disabled={!profile || starting}
          className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid="cricket-start"
        >
          {starting ? 'Starting…' : 'Start Cricket'}
        </button>
      </div>
    </section>
  );
}
