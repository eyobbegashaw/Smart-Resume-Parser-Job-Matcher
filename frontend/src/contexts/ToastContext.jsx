import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info
};

const STYLES = {
  success:
    'border-emerald-200 bg-white text-slate-900 dark:border-emerald-800/70 dark:bg-slate-900 dark:text-slate-100',
  error:
    'border-rose-200 bg-white text-slate-900 dark:border-rose-800/70 dark:bg-slate-900 dark:text-slate-100',
  info:
    'border-sky-200 bg-white text-slate-900 dark:border-sky-800/70 dark:bg-slate-900 dark:text-slate-100'
};

const ICON_COLORS = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-rose-600 dark:text-rose-400',
  info: 'text-sky-600 dark:text-sky-400'
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = 'info', duration = 4200) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
      return id;
    },
    [removeToast]
  );

  const toast = useMemo(
    () => ({
      success: (msg, duration) => showToast(msg, 'success', duration),
      error: (msg, duration) => showToast(msg, 'error', duration),
      info: (msg, duration) => showToast(msg, 'info', duration)
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-20 z-50 flex w-full max-w-sm flex-col gap-2.5 px-4 sm:px-0"
      >
        {toasts.map((item) => {
          const Icon = ICONS[item.type] || Info;
          return (
            <div
              key={item.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-xl transition-all duration-200 ${STYLES[item.type] || STYLES.info}`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ICON_COLORS[item.type] || ICON_COLORS.info}`} />
              <p className="flex-1 text-sm font-medium leading-snug">{item.message}</p>
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
