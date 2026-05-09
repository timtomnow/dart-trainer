import type { DetailSectionProps } from '../registry';
import { CommonConfigItems } from '../shared/CommonConfigItems';
import { ConfigGrid, ConfigItem } from '../shared/ConfigGrid';
import { CheckoutPerFinishTable } from './PerFinishTable';
import { CheckoutStatsPanel } from './StatsPanel';
import { parseCheckoutConfig } from '@/games/checkout/config';

const MODE_LABEL = {
  targeted: 'Targeted',
  random: 'Random'
} as const;

const OUT_LABEL = {
  double: 'Double-out',
  masters: 'Masters-out'
} as const;

export function ConfigSummary({ session }: DetailSectionProps) {
  const config = parseCheckoutConfig(session.gameConfig);
  return (
    <ConfigGrid>
      <ConfigItem label="Mode" value={MODE_LABEL[config.mode]} />
      <ConfigItem label="Out rule" value={OUT_LABEL[config.outRule]} />
      <ConfigItem label="Attempts / finish" value={config.attemptsPerFinish} />
      <ConfigItem label="Finishes" value={config.finishes.length} />
      <CommonConfigItems session={session} />
    </ConfigGrid>
  );
}

export function CustomContent({ session, events }: DetailSectionProps) {
  return (
    <>
      <section>
        <h2 className="mb-3 text-base font-semibold">Per-finish breakdown</h2>
        <CheckoutPerFinishTable session={session} events={events} />
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">Stats</h2>
        <CheckoutStatsPanel session={session} events={events} />
      </section>
    </>
  );
}
