import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastItem } from '../types/architecture';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => {
        const icon =
          toast.variant === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          ) : toast.variant === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
          );

        const borderClass =
          toast.variant === 'error'
            ? 'border-rose-300 dark:border-rose-500/40'
            : toast.variant === 'success'
              ? 'border-emerald-300 dark:border-emerald-500/40'
              : 'border-slate-200 dark:border-slate-700';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-white dark:bg-slate-900 border ${borderClass} shadow-lg text-sm text-slate-800 dark:text-slate-100`}
          >
            <div className="mt-0.5">{icon}</div>
            <p className="flex-1 text-[13px] leading-snug">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
