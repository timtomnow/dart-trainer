import type { StorageAdapter } from '@/storage/adapter';
import { buildManifest } from './manifest';

export async function exportBackup(adapter: StorageAdapter, appVersion: string): Promise<void> {
  const manifest = await buildManifest(adapter, appVersion);
  const json = JSON.stringify(manifest, null, 2);
  const date = manifest.exportedAt.slice(0, 10);
  const filename = `dart-trainer-backup-${date}.json`;

  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const handle = await (
        window as Window & { showSaveFilePicker: (opts: unknown) => Promise<FileSystemFileHandle> }
      ).showSaveFilePicker({
        suggestedName: filename,
        types: [{ description: 'JSON backup', accept: { 'application/json': ['.json'] } }]
      });
      const writable = await handle.createWritable();
      await writable.write(json);
      await writable.close();
      return;
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return;
      // Fall through to <a> approach on other errors
    }
  }

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
