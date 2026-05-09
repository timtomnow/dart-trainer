import type { DetailSectionProps } from '../registry';
import { CommonConfigItems } from '../shared/CommonConfigItems';
import { ConfigGrid, ConfigItem } from '../shared/ConfigGrid';
import { ParticipantSection } from '../shared/ParticipantSection';
import { RtwPerTargetTable } from './PerTargetTable';
import { RtwStatsPanel } from './StatsPanel';
import { parseRtwConfig } from '@/games/rtw/config';

export function ConfigSummary({ session }: DetailSectionProps) {
  const config = parseRtwConfig(session.gameConfig);
  return (
    <ConfigGrid>
      <ConfigItem label="Game type" value={config.gameType} />
      <ConfigItem label="Mode" value={config.mode} />
      <ConfigItem label="Order" value={config.order} />
      <ConfigItem
        label="Bull"
        value={config.gameType === 'Triple' || config.excludeBull ? 'Excluded' : 'Included'}
      />
      <CommonConfigItems session={session} />
    </ConfigGrid>
  );
}

export function CustomContent({ session, events, participantNames }: DetailSectionProps) {
  const isMulti = session.participants.length > 1;

  return (
    <>
      <section>
        <h2 className="mb-3 text-base font-semibold">Per-target progression</h2>
        <div className="space-y-4">
          {session.participants.map((pid) =>
            isMulti ? (
              <ParticipantSection
                key={pid}
                participantId={pid}
                participantNames={participantNames}
              >
                <RtwPerTargetTable session={session} events={events} participantId={pid} />
              </ParticipantSection>
            ) : (
              <RtwPerTargetTable
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
                <RtwStatsPanel session={session} events={events} participantId={pid} />
              </ParticipantSection>
            ) : (
              <RtwStatsPanel
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
