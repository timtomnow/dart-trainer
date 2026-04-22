import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@/domain/types';
import {
  CRICKET_DEFAULT_CONFIG,
  CRICKET_GAME_ID,
  type CricketConfig
} from '@/games/cricket';
import {
  RTW_DEFAULT_CONFIG,
  RTW_GAME_ID,
  type RtwConfig,
  type RtwGameType,
  type RtwMode,
  type RtwOrder,
  seededShuffle
} from '@/games/rtw';
import {
  RTW_SCORING_DEFAULT_CONFIG,
  RTW_SCORING_GAME_ID,
  type RtwScoringConfig,
  type RtwScoringGameType,
  type RtwScoringMode,
  type RtwScoringOrder
} from '@/games/rtw-scoring';
import {
  X01_DEFAULT_CONFIG,
  X01_GAME_ID,
  type X01Config,
  type X01InRule,
  type X01OutRule,
  type X01StartScore
} from '@/games/x01';
import { useKeypadLayout, useProfile, useSessions } from '@/hooks';

function ResumeCard({
  session,
  label,
  onResume,
  onStartNew
}: {
  session: Session;
  label: string;
  onResume: () => void;
  onStartNew: () => void;
}) {
  return (
    <div
      className="rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950"
      data-testid={`resume-card-${session.gameModeId}`}
    >
      <div className="text-sm font-medium text-amber-900 dark:text-amber-200">
        In-progress {label} session
      </div>
      <div className="mt-1 text-xs text-amber-800 dark:text-amber-300">
        Started {new Date(session.startedAt).toLocaleString()}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onResume}
          className="inline-flex items-center rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-500"
          data-testid={`resume-btn-${session.gameModeId}`}
        >
          Resume
        </button>
        <button
          type="button"
          onClick={onStartNew}
          className="inline-flex items-center rounded-md border border-amber-400 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900"
          data-testid={`start-new-btn-${session.gameModeId}`}
        >
          Start new game
        </button>
      </div>
    </div>
  );
}

const SELECT_CLS =
  'mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900';

