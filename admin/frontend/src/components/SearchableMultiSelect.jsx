import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X, Check } from 'lucide-react';

/**
 * SearchableMultiSelect — searchable dropdown supporting multiple selections.
 * Uses a portal so the dropdown is never clipped by any ancestor's overflow.
 *
 * Props:
 *   options      : [{ id, name }]
 *   values       : string[]   (array of selected ids)
 *   onChange     : (ids: string[]) => void
 *   placeholder  : string
 *   disabled     : bool
 */
export default function SearchableMultiSelect({
  options = [],
  values = [],
  onChange,
  placeholder = 'Select...',
  disabled = false,
}) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef            = useRef(null);
  const inputRef              = useRef(null);
  const portalRef             = useRef(null);

  // Compute dropdown position from trigger element
  const computePos = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropPos({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const clickedTrigger = triggerRef.current?.contains(e.target);
      const clickedPortal  = portalRef.current?.contains(e.target);
      if (!clickedTrigger && !clickedPortal) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus search when opened
  useEffect(() => {
    if (open) {
      computePos();
      inputRef.current?.focus();
    }
  }, [open]);

  // Recompute on scroll/resize
  useEffect(() => {
    if (!open) return;
    const recompute = () => computePos();
    window.addEventListener('scroll', recompute, true);
    window.addEventListener('resize', recompute);
    return () => {
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener('resize', recompute);
    };
  }, [open]);

  const filtered = useCallback(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(o => (o.name || o.title || '').toLowerCase().includes(q));
  }, [options, query]);

  const toggle = (id) => {
    const strId = String(id);
    if (values.map(String).includes(strId)) {
      onChange(values.filter(v => String(v) !== strId));
    } else {
      onChange([...values, strId]);
    }
  };

  const removeTag = (e, id) => {
    e.stopPropagation();
    onChange(values.filter(v => String(v) !== String(id)));
  };

  const clearAll = (e) => {
    e.stopPropagation();
    onChange([]);
  };

  const selectedOptions = options.filter(o => values.map(String).includes(String(o.id)));
  const list = filtered();

  const dropdown = open ? createPortal(
    <div
      ref={portalRef}
      style={{
        position: 'absolute',
        top: dropPos.top,
        left: dropPos.left,
        width: dropPos.width,
        zIndex: 99999,
        background: 'var(--bg-card, #fff)',
        border: '1px solid var(--border-default, #e2e8f0)',
        borderRadius: 10,
        boxShadow: '0 12px 32px rgba(0,0,0,0.15)',
        overflow: 'hidden',
        animation: 'ssDropIn 0.12s ease',
      }}
    >
      {/* Search box */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px',
        borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
        background: 'var(--bg-subtle, #f8fafc)',
      }}>
        <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Type to search..."
          style={{
            flex: 1, border: 'none', outline: 'none',
            background: 'transparent', fontSize: 13,
            color: 'var(--text-primary)',
          }}
        />
        {query && (
          <button type="button" onClick={() => setQuery('')}
            style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex' }}>
            <X size={12} />
          </button>
        )}
      </div>

      {/* Options list */}
      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {/* Clear all row */}
        <div
          onClick={() => { onChange([]); }}
          style={{
            padding: '8px 12px', fontSize: 12,
            color: 'var(--text-muted)', cursor: 'pointer',
            borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
            background: values.length === 0 ? 'rgba(99,102,241,0.06)' : 'transparent',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover, #f1f5f9)'}
          onMouseLeave={e => e.currentTarget.style.background = values.length === 0 ? 'rgba(99,102,241,0.06)' : 'transparent'}
        >
          — {placeholder}
        </div>

        {list.length === 0 ? (
          <div style={{ padding: '20px 12px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
            No results for "{query}"
          </div>
        ) : (
          list.map(o => {
            const isSelected = values.map(String).includes(String(o.id));
            return (
              <div
                key={o.id}
                onClick={() => toggle(o.id)}
                style={{
                  padding: '9px 12px', fontSize: 13, cursor: 'pointer',
                  background: isSelected ? 'rgba(99,102,241,0.10)' : 'transparent',
                  color: isSelected ? 'var(--primary, #6366f1)' : 'var(--text-primary)',
                  fontWeight: isSelected ? 600 : 400,
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'background 0.1s',
                  borderBottom: '1px solid var(--border-subtle, #f1f5f9)',
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover, #f1f5f9)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? 'rgba(99,102,241,0.10)' : 'transparent'; }}
              >
                {/* Checkbox */}
                <span style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                  border: isSelected ? '2px solid #6366f1' : '2px solid var(--border-default, #e2e8f0)',
                  background: isSelected ? '#6366f1' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.12s',
                }}>
                  {isSelected && <Check size={10} color="#fff" strokeWidth={3} />}
                </span>
                <span style={{ flex: 1 }}>{o.name || o.title}</span>
              </div>
            );
          })
        )}
      </div>

      <style>{`
        @keyframes ssDropIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  ) : null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(v => !v); }}
        style={{
          width: '100%',
          minHeight: 38,
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 4,
          padding: '5px 10px',
          borderRadius: 8,
          border: open
            ? '1.5px solid #6366f1'
            : '1px solid var(--border-default, #e2e8f0)',
          background: disabled ? 'var(--bg-subtle, #f8fafc)' : 'var(--bg-card, #fff)',
          fontSize: 13,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,.12)' : 'none',
          opacity: disabled ? 0.55 : 1,
          textAlign: 'left',
        }}
      >
        {/* Selected tags */}
        {selectedOptions.map(opt => (
          <span
            key={opt.id}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'rgba(99,102,241,0.1)', color: '#6366f1',
              border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: 5, padding: '2px 6px',
              fontSize: 11, fontWeight: 600,
              maxWidth: 180,
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
              {opt.name || opt.title}
            </span>
            <span onClick={(e) => removeTag(e, opt.id)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, opacity: 0.7 }}>
              <X size={10} />
            </span>
          </span>
        ))}

        {selectedOptions.length === 0 && (
          <span style={{ flex: 1, color: 'var(--text-muted, #94a3b8)', userSelect: 'none' }}>
            {placeholder}
          </span>
        )}

        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
          {selectedOptions.length > 0 && !disabled && (
            <span onClick={clearAll}
              style={{ display: 'inline-flex', alignItems: 'center', padding: 2, borderRadius: 4, cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={12} />
            </span>
          )}
          <ChevronDown size={14} style={{
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }} />
        </span>
      </button>

      {dropdown}
    </div>
  );
}
