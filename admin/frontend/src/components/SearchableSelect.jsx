import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X } from 'lucide-react';

/**
 * SearchableSelect — a lightweight combobox with live search.
 * Props:
 *   options      : [{ id, name }]
 *   value        : currently selected id (string | number)
 *   onChange     : (id: string) => void
 *   placeholder  : string  (trigger button label when nothing selected)
 *   disabled     : bool
 *   label        : string  (accessible label, not rendered here)
 */
export default function SearchableSelect({ options = [], value, onChange, placeholder = 'Select...', disabled = false }) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const [rect, setRect]     = useState(null);
  const containerRef        = useRef(null);
  const inputRef            = useRef(null);
  const dropdownRef         = useRef(null);

  // Close when clicking outside (either the trigger or the portaled dropdown)
  useEffect(() => {
    const handler = (e) => {
      if (
        containerRef.current && !containerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  // Track trigger position so the portaled dropdown can follow it — this is
  // what lets the panel escape any ancestor with overflow:hidden (e.g. the
  // wizard card) instead of being clipped.
  useEffect(() => {
    if (!open) return undefined;
    const updateRect = () => {
      if (containerRef.current) setRect(containerRef.current.getBoundingClientRect());
    };
    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [open]);

  const selectedOption = options.find(o => String(o.id) === String(value));

  // Long scraped titles are pipe-joined ("A | B | C | D ..."); show only the first 3 segments.
  const shortLabel = (text) => {
    if (!text) return text;
    const parts = text.split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length <= 3) return text;
    return `${parts.slice(0, 3).join(' | ')}…`;
  };

  const filtered = useCallback(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(o => (o.name || o.title || '').toLowerCase().includes(q));
  }, [options, query]);

  const handleSelect = (id) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
    setQuery('');
  };

  const displayLabel = selectedOption ? shortLabel(selectedOption.name || selectedOption.title) : null;
  const list = filtered();

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', minWidth: 0 }}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(v => !v); }}
        style={{
          width: '100%',
          minWidth: 0,
          maxWidth: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          height: 38,
          padding: '0 10px',
          borderRadius: 'var(--r-md, 8px)',
          border: open
            ? '1.5px solid var(--primary, #6366f1)'
            : '1px solid var(--border-default, #e2e8f0)',
          background: disabled ? 'var(--bg-subtle, #f8fafc)' : 'var(--bg-card, #fff)',
          color: displayLabel ? 'var(--text-primary, #0f172a)' : 'var(--text-muted, #94a3b8)',
          fontSize: 13,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,.12)' : 'none',
          opacity: disabled ? 0.6 : 1,
          textAlign: 'left',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {displayLabel || placeholder}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {displayLabel && !disabled && (
            <span
              onClick={handleClear}
              style={{
                display: 'inline-flex', alignItems: 'center',
                padding: 2, borderRadius: 4,
                cursor: 'pointer', color: 'var(--text-muted)',
              }}
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            style={{
              color: 'var(--text-muted)',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          />
        </span>
      </button>

      {/* Dropdown — portaled to <body> so it escapes any ancestor with
          overflow:hidden (e.g. the wizard card) instead of being clipped */}
      {open && rect && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
            zIndex: 3000,
            background: 'var(--bg-card, #fff)',
            border: '1px solid var(--border-default, #e2e8f0)',
            borderRadius: 'var(--r-md, 8px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            animation: 'ssDropIn 0.12s ease',
          }}
        >
          {/* Search box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 10px',
              borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
              background: 'var(--bg-subtle, #f8fafc)',
            }}
          >
            <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type to search..."
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: 13,
                color: 'var(--text-primary)',
              }}
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex' }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options list */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {/* Clear / "None" option */}
            <div
              onClick={() => handleSelect('')}
              style={{
                padding: '8px 12px',
                fontSize: 12,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                background: !value ? 'rgba(99,102,241,0.06)' : 'transparent',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover, #f1f5f9)'}
              onMouseLeave={e => e.currentTarget.style.background = !value ? 'rgba(99,102,241,0.06)' : 'transparent'}
            >
              — {placeholder}
            </div>

            {list.length === 0 ? (
              <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                No results for "{query}"
              </div>
            ) : (
              list.map(o => {
                const isSelected = String(o.id) === String(value);
                return (
                  <div
                    key={o.id}
                    onClick={() => handleSelect(String(o.id))}
                    title={o.name || o.title}
                    style={{
                      padding: '8px 12px',
                      fontSize: 13,
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(99,102,241,0.10)' : 'transparent',
                      color: isSelected ? 'var(--primary, #6366f1)' : 'var(--text-primary)',
                      fontWeight: isSelected ? 600 : 400,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover, #f1f5f9)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(99,102,241,0.10)' : 'transparent'; }}
                  >
                    {isSelected && (
                      <span style={{ fontSize: 10, color: 'var(--primary)', flexShrink: 0 }}>✓</span>
                    )}
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortLabel(o.name || o.title)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes ssDropIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
