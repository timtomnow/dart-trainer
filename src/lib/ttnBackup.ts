// ttn-backup integration. See https://timtomnow.github.io/ttn-backup/
//
// Exposes `window.TTNBackupAdapter` so the ttn-backup utility can snapshot /
// restore Dart Trainer from a hidden iframe. Also exposes a thin wrapper that
// opens the cross-app Restore picker.
//
// The dart-trainer export/import helpers want a StorageAdapter instance, so
// this module is installed from `StorageProvider` once the adapter is ready.

import { exportBackup } from '@/backup/export';
import { applyManifest, validateBackupFile } from '@/backup/import';
import { buildManifest } from '@/backup/manifest';
import type { BackupManifest } from '@/domain/types';
import type { StorageAdapter } from '@/storage/adapter';

type TTNBackupAdapter = {
  appId: string;
  appName: string;
  version: number;
  exportData: () => Promise<BackupManifest>;
  importData: (data: unknown) => Promise<void>;
};

declare global {
  interface Window {
    TTNBackupAdapter?: TTNBackupAdapter;
    TTNBackup?: {
      openImport: (appId: string) => Promise<void>;
      listBundlesFor: (appId: string) => Promise<unknown[]>;
      __loaded?: boolean;
    };
  }
}

const APP_VERSION: string =
  (import.meta.env['VITE_APP_VERSION'] as string | undefined) ?? '0.0.0';

export function installTtnBackupAdapter(adapter: StorageAdapter): void {
  // Silence the unused-import warning — exportBackup is the file-download
  // helper that the in-app Settings page calls; the cross-app adapter only
  // needs the in-memory manifest.
  void exportBackup;

  window.TTNBackupAdapter = {
    appId: 'dart-trainer',
    appName: 'TTN Darts Trainer',
    version: 1,
    exportData: () => buildManifest(adapter, APP_VERSION),
    importData: async (data) => {
      // The ttn-backup envelope hands us whatever exportData returned. Round-
      // trip it through validateBackupFile so the existing schema, hash, and
      // migration checks all run unchanged.
      const json = JSON.stringify(data);
      const blob = new Blob([json], { type: 'application/json' });
      const file = new File([blob], 'ttn-backup.json', { type: 'application/json' });
      const { manifest } = await validateBackupFile(file);
      await applyManifest(manifest, adapter);
      // Many screens hold derived state from a prior session; mirror the
      // in-app import flow and reload after the swap.
      setTimeout(() => location.reload(), 100);
    },
  };
}

export function openTtnBackupRestore(): void {
  if (window.TTNBackup?.openImport) {
    void window.TTNBackup.openImport('dart-trainer');
  } else {
    throw new Error('ttn-backup client not loaded. Check that /ttn-backup/client.js is reachable.');
  }
}
