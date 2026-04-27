import { useEffect, useRef, type ReactNode } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  labelledBy?: string;
};

export function Modal({ open, onClose, title, children, labelledBy }: Props) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const titleId = labelledBy ?? 'modal-title';

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    closeBtnRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800"
      >
        <div className="flex items-start justify-between gap-4">
          <h3
            id={titleId}
            className="text-base font-semibold text-slate-900 dark:text-white"
          >
            {title}
          </h3>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M4.28 3.22a.75.75 0 0 0-1.06 1.06L8.94 10l-5.72 5.72a.75.75 0 1 0 1.06 1.06L10 11.06l5.72 5.72a.75.75 0 1 0 1.06-1.06L11.06 10l5.72-5.72a.75.75 0 0 0-1.06-1.06L10 8.94 4.28 3.22Z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        <div className="mt-3 text-sm text-slate-700 dark:text-slate-200">
          {children}
        </div>
      </div>
    </div>
  );
}
