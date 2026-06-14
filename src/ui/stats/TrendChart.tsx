import { fmtAvg } from '@/stats/formatters';

export type TrendChartPoint = {
  sessionId: string;
  value: number;
};

const CHART_W = 400;
const CHART_H = 100;
const PAD = 12;

type Props = {
  points: TrendChartPoint[];
  emptyHint: string;
  ariaLabel: string;
  format?: (value: number) => string;
};

export function TrendChart({ points, emptyHint, ariaLabel, format = fmtAvg }: Props) {
  if (points.length < 2) {
    return <p className="text-sm italic text-slate-500 dark:text-slate-400">{emptyHint}</p>;
  }

  const values = points.map((p) => p.value);
  const minY = Math.min(...values);
  const maxY = Math.max(...values);
  const rangeY = maxY - minY || 1;

  const innerW = CHART_W - PAD * 2;
  const innerH = CHART_H - PAD * 2;

  const toX = (i: number) => PAD + (i / (points.length - 1)) * innerW;
  const toY = (v: number) => PAD + innerH - ((v - minY) / rangeY) * innerH;

  return (
    <svg
      viewBox={`0 0 ${CHART_W} ${CHART_H}`}
      className="h-24 w-full"
      aria-label={ariaLabel}
      role="img"
    >
      <polyline
        points={points.map((p, i) => `${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`).join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-indigo-500"
      />
      {points.map((p, i) => (
        <circle key={p.sessionId || i} cx={toX(i)} cy={toY(p.value)} r="3" className="fill-indigo-500" />
      ))}
      <text x={PAD} y={CHART_H - 2} fontSize="9" className="fill-slate-400 dark:fill-slate-500">
        {format(minY)}
      </text>
      <text x={PAD} y={PAD + 8} fontSize="9" className="fill-slate-400 dark:fill-slate-500">
        {format(maxY)}
      </text>
      <title>{`${ariaLabel} from ${format(minY)} to ${format(maxY)}`}</title>
    </svg>
  );
}
