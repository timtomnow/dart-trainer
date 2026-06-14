import type { X01InRule, X01OutRule, X01StartScore } from '@/games/x01/config';
import type { X01AvailableConfigs, X01ConfigFilter } from '@/stats/x01Legs';

const IN_RULE_LABELS: Record<X01InRule, string> = {
  straight: 'Straight in',
  double: 'Double in'
};

const OUT_RULE_LABELS: Record<X01OutRule, string> = {
  straight: 'Straight out',
  double: 'Double out',
  masters: 'Masters out'
};

type Props = {
  available: X01AvailableConfigs;
  value: X01ConfigFilter;
  onChange: (next: X01ConfigFilter) => void;
  showDifficulty: boolean;
};

function Select({
  label,
  testId,
  current,
  options,
  onPick
}: {
  label: string;
  testId: string;
  current: string;
  options: Array<{ value: string; label: string }>;
  onPick: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
        {label}
      </span>
      <select
        value={current}
        onChange={(e) => onPick(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800"
        data-testid={testId}
      >
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function X01ConfigFilter({ available, value, onChange, showDifficulty }: Props) {
  const showStart = available.startScores.length > 1;
  const showIn = available.inRules.length > 1;
  const showOut = available.outRules.length > 1;
  const showDiff = showDifficulty && available.difficulties.length > 1;

  if (!showStart && !showIn && !showOut && !showDiff) return null;

  return (
    <div className="flex flex-wrap items-end gap-3" data-testid="x01-config-filter">
      {showStart && (
        <Select
          label="Start score"
          testId="x01-filter-start"
          current={value.startScore !== undefined ? String(value.startScore) : ''}
          options={available.startScores.map((s) => ({ value: String(s), label: String(s) }))}
          onPick={(v) =>
            onChange({ ...value, startScore: v ? (Number(v) as X01StartScore) : undefined })
          }
        />
      )}
      {showIn && (
        <Select
          label="In rule"
          testId="x01-filter-in"
          current={value.inRule ?? ''}
          options={available.inRules.map((r) => ({ value: r, label: IN_RULE_LABELS[r] }))}
          onPick={(v) => onChange({ ...value, inRule: v ? (v as X01InRule) : undefined })}
        />
      )}
      {showOut && (
        <Select
          label="Out rule"
          testId="x01-filter-out"
          current={value.outRule ?? ''}
          options={available.outRules.map((r) => ({ value: r, label: OUT_RULE_LABELS[r] }))}
          onPick={(v) => onChange({ ...value, outRule: v ? (v as X01OutRule) : undefined })}
        />
      )}
      {showDiff && (
        <Select
          label="Computer level"
          testId="x01-filter-difficulty"
          current={value.difficulty !== undefined ? String(value.difficulty) : ''}
          options={available.difficulties.map((d) => ({ value: String(d), label: `Level ${d}` }))}
          onPick={(v) => onChange({ ...value, difficulty: v ? Number(v) : undefined })}
        />
      )}
    </div>
  );
}
