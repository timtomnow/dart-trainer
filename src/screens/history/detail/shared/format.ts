export function formatDuration(startedAt: string, endedAt: string | undefined): string {
  if (!endedAt) return 'ongoing';
  const ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

export function formatStartedAt(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function formatAvg(n: number): string {
  return n.toFixed(2);
}

export function formatPct(n: number | null): string {
  return n === null ? '—' : `${n.toFixed(1)}%`;
}

export function formatPctFraction(n: number | null): string {
  return n === null ? '—' : `${(n * 100).toFixed(1)}%`;
}
