import type { DetailSectionProps } from '../registry';
import { CommonConfigItems } from '../shared/CommonConfigItems';
import { ConfigGrid, ConfigItem } from '../shared/ConfigGrid';
import { X01LegTable } from '../x01/LegTable';
import { X01StatsPanel } from '../x01/StatsPanel';
import { parseX01Config, type X01OutRule } from '@/games/x01/config';
import { buildX01State } from '@/games/x01/replay';
import { X01VCConfig, type WhoGoesFirst } from '@/games/x01vc';

const OUT_LABEL: Record<X01OutRule, string> = {
  straight: 'Straight-out',
  double: 'Double-out',
  masters: 'Masters-out'
};

const WHO_LABEL: Record<WhoGoesFirst, string> = {
  user: 'You (every leg)',
  computer: 'Computer (every leg)',
  alternate: 'Alternate (you start)',
  random: 'Random'
};

function difficultyLabel(n: number): string {
  if (n <= 2) return 'Beginner';
  if (n <= 4) return 'Easy';
  if (n <= 6) return 'Medium';
  if (n <= 8) return 'Hard';
  return 'Expert';
}

function parseVcConfig(raw: unknown) {
  const result = X01VCConfig.safeParse(raw);
  return result.success ? result.data : null;
}

function identifyParticipants(
  session: { participants: string[]; gameConfig: unknown }
): { humanId: string; computerId: string | null } {
  const vc = parseVcConfig(session.gameConfig);
  const computerId = vc?.computerParticipantId ?? null;
  const humanId =
    session.participants.find((p) => p !== computerId) ??
    session.participants[0] ??
    '';
  return { humanId, computerId };
}

export function ConfigSummary({ session }: DetailSectionProps) {
  const config = parseX01Config(session.gameConfig);
  const vc = parseVcConfig(session.gameConfig);

  return (
    <ConfigGrid>
      <ConfigItem label="Start score" value={config.startScore} testId="detail-start-score" />
      <ConfigItem
        label="In rule"
        value={<span className="capitalize">{config.inRule}</span>}
      />
      <ConfigItem label="Out rule" value={OUT_LABEL[config.outRule]} />
      <ConfigItem label="Legs to win" value={config.legsToWin} />
      <ConfigItem
        label="Difficulty"
        value={
          vc !== null
            ? `${vc.computerDifficulty} — ${difficultyLabel(vc.computerDifficulty)}`
            : '—'
        }
      />
      <ConfigItem
        label="Who goes first"
        value={vc !== null ? WHO_LABEL[vc.whoGoesFirst] : '—'}
      />
      <CommonConfigItems session={session} />
    </ConfigGrid>
  );
}

export function CustomContent({ session, events, participantNames }: DetailSectionProps) {
  const config = parseX01Config(session.gameConfig);
  const state = buildX01State(events, config, session.participants, session.id);
  const { humanId, computerId } = identifyParticipants(session);

  const ordered: Array<{ id: string; label: string; testIdSuffix: string }> = [];
  if (humanId) {
    ordered.push({
      id: humanId,
      label: participantNames[humanId] ?? 'You',
      testIdSuffix: 'human'
    });
  }
  if (computerId) {
    ordered.push({
      id: computerId,
      label: 'Computer',
      testIdSuffix: 'computer'
    });
  }

  const humanLegs = state.legsWon[humanId] ?? 0;
  const computerLegs = computerId ? (state.legsWon[computerId] ?? 0) : 0;

  return (
    <>
      <section>
        <h2 className="mb-3 text-base font-semibold">Match</h2>
        <p
          className="text-sm text-slate-600 dark:text-slate-400"
          data-testid="x01vc-match-score"
        >
          You {humanLegs} — {computerLegs} Computer
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Legs</h2>
        <div className="space-y-4">
          {ordered.map(({ id, label, testIdSuffix }) => (
            <div key={id} className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {label}
              </h3>
              <X01LegTable
                session={session}
                events={events}
                participantId={id}
                testId={`x01vc-leg-table-${testIdSuffix}`}
              />
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Stats</h2>
        <div className="space-y-4">
          {ordered.map(({ id, label, testIdSuffix }) => (
            <div key={id} className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {label}
              </h3>
              <X01StatsPanel
                session={session}
                events={events}
                participantId={id}
                testId={`x01vc-stats-${testIdSuffix}`}
              />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
