import { useState, type FormEvent } from 'react';
import { PROFILE_NAME_MAX, PROFILE_NAME_MIN } from '@/domain/schemas/playerProfile';
import type { PlayerProfile } from '@/domain/types';
import { useProfile, useProfiles } from '@/hooks';

export function ProfilesSection() {
  const { profiles, create, rename, archive, restore } = useProfiles({ includeArchived: true });
  const { profile: active, setActive } = useProfile();

  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (trimmed.length < PROFILE_NAME_MIN) {
      setCreateError('Name is required.');
      return;
    }
    setBusy(true);
    setCreateError(null);
    try {
      await create({ name: trimmed });
      setNewName('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create profile.');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (profile: PlayerProfile) => {
    setEditingId(profile.id);
    setEditValue(profile.name);
  };

  const commitEdit = async (id: string) => {
    const trimmed = editValue.trim();
    if (trimmed.length >= PROFILE_NAME_MIN) {
      await rename(id, trimmed);
    }
    setEditingId(null);
  };

  const visible = [...profiles].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <section aria-labelledby="profiles-heading" className="mt-10">
      <h2 id="profiles-heading" className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Profiles
      </h2>

      <form onSubmit={onCreate} className="mt-3 flex gap-2">
        <input
          aria-label="New profile name"
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={PROFILE_NAME_MAX}
          placeholder="Add a profile"
          className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add
        </button>
      </form>
      {createError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {createError}
        </p>
      )}

      <ul className="mt-4 divide-y divide-slate-200 rounded-md border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
        {visible.length === 0 && (
          <li className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">
            No profiles yet.
          </li>
        )}
        {visible.map((profile) => {
          const isActive = active?.id === profile.id;
          const isEditing = editingId === profile.id;
          return (
            <li
              key={profile.id}
              className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-2">
                {isEditing ? (
                  <input
                    aria-label={`Rename ${profile.name}`}
                    type="text"
                    value={editValue}
                    autoFocus
                    maxLength={PROFILE_NAME_MAX}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => commitEdit(profile.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit(profile.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(profile)}
                    className="truncate text-left text-sm font-medium text-slate-900 hover:underline dark:text-white"
                    title="Rename"
                  >
                    {profile.name}
                  </button>
                )}
                {isActive && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    Active
                  </span>
                )}
                {profile.archived && (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Archived
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {!profile.archived && !isActive && (
                  <button
                    type="button"
                    onClick={() => setActive(profile.id)}
                    className="rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Set active
                  </button>
                )}
                {profile.archived ? (
                  <button
                    type="button"
                    onClick={() => restore(profile.id)}
                    className="rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => archive(profile.id)}
                    className="rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Archive
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
