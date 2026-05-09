import type { ReactNode } from 'react';

type Props = {
  participantId: string;
  participantNames: Record<string, string>;
  children: ReactNode;
};

export function participantLabel(
  participantId: string,
  participantNames: Record<string, string>,
  fallback = 'Player'
): string {
  return participantNames[participantId] ?? `${fallback} ${participantId.slice(-4)}`;
}

export function ParticipantSection({ participantId, participantNames, children }: Props) {
  return (
    <div className="space-y-2" data-testid={`participant-section-${participantId}`}>
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {participantLabel(participantId, participantNames)}
      </h3>
      {children}
    </div>
  );
}
