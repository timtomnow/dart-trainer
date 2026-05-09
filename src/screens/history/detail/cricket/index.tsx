import type { DetailSectionProps } from '../registry';
import { CommonConfigItems } from '../shared/CommonConfigItems';
import { ConfigGrid, ConfigItem } from '../shared/ConfigGrid';
import { ParticipantSection, participantLabel } from '../shared/ParticipantSection';
import { CricketPerLegTable } from './PerLegTable';
import { CricketPerTargetTable } from './PerTargetTable';
import { CricketStatsPanel } from './StatsPanel';
import { parseCricketConfig } from '@/games/cricket/config';
import { buildCricketState } from '@/games/cricket/replay';

export function ConfigSummary({ session, events, participantNames }: DetailSectionProps) {
  const config = parseCricketConfig(session.gameConfig);
  const state = buildCricketState(events, config, session.participants, session.id);

  const matchScore =
    session.participants.length === 0
      ? '—'
      : session.participants
          .map((pid) => `${participantLabel(pid, participantNames)}: ${state.legsWon[pid] ?? 0}`)
          .join('  ·  ');

  return (
    <ConfigGrid>
      <ConfigItem label="Legs to win" value={config.legsToWin} />
      <ConfigItem label="Players" value={session.participants.length} />
      <ConfigItem label="Match score" value={matchScore} testId="detail-cricket-match-score" />
      <ConfigItem label="Game" value="Cricket" />
      <CommonConfigItems session={session} />
    </ConfigGrid>
  );
}

export function CustomContent({ session, events, participantNames }: DetailSectionProps) {
  const isMulti = session.participants.length > 1;

  return (
    <>
      <section>
        <h2 className="mb-3 text-base font-semibold">Per-leg breakdown</h2>
        <div className="space-y-4">
          {session.participants.map((pid) =>
            isMulti ? (
              <ParticipantSection
                key={pid}
                participantId={pid}
                participantNames={participantNames}
              >
                <CricketPerLegTable session={session} events={events} participantId={pid} />
              </ParticipantSection>
            ) : (
              <CricketPerLegTable
                key={pid}
                session={session}
                events={events}
                participantId={pid}
              />
            )
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Per-target breakdown</h2>
        <div className="space-y-4">
          {session.participants.map((pid) =>
            isMulti ? (
              <ParticipantSection
                key={pid}
                participantId={pid}
                participantNames={participantNames}
              >
                <CricketPerTargetTable session={session} events={events} participantId={pid} />
              </ParticipantSection>
            ) : (
              <CricketPerTargetTable
                key={pid}
                session={session}
                events={events}
                participantId={pid}
              />
            )
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Stats</h2>
        <div className="space-y-4">
          {session.participants.map((pid) =>
            isMulti ? (
              <ParticipantSection
                key={pid}
                participantId={pid}
                participantNames={participantNames}
              >
                <CricketStatsPanel session={session} events={events} participantId={pid} />
              </ParticipantSection>
            ) : (
              <CricketStatsPanel
                key={pid}
                session={session}
                events={events}
                participantId={pid}
              />
            )
          )}
        </div>
      </section>
    </>
  );
}
