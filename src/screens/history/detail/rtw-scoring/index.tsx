import type { DetailSectionProps } from '../registry';
import { CommonConfigItems } from '../shared/CommonConfigItems';
import { ConfigGrid, ConfigItem } from '../shared/ConfigGrid';
import { ParticipantSection } from '../shared/ParticipantSection';
import { RtwScoringPerTargetGrid } from './PerTargetGrid';
import { RtwScoringStatsPanel } from './StatsPanel';
import { parseRtwScoringConfig } from '@/games/rtw-scoring/config';

export function ConfigSummary({ session }: DetailSectionProps) {
  const config = parseRtwScoringConfig(session.gameConfig);
  return (
    <ConfigGrid>
      <ConfigItem label="Order" value={config.order} />
      <ConfigItem label="Targets" value={21} />
      <ConfigItem label="Darts / target" value={3} />
      <ConfigItem label="Game" value="RTW Scoring" />
      <CommonConfigItems session={session} />
    </ConfigGrid>
  );
}

export function CustomContent({ session, events, participantNames }: DetailSectionProps) {
  const isMulti = session.participants.length > 1;

  return (
    <>
      <section>
        <h2 className="mb-3 text-base font-semibold">Per-target results</h2>
        <div className="space-y-4">
          {session.participants.map((pid) =>
            isMulti ? (
              <ParticipantSection
                key={pid}
                participantId={pid}
                participantNames={participantNames}
              >
                <RtwScoringPerTargetGrid session={session} events={events} participantId={pid} />
              </ParticipantSection>
            ) : (
              <RtwScoringPerTargetGrid
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
                <RtwScoringStatsPanel session={session} events={events} participantId={pid} />
              </ParticipantSection>
            ) : (
              <RtwScoringStatsPanel
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
