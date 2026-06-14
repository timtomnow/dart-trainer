import { useCallback, useState } from 'react';
import { DEFAULT_FILTER, isStatsFilter, type StatsFilter } from '@/stats/filter';
import { readUiPrefs, writeUiPrefs } from '@/storage/uiPrefs';

export type UseStatsFilterResult = {
  filter: StatsFilter;
  setFilter: (next: StatsFilter) => void;
};

/**
 * The active stats filter, remembered across visits as a UI pref. Filter is a
 * view preference (not user content), so localStorage is the correct home.
 */
export function useStatsFilter(): UseStatsFilterResult {
  const [filter, setFilterState] = useState<StatsFilter>(() => {
    const stored = readUiPrefs().statsFilter;
    return isStatsFilter(stored) ? stored : DEFAULT_FILTER;
  });

  const setFilter = useCallback((next: StatsFilter) => {
    setFilterState(next);
    writeUiPrefs({ statsFilter: next });
  }, []);

  return { filter, setFilter };
}
