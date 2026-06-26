import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  detail?: string;
}

interface Ctx { push: (t: Omit<ToastItem, 'id'>) => void; }
const ToastContext = createContext<Ctx>({ push: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push: Ctx['push'] = (t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, ...t }]);
  };

  const dismiss = (id: string) => setToasts((prev) => prev.filter((x) => x.id !== id));

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        role="region"
        aria-live="polite"
        aria-label="Notifications"
        className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-auto pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastCard key={t.id} t={t} dismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ t, dismiss }: { t: ToastItem; dismiss: (id: string) => void }) {
  // Stash dismiss in a ref so the auto-dismiss timer doesn't reset on every
  // parent re-render (parent's `dismiss` gets a new identity each render).
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  useEffect(() => {
    const timer = setTimeout(() => dismissRef.current(t.id), 5000);
    return () => clearTimeout(timer);
  }, [t.id]);

  const palette = {
    success: { ring: 'ring-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-300', Icon: CheckCircle2 },
    error:   { ring: 'ring-red-500/30',     bg: 'bg-red-500/10',     text: 'text-red-300',     Icon: XCircle },
    warning: { ring: 'ring-amber-500/30',   bg: 'bg-amber-500/10',   text: 'text-amber-300',   Icon: AlertTriangle },
    info:    { ring: 'ring-blue-500/30',    bg: 'bg-blue-500/10',    text: 'text-blue-300',    Icon: Info },
  }[t.type];

  const Icon = palette.Icon;

  return (
    <motion.div
      role="status"
      layout
      initial={{ opacity: 0, x: 40, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 360, damping: 30 }}
      className={
        'flex items-start gap-3 p-4 rounded-xl border border-white/10 bg-[#0a0a14]/95 backdrop-blur-xl ring-1 pointer-events-auto shadow-2xl shadow-black/40 min-w-[280px] ' +
        palette.ring
      }
    >
      <div className={'p-1.5 rounded-md shrink-0 ' + palette.bg + ' ' + palette.text}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={'text-sm font-semibold ' + palette.text}>{t.message}</div>
        {t.detail && <div className="text-xs text-gray-400 mt-0.5 break-words">{t.detail}</div>}
      </div>
      <button
        onClick={() => dismiss(t.id)}
        className="text-gray-500 hover:text-white shrink-0 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
