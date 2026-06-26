import { useEffect, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export function DetailModal({
  open, onClose, title, subtitle, children, footer, maxWidthClass,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClass?: string;
}) {
  // Escape-to-close (the only Escape handler in the app besides CommandPalette).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[180] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className="fixed inset-0 z-[181] flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="detail-modal-title"
              className={
                'bg-[#0a0a14] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 w-full pointer-events-auto overflow-hidden ' +
                (maxWidthClass ?? 'max-w-2xl')
              }
            >
              <div className="flex items-start justify-between p-5 border-b border-white/10">
                <div>
                  <h3 id="detail-modal-title" className="text-base font-semibold text-white">{title}</h3>
                  {subtitle && <p className="text-[11px] text-gray-500 mt-0.5 font-mono">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white shrink-0 p-1 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {children}
              </div>
              {footer && <div className="p-4 border-t border-white/10 bg-black/30">{footer}</div>}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
