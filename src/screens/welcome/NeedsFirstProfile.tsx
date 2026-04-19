import { useState, type FormEvent } from 'react';
import { PROFILE_NAME_MAX, PROFILE_NAME_MIN } from '@/domain/schemas/playerProfile';
import { useProfiles } from '@/hooks';

export function NeedsFirstProfile() {
  const { create } = useProfiles();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < PROFILE_NAME_MIN) {
      setError('Enter a name to continue.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await create({ name: trimmed });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setSubmitting(false);
    }
  };

  return (
    <main
      role="main"
      className="flex min-h-[100dvh] flex-col items-center justify-center px-6 py-10"
    >
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
          Welcome to TTN Darts Trainer
        </h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Your data stays on this device. Export backups to keep them safe.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
          <div>
            <label
              htmlFor="profile-name"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Your name
            </label>
            <input
              id="profile-name"
              type="text"
              autoComplete="off"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={PROFILE_NAME_MIN}
              maxLength={PROFILE_NAME_MAX}
              required
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              aria-invalid={error ? 'true' : 'false'}
              aria-describedby={error ? 'profile-name-error' : undefined}
            />
          </div>

          {error && (
            <p id="profile-name-error" role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Creating…' : 'Create profile'}
          </button>
        </form>
      </div>
    </main>
  );
}
