import { useStorage } from '@/app/providers/StorageProvider';
import { exportBackup } from '@/backup/export';
import { applyManifest, importBackup, validateBackupFile } from '@/backup/import';
import type { ImportResult } from '@/backup/import';
import type { BackupManifest } from '@/domain/types';

export type { ImportResult };

export function useBackup() {
  const adapter = useStorage();
  const appVersion = import.meta.env['VITE_APP_VERSION'] ?? '0.0.0';

  return {
    exportBackup: (): Promise<void> => exportBackup(adapter, appVersion),
    validateBackupFile: (file: File): Promise<{ manifest: BackupManifest; counts: ImportResult }> =>
      validateBackupFile(file),
    applyManifest: (manifest: BackupManifest): Promise<ImportResult> =>
      applyManifest(manifest, adapter),
    importBackup: (file: File): Promise<ImportResult> => importBackup(file, adapter)
  };
}
