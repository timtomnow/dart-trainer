import { ConfigItem } from './ConfigGrid';
import { formatDuration, formatStartedAt } from './format';
import type { Session } from '@/domain/types';

const OUTCOME_LABEL: Record<Session['status'], string> = {
  in_progress: 'In progress',
  completed: 'Won',
  forfeited: 'Forfeited',
  abandoned: 'Abandoned',
  deleted: 'Deleted'
};

export function CommonConfigItems({ session }: { session: Session }) {
  return (
    <>
      <ConfigItem
        label="Started"
        value={formatStartedAt(session.startedAt)}
        testId="detail-started-at"
      />
      <ConfigItem
        label="Duration"
        value={formatDuration(session.startedAt, session.endedAt)}
        testId="detail-duration"
      />
      <ConfigItem
        label="Outcome"
        value={OUTCOME_LABEL[session.status]}
        testId="detail-outcome"
      />
    </>
  );
}
