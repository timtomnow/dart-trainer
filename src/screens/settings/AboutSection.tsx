const REPO_URL = 'https://github.com/timtomnow/dart-trainer';
const ISSUES_URL = `${REPO_URL}/issues`;

export function AboutSection() {
  const version =
    typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

  return (
    <section aria-labelledby="about-heading" className="mt-10">
      <h2 id="about-heading" className="text-sm font-medium text-slate-700 dark:text-slate-300">
        About
      </h2>
      <div className="mt-3 rounded-md border border-slate-200 p-4 text-sm dark:border-slate-800">
        <p className="font-medium text-slate-900 dark:text-white">
          TTN Darts Trainer{' '}
          <span className="text-slate-500 dark:text-slate-400">v{version}</span>
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          &copy; timtomnow
        </p>
        <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">
          Local-first. No accounts. No telemetry. Data lives on this device — back
          up via Settings &rarr; Data.
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <li>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              GitHub repo
            </a>
          </li>
          <li>
            <a
              href={ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              Issues
            </a>
          </li>
        </ul>
      </div>
    </section>
  );
}
