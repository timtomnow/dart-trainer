export function fmtAvg(value: number): string {
  return value.toFixed(1);
}

export function fmtPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function fmtDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${hh}:${mm}`;
}
