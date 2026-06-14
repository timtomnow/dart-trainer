import { X01FamilyPanel } from './X01FamilyPanel';
import type { StatsPanelProps } from './shared';

export function Panel(props: StatsPanelProps) {
  return <X01FamilyPanel {...props} gameModeId="x01" />;
}
