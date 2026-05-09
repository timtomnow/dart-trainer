import type { GameEvent, Session } from '@/domain/types';
import { parseRtwScoringConfig } from '@/games/rtw-scoring/config';
import { buildRtwScoringState } from '@/games/rtw-scoring/replay';
import type { RtwScoringMultiplier } from '@/games/rtw-scoring/types';

type Props = {
  session: Session;
  events: GameEvent[];
  participantId: string;
};

const MULT_LABEL: Record<RtwScoringMultiplier, string> = {
  miss: '—',
  single: 'S',
  double: 'D',
  triple: 'T'
};

const MULT_COLOR: Record<RtwScoringMultiplier, string> = {
  miss: 'text-slate-400',
  single: 'text-slate-700 dark:text-slate-200',
  double: 'text-emerald-700 dark:text-emerald-400',
  triple: 'text-violet-700 dark:text-violet-400'
};

function targetLabel(value: number): string {
  return value === 25 ? 'Bull' : String(value);
}

export function RtwScoringPerTargetGrid({ session, events, participantId }: Props) {
  const config = parseRtwScoringConfig(session.gameConfig);
  const state = buildRtwScoringState(events, config, session.participants, session.id);

  const rows = state.targetSequence.map((targetValue, targetIndex) => {
    const turn = state.turns.find(
      (t) => t.targetIndexAtStart === targetIndex && t.participantId === participantId
    );
    return {
      targetIndex,
      targetValue,
      darts: turn?.darts ?? [],
      total: turn?.turnScore ?? 0,
      attempted: turn !== undefined
    };
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" data-testid={`rtws-target-grid-${participantId}`}>
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500 dark:border-slate-700">
            <th className="pb-2 pr-3 font-medium">#</th>
            <th className="pb-2 pr-3 font-medium">Target</th>
            <th className="pb-2 pr-3 font-medium">Dart 1</th>
            <th className="pb-2 pr-3 font-medium">Dart 2</th>
            <th className="pb-2 pr-3 font-medium">Dart 3</th>
            <th className="pb-2 font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.targetIndex}
              className="border-b border-slate-100 dark:border-slate-800"
              data-testid={`rtws-target-row-${participantId}-${r.targetIndex}`}
            >
              <td className="py-1.5 pr-3 tabular-nums text-slate-400">{r.targetIndex + 1}</td>
              <td className="py-1.5 pr-3 font-medium">{targetLabel(r.targetValue)}</td>
              {[0, 1, 2].map((i) => {
                const d = r.darts[i];
                if (!d) {
                  return (
                    <td key={i} className="py-1.5 pr-3 text-slate-300 dark:text-slate-600">
                      {r.attempted ? '—' : ''}
                    </td>
                  );
                }
                return (
                  <td
                    key={i}
                    className={`py-1.5 pr-3 font-medium ${MULT_COLOR[d.multiplier]}`}
                  >
                    {MULT_LABEL[d.multiplier]} ({d.score})
                  </td>
                );
              })}
              <td className="py-1.5 font-semibold tabular-nums">
                {r.attempted ? r.total : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
