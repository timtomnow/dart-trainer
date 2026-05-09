import type { DetailSectionProps } from '../registry';
import { CommonConfigItems } from '../shared/CommonConfigItems';
import { ConfigGrid, ConfigItem } from '../shared/ConfigGrid';
import { participantLabel } from '../shared/ParticipantSection';
import { X01LegTable } from './LegTable';
import { X01StatsPanel } from './StatsPanel';
import { parseX01Config, type X01OutRule } from '@/games/x01/config';
import { buildX01State } from '@/games/x01/replay';

const OUT_LABEL: Record<X01OutRule, string> = {
  straight: 'Straight-out',
  double: 'Double-out',
  masters: 'Masters-out'
};

export function ConfigSummary({ session, events, participantNames }: DetailSectionProps) {
  const config = parseX01Config(session.gameConfig);
  const state = buildX01State(events, config, session.participants, session.id);

  const matchScore =
    session.participants.length > 1
      ? session.participants
          .map((pid) => `${participantLabel(pid, participantNames)}: ${state.legsWon[pid] ?? 0}`)
          .join('  ·  ')
      : `${state.legsWon[session.participants[0] ?? ''] ?? 0} / ${config.legsToWin}`;

  return (
    <ConfigGrid>
      <ConfigItem label="Start score" value={config.startScore} testId="detail-start-score" />
      <ConfigItem
        label="In rule"
        value={<span className="capitalize">{config.inRule}</span>}
      />
      <ConfigItem label="Out rule" value={OUT_LABEL[config.outRule]} />
      <ConfigItem label="Legs to win" value={config.legsToWin} />
      <ConfigItem label="Match score" value={matchScore} testId="detail-x01-match-score" />
      <CommonConfigItems session={session} />
    </ConfigGrid>
  );
}

export function CustomContent({ session, events }: DetailSectionProps) {
  const participantId = session.participants[0] ?? '';
  return (
    <>
      <section>
        <h2 className="mb-3 text-base font-semibold">Legs</h2>
        <X01LegTable session={session} events={events} participantId={participantId} />
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Stats</h2>
        <X01StatsPanel session={session} events={events} participantId={participantId} />
      </section>
    </>
  );
}
