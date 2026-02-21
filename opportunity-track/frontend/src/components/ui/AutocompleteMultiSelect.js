import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, ChevronDown, Search, Check } from 'lucide-react';

/**
 * AutocompleteMultiSelect — Premium reusable autocomplete component
 *
 * Props:
 *   options         string[]    — dataset to search/filter
 *   value           string[]    — selected values (multi) or string (single)
 *   onChange        fn          — called with new value(s)
 *   placeholder     string
 *   multiSelect     boolean     — enable multi-select (default: false)
 *   allowCustom     boolean     — allow values not in options (default: true)
 *   maxSelected     number      — max selections (default: unlimited)
 *   icon            ReactNode   — leading icon
 *   disabled        boolean
 */
export default function AutocompleteMultiSelect({
    options = [],
    value,
    onChange,
    placeholder = 'Type to search…',
    multiSelect = false,
    allowCustom = true,
    maxSelected,
    icon,
    disabled = false,
}) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [activeIdx, setActiveIdx] = useState(-1);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const containerRef = useRef(null);

    // Normalise internal values always as array for uniform logic
    const selected = useMemo(
        () => multiSelect ? (Array.isArray(value) ? value : []) : [],
        [multiSelect, value]
    );
    const singleValue = !multiSelect ? (value || '') : '';

    // ── Filtering ──────────────────────────────────────────────────────────
    const filtered = query.trim() === ''
        ? options.slice(0, 8)
        : options
            .filter(opt => opt.toLowerCase().includes(query.toLowerCase()))
            .sort((a, b) => {
                const al = a.toLowerCase(), bl = b.toLowerCase(), q = query.toLowerCase();
                if (al.startsWith(q) && !bl.startsWith(q)) return -1;
                if (!al.startsWith(q) && bl.startsWith(q)) return 1;
                return al.localeCompare(bl);
            })
            .slice(0, 12);

    const showCustom =
        allowCustom &&
        query.trim().length > 0 &&
        !filtered.some(o => o.toLowerCase() === query.toLowerCase()) &&
        (!multiSelect || !selected.some(s => s.toLowerCase() === query.toLowerCase()));

    const visibleItems = showCustom
        ? [...filtered, `__custom__${query.trim()}`]
        : filtered;

    // ── Actions ───────────────────────────────────────────────────────────
    const selectItem = useCallback((item) => {
        const val = item.startsWith('__custom__') ? item.replace('__custom__', '') : item;
        if (multiSelect) {
            if (selected.includes(val)) return;
            if (maxSelected && selected.length >= maxSelected) return;
            onChange([...selected, val]);
            setQuery('');
        } else {
            onChange(val);
            setQuery('');
            setOpen(false);
        }
        setActiveIdx(-1);
        inputRef.current?.focus();
    }, [multiSelect, selected, onChange, maxSelected]);

    const removeItem = useCallback((item) => {
        onChange(selected.filter(s => s !== item));
    }, [selected, onChange]);

    const clearSingle = () => { onChange(''); setQuery(''); };

    // ── Keyboard nav ──────────────────────────────────────────────────────
    const handleKeyDown = (e) => {
        if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
            setOpen(true); return;
        }
        if (e.key === 'Escape') { setOpen(false); setActiveIdx(-1); return; }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx(i => Math.min(i + 1, visibleItems.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && activeIdx >= 0) {
            e.preventDefault();
            selectItem(visibleItems[activeIdx]);
        } else if (e.key === 'Backspace' && query === '' && multiSelect && selected.length > 0) {
            removeItem(selected[selected.length - 1]);
        }
    };

    // ── Scroll active into view ───────────────────────────────────────────
    useEffect(() => {
        if (activeIdx >= 0 && listRef.current) {
            const el = listRef.current.children[activeIdx];
            el?.scrollIntoView({ block: 'nearest' });
        }
    }, [activeIdx]);

    // ── Click outside ─────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (!containerRef.current?.contains(e.target)) {
                setOpen(false);
                setActiveIdx(-1);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Reset activeIdx on filter change ─────────────────────────────────
    useEffect(() => { setActiveIdx(-1); }, [query, open]);

    const isAtMax = multiSelect && maxSelected && selected.length >= maxSelected;
    const displayValue = !multiSelect ? (singleValue || query) : query;

    return (
        <div ref={containerRef} className="relative w-full">
            {/* ── Input box ─────────────────────────────────────── */}
            <div
                className={`
          flex flex-wrap items-center gap-1.5 min-h-[42px] px-3 py-2
          rounded-xl border bg-background text-sm
          transition-all duration-200 cursor-text
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${open
                        ? 'border-primary ring-2 ring-primary/20 shadow-sm'
                        : 'border-border hover:border-primary/40'}
        `}
                onClick={() => { if (!disabled) { setOpen(true); inputRef.current?.focus(); } }}
            >
                {/* Leading icon */}
                {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}

                {/* Multi-select tags */}
                {multiSelect && selected.map(item => (
                    <span
                        key={item}
                        className="
              inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg
              bg-primary/10 text-primary text-xs font-medium
              border border-primary/20 max-w-[180px]
              animate-[fadeIn_0.15s_ease-out]
            "
                    >
                        <span className="truncate">{item}</span>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeItem(item); }}
                            className="shrink-0 rounded-full hover:bg-primary/20 p-px transition-colors"
                            tabIndex={-1}
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}

                {/* Text input */}
                <input
                    ref={inputRef}
                    type="text"
                    className="flex-1 min-w-[120px] bg-transparent outline-none placeholder:text-muted-foreground/60 text-sm"
                    placeholder={
                        multiSelect && selected.length > 0 ? 'Add more…' :
                            isAtMax ? `Max ${maxSelected} selected` : placeholder
                    }
                    value={!multiSelect ? (open ? query : singleValue) : query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!open) setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled || isAtMax}
                    autoComplete="off"
                    spellCheck="false"
                />

                {/* Trailing controls */}
                <div className="flex items-center gap-1 ml-auto shrink-0">
                    {!multiSelect && singleValue && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); clearSingle(); }}
                            className="rounded-full p-1 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            tabIndex={-1}
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <span className="text-muted-foreground/50">
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </span>
                </div>
            </div>

            {/* ── Dropdown ──────────────────────────────────────── */}
            {open && (
                <div
                    className="
            absolute z-50 mt-1.5 w-full
            bg-popover border border-border rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.12)]
            overflow-hidden
            animate-[slideDown_0.15s_cubic-bezier(0.16,1,0.3,1)]
          "
                    style={{ maxHeight: '280px', overflowY: 'auto' }}
                >
                    {visibleItems.length === 0 ? (
                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                            No results found
                        </div>
                    ) : (
                        <ul ref={listRef} role="listbox" aria-label="suggestions">
                            {visibleItems.map((item, idx) => {
                                const isCustom = item.startsWith('__custom__');
                                const label = isCustom ? item.replace('__custom__', '') : item;
                                const isSelected = multiSelect
                                    ? selected.includes(label)
                                    : singleValue === label;
                                const isActive = idx === activeIdx;

                                return (
                                    <li
                                        key={item}
                                        role="option"
                                        aria-selected={isSelected}
                                        className={`
                      flex items-center justify-between gap-2
                      px-3.5 py-2.5 text-sm cursor-pointer
                      transition-colors duration-100 select-none
                      ${isActive ? 'bg-primary/8 text-primary' : 'hover:bg-secondary/60'}
                      ${isSelected ? 'bg-primary/5 text-primary font-medium' : ''}
                    `}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => selectItem(item)}
                                        onMouseEnter={() => setActiveIdx(idx)}
                                    >
                                        <span className="flex items-center gap-2.5 truncate">
                                            {isCustom && (
                                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border border-dashed border-border rounded px-1.5 py-0.5 shrink-0">
                                                    Custom
                                                </span>
                                            )}
                                            <span className="truncate">{label}</span>
                                        </span>
                                        {isSelected && !isCustom && (
                                            <Check className="w-3.5 h-3.5 shrink-0 text-primary" />
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