export function PlayScreen() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { sessions, create, discard } = useSessions({ status: 'in_progress' });
  const [x01Config, setX01Config] = useState<X01Config>(X01_DEFAULT_CONFIG);
  const [cricketConfig, setCricketConfig] = useState<CricketConfig>(CRICKET_DEFAULT_CONFIG);
  const [rtwConfig, setRtwConfig] = useState<RtwConfig>(RTW_DEFAULT_CONFIG);
  const [rtwScoringConfig, setRtwScoringConfig] = useState<RtwScoringConfig>(RTW_SCORING_DEFAULT_CONFIG);
  const { keypadLayout, setKeypadLayout } = useKeypadLayout();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resumableX01 = useMemo(() => {
    if (!profile) return null;
    return sessions.find(
      (s) => s.gameModeId === X01_GAME_ID && s.participants.includes(profile.id)
    ) ?? null;
  }, [sessions, profile]);

  const resumableCricket = useMemo(() => {
    if (!profile) return null;
    return sessions.find(
      (s) => s.gameModeId === CRICKET_GAME_ID && s.participants.includes(profile.id)
    ) ?? null;
  }, [sessions, profile]);

  const resumableRtw = useMemo(() => {
    if (!profile) return null;
    return sessions.find(
      (s) => s.gameModeId === RTW_GAME_ID && s.participants.includes(profile.id)
    ) ?? null;
  }, [sessions, profile]);

  const resumableRtwScoring = useMemo(() => {
    if (!profile) return null;
    return sessions.find(
      (s) => s.gameModeId === RTW_SCORING_GAME_ID && s.participants.includes(profile.id)
    ) ?? null;
  }, [sessions, profile]);

  const discardExisting = async (existingSession: Session) => {
    const confirmed = window.confirm(
      'Permanently discard this in-progress session? This cannot be undone.'
    );
    if (!confirmed) return;
    setError(null);
    try {
      await discard(existingSession.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const startSession = async (
    gameModeId: string,
    gameConfig: X01Config | CricketConfig | RtwConfig | RtwScoringConfig
  ) => {
    if (!profile) return;
    setStarting(true);
    setError(null);
    try {
      const session = await create({
        gameModeId,
        gameConfig,
        participants: [profile.id]
      });
      navigate(`/game/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStarting(false);
    }
  };

  const startRtw = async () => {
    let cfg = rtwConfig;
    if (cfg.order === 'Random') {
      const base = (cfg.excludeBull || cfg.gameType === 'Triple') 
        ? Array.from({ length: 20 }, (_, i) => i + 1)
        : [...Array.from({ length: 20 }, (_, i) => i + 1), 25];
      cfg = { ...cfg, customSequence: seededShuffle(base, String(Date.now())) };
    }
    await startSession(RTW_GAME_ID, cfg);
  };

  const startRtwScoring = async () => {
    let cfg = rtwScoringConfig;
    if (cfg.order === 'Random') {
      const base = (cfg.excludeBull || cfg.gameType === 'Triple') 
        ? Array.from({ length: 20 }, (_, i) => i + 1)
        : [...Array.from({ length: 20 }, (_, i) => i + 1), 25];
      cfg = { ...cfg, customSequence: seededShuffle(base, String(Date.now())) };
    }
    await startSession(RTW_SCORING_GAME_ID, cfg);
  };

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">Play</h1>

      <div className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <h2 className="text-lg font-semibold">X01</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          301 / 501 / 701 with double-in and double/masters/straight out rules.
        </p>

        {resumableX01 ? (
          <div className="mt-4">
            <ResumeCard
              session={resumableX01}
              label="X01"
              onResume={() => navigate(`/game/${resumableX01.id}`)}
              onStartNew={() => void discardExisting(resumableX01)}
            />
          </div>
        ) : (
          <>
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
              onClick={() => void startSession(X01_GAME_ID, x01Config)}
              disabled={!profile || starting}
              className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="x01-start"
            >
              {starting ? 'Starting…' : 'Start X01'}
            </button>
          </>
        )}

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

        {resumableCricket ? (
          <div className="mt-4">
            <ResumeCard
              session={resumableCricket}
              label="Cricket"
              onResume={() => navigate(`/game/${resumableCricket.id}`)}
              onStartNew={() => void discardExisting(resumableCricket)}
            />
          </div>
        ) : (
          <>
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
              onClick={() => void startSession(CRICKET_GAME_ID, cricketConfig)}
              disabled={!profile || starting}
              className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="cricket-start"
            >
              {starting ? 'Starting…' : 'Start Cricket'}
            </button>
          </>
        )}
      </div>

      {/* ── Round the World ───────────────────────────────────────────────── */}
      <div className="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <h2 className="text-lg font-semibold">Round the World</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Work through targets in sequence. Hit each to advance.
        </p>

        {resumableRtw ? (
          <div className="mt-4">
            <ResumeCard
              session={resumableRtw}
              label="Round the World"
              onResume={() => navigate(`/game/${resumableRtw.id}`)}
              onStartNew={() => void discardExisting(resumableRtw)}
            />
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-slate-500 dark:text-slate-400">Game type</span>
                <select
                  className={SELECT_CLS}
                  value={rtwConfig.gameType}
                  onChange={(e) =>
                    setRtwConfig((c) => ({ ...c, gameType: e.target.value as RtwGameType }))
                  }
                  data-testid="rtw-game-type"
                >
                  <option value="Single">Single</option>
                  <option value="Single Inner">Single Inner</option>
                  <option value="Single Outer">Single Outer</option>
                  <option value="Double">Double</option>
                  <option value="Triple">Triple</option>
                </select>
              </label>

              <label className="text-sm">
                <span className="text-slate-500 dark:text-slate-400">Mode</span>
                <select
                  className={SELECT_CLS}
                  value={rtwConfig.mode}
                  onChange={(e) =>
                    setRtwConfig((c) => ({ ...c, mode: e.target.value as RtwMode }))
                  }
                  data-testid="rtw-mode"
                >
                  <option value="Hit once">Hit once</option>
                  <option value="3 darts per target">3 darts per target</option>
                  <option value="1-dart per target">1-dart per target</option>
                  <option value="3-darts until hit 1">3-darts until hit 1</option>
                  <option value="3-darts until hit 2">3-darts until hit 2</option>
                  <option value="3-darts until hit 3">3-darts until hit 3</option>
                </select>
              </label>

              <label className="text-sm">
                <span className="text-slate-500 dark:text-slate-400">Order</span>
                <select
                  className={SELECT_CLS}
                  value={rtwConfig.order}
                  onChange={(e) =>
                    setRtwConfig((c) => ({ ...c, order: e.target.value as RtwOrder }))
                  }
                  data-testid="rtw-order"
                >
                  <option value="1-20">1–20</option>
                  <option value="20-1">20–1</option>
                  <option value="Clockwise">Clockwise</option>
                  <option value="Counter Clockwise">Counter Clockwise</option>
                  <option value="Random">Random</option>
                </select>
              </label>

              {rtwConfig.gameType !== 'Triple' && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rtwConfig.excludeBull}
                    onChange={(e) =>
                      setRtwConfig((c) => ({ ...c, excludeBull: e.target.checked }))
                    }
                    data-testid="rtw-exclude-bull"
                  />
                  <span className="text-slate-700 dark:text-slate-300">Exclude bull</span>
                </label>
              )}
            </div>

            <button
              type="button"
              onClick={() => void startRtw()}
              disabled={!profile || starting}
              className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="rtw-start"
            >
              {starting ? 'Starting…' : 'Start RTW'}
            </button>
          </>
        )}
      </div>

      {/* ── RTW Scoring ───────────────────────────────────────────────────── */}
      <div className="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <h2 className="text-lg font-semibold">RTW Scoring</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Round the World with weighted scoring: single=1×, double=2×, triple=3×.
        </p>

        {resumableRtwScoring ? (
          <div className="mt-4">
            <ResumeCard
              session={resumableRtwScoring}
              label="RTW Scoring"
              onResume={() => navigate(`/game/${resumableRtwScoring.id}`)}
              onStartNew={() => void discardExisting(resumableRtwScoring)}
            />
          </div>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="text-slate-500 dark:text-slate-400">Game type</span>
                <select
                  className={SELECT_CLS}
                  value={rtwScoringConfig.gameType}
                  onChange={(e) =>
                    setRtwScoringConfig((c) => ({
                      ...c,
                      gameType: e.target.value as RtwScoringGameType
                    }))
                  }
                  data-testid="rtws-game-type"
                >
                  <option value="Single">Single</option>
                  <option value="Single Inner">Single Inner</option>
                  <option value="Single Outer">Single Outer</option>
                  <option value="Double">Double</option>
                  <option value="Triple">Triple</option>
                </select>
              </label>

              <label className="text-sm">
                <span className="text-slate-500 dark:text-slate-400">Mode</span>
                <select
                  className={SELECT_CLS}
                  value={rtwScoringConfig.mode}
                  onChange={(e) =>
                    setRtwScoringConfig((c) => ({ ...c, mode: e.target.value as RtwScoringMode }))
                  }
                  data-testid="rtws-mode"
                >
                  <option value="Hit once">Hit once</option>
                  <option value="3 darts per target">3 darts per target</option>
                  <option value="1-dart per target">1-dart per target</option>
                  <option value="3-darts until hit 1">3-darts until hit 1</option>
                  <option value="3-darts until hit 2">3-darts until hit 2</option>
                  <option value="3-darts until hit 3">3-darts until hit 3</option>
                </select>
              </label>

              <label className="text-sm">
                <span className="text-slate-500 dark:text-slate-400">Order</span>
                <select
                  className={SELECT_CLS}
                  value={rtwScoringConfig.order}
                  onChange={(e) =>
                    setRtwScoringConfig((c) => ({
                      ...c,
                      order: e.target.value as RtwScoringOrder
                    }))
                  }
                  data-testid="rtws-order"
                >
                  <option value="1-20">1–20</option>
                  <option value="20-1">20–1</option>
                  <option value="Clockwise">Clockwise</option>
                  <option value="Counter Clockwise">Counter Clockwise</option>
                  <option value="Random">Random</option>
                </select>
              </label>

              {rtwScoringConfig.gameType !== 'Triple' && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={rtwScoringConfig.excludeBull}
                    onChange={(e) =>
                      setRtwScoringConfig((c) => ({ ...c, excludeBull: e.target.checked }))
                    }
                    data-testid="rtws-exclude-bull"
                  />
                  <span className="text-slate-700 dark:text-slate-300">Exclude bull</span>
                </label>
              )}
            </div>

            <button
              type="button"
              onClick={() => void startRtwScoring()}
              disabled={!profile || starting}
              className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="rtws-start"
            >
              {starting ? 'Starting…' : 'Start RTW Scoring'}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
