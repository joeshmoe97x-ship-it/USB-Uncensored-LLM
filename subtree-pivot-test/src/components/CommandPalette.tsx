import { useEffect, useMemo, useRef, useState, ComponentType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, ArrowRight } from 'lucide-react';

export interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  icon: ComponentType<{ className?: string }>;
  shortcut?: string;
  keywords?: string[];
  action: () => void;
}

export function CommandPalette({
  open, onClose, items,
}: {
  open: boolean;
  onClose: () => void;
  items: PaletteItem[];
}) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      it.label.toLowerCase().includes(q) ||
      (it.description?.toLowerCase().includes(q)) ||
      (it.keywords?.some((k) => k.toLowerCase().includes(q)))
    );
  }, [query, items]);

  useEffect(() => { setActiveIdx(0); }, [query]);

  const run = (i: PaletteItem) => { i.action(); onClose(); };

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(filtered.length - 1, i + 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
      if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[activeIdx];
        if (item) run(item);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, activeIdx, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[150]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-[151] flex items-start justify-center pt-[12vh] px-4 pointer-events-none"
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
          >
            <div className="w-full max-w-xl bg-[#0a0a14]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60 pointer-events-auto overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
                <Search className="w-4 h-4 text-gray-500 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Jump to a section..."
                  className="bg-transparent outline-none text-sm text-white placeholder:text-gray-500 flex-1"
                />
                <kbd className="hidden sm:inline text-[10px] font-mono text-gray-500 border border-white/10 px-1.5 py-0.5 rounded">ESC</kbd>
              </div>
              <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
                {filtered.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500">
                    No results for &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  <ul className="py-1">
                    {filtered.map((it, idx) => {
                      const Icon = it.icon;
                      const active = idx === activeIdx;
                      return (
                        <li key={it.id}>
                          <button
                            onMouseEnter={() => setActiveIdx(idx)}
                            onClick={() => run(it)}
                            className={
                              'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ' +
                              (active
                                ? 'bg-blue-600/10 text-blue-200'
                                : 'text-gray-300 hover:bg-white/[0.04]')
                            }
                          >
                            <div className={
                              'p-1.5 rounded-md shrink-0 ' +
                              (active ? 'bg-blue-500/20 text-blue-300' : 'bg-white/5 text-gray-400')
                            }>
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{it.label}</div>
                              {it.description && <div className="text-[11px] text-gray-500 truncate">{it.description}</div>}
                            </div>
                            {it.shortcut && <kbd className="text-[10px] font-mono text-gray-500 border border-white/10 px-1.5 py-0.5 rounded">⌘{it.shortcut}</kbd>}
                            {active && <ArrowRight className="w-3.5 h-3.5 text-blue-400" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-white/10 bg-black/30 text-[10px] text-gray-500">
                <div className="flex items-center gap-3">
                  <span><kbd className="font-mono">↑↓</kbd> navigate</span>
                  <span><kbd className="font-mono">↵</kbd> select</span>
                  <span><kbd className="font-mono">esc</kbd> close</span>
                </div>
                <span className="font-mono uppercase tracking-wider">OmniSight CMD</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
