import { useRef, useState } from 'react';
import type { ImportResult } from '@/backup/import';
import type { BackupManifest } from '@/domain/types';
import { useBackup } from '@/hooks/useBackup';

type PendingImport = {
  manifest: BackupManifest;
  counts: ImportResult;
};

type Status =
  | { kind: 'idle' }
  | { kind: 'exporting' }
  | { kind: 'export-ok' }
  | { kind: 'export-err'; message: string }
  | { kind: 'validating' }
  | { kind: 'import-pending'; pending: PendingImport }
  | { kind: 'importing' }
  | { kind: 'import-ok'; counts: ImportResult }
  | { kind: 'import-err'; message: string };

export function DataSection() {
  const { exportBackup, validateBackupFile, applyManifest } = useBackup();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    setStatus({ kind: 'exporting' });
    try {
      await exportBackup();
      setStatus({ kind: 'export-ok' });
    } catch (err) {
      setStatus({ kind: 'export-err', message: err instanceof Error ? err.message : String(err) });
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setStatus({ kind: 'validating' });
    try {
      const { manifest, counts } = await validateBackupFile(file);
      setStatus({ kind: 'import-pending', pending: { manifest, counts } });
    } catch (err) {
      setStatus({
        kind: 'import-err',
        message: err instanceof Error ? err.message : String(err)
      });
    }
  }

  async function handleConfirmImport() {
    if (status.kind !== 'import-pending') return;
    const { manifest, counts } = status.pending;
    setStatus({ kind: 'importing' });
    try {
      await applyManifest(manifest);
      setStatus({ kind: 'import-ok', counts });
    } catch (err) {
      setStatus({
        kind: 'import-err',
        message: err instanceof Error ? err.message : String(err)
      });
    }
  }

  function dismiss() {
    setStatus({ kind: 'idle' });
  }

  const busy = status.kind === 'exporting' || status.kind === 'validating' || status.kind === 'importing';

  return (
    <div className="mt-8">
      <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Data</h2>

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={busy}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {status.kind === 'exporting' ? 'Exporting…' : 'Export backup'}
        </button>

        <label
          className={[
            'cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
            busy ? 'pointer-events-none opacity-50' : ''
          ].join(' ')}
        >
          {status.kind === 'validating' ? 'Validating…' : status.kind === 'importing' ? 'Importing…' : 'Import backup'}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            disabled={busy}
            onChange={(e) => void handleFileChange(e)}
          />
        </label>
      </div>

      {status.kind === 'export-ok' && (
        <p role="status" className="mt-3 text-sm text-green-600 dark:text-green-400">
          Backup exported successfully.{' '}
          <button type="button" onClick={dismiss} className="underline">
            Dismiss
          </button>
        </p>
      )}

      {(status.kind === 'export-err' || status.kind === 'import-err') && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {status.kind === 'export-err' ? 'Export' : 'Import'} failed: {status.message}.{' '}
          <button type="button" onClick={dismiss} className="underline">
            Dismiss
          </button>
        </p>
      )}

      {status.kind === 'import-ok' && (
        <p role="status" className="mt-3 text-sm text-green-600 dark:text-green-400">
          Imported {status.counts.profiles} profile{status.counts.profiles !== 1 ? 's' : ''},{' '}
          {status.counts.sessions} session{status.counts.sessions !== 1 ? 's' : ''},{' '}
          {status.counts.events} event{status.counts.events !== 1 ? 's' : ''}.{' '}
          <button type="button" onClick={dismiss} className="underline">
            Dismiss
          </button>
        </p>
      )}

      {status.kind === 'import-pending' && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-import-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h3
              id="confirm-import-title"
              className="text-base font-semibold text-slate-900 dark:text-white"
            >
              Replace all data?
            </h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              This will replace <strong>all current data</strong> with the contents of the backup:
            </p>
            <ul className="mt-2 list-inside list-disc text-sm text-slate-700 dark:text-slate-200">
              <li>
                {status.pending.counts.profiles} profile
                {status.pending.counts.profiles !== 1 ? 's' : ''}
              </li>
              <li>
                {status.pending.counts.sessions} session
                {status.pending.counts.sessions !== 1 ? 's' : ''}
              </li>
              <li>
                {status.pending.counts.events} event
                {status.pending.counts.events !== 1 ? 's' : ''}
              </li>
            </ul>
            <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
              Existing data on this device will be lost. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => void handleConfirmImport()}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Replace data
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
