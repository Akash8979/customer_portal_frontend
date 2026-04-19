import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import './FilterSelect.css';

export default function FilterSelect({ value, onChange, options, placeholder = 'All' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function select(val) {
    onChange(val);
    setOpen(false);
  }

  return (
    <div className={`fsel ${open ? 'fsel--open' : ''} ${value ? 'fsel--active' : ''}`} ref={ref}>
      <button className="fsel-trigger" onClick={() => setOpen((o) => !o)} type="button">
        <span className="fsel-value">{selected ? selected.label : placeholder}</span>
        <ChevronDown size={13} className="fsel-chevron" />
      </button>

      {open && (
        <div className="fsel-dropdown">
          <div
            className={`fsel-option ${!value ? 'fsel-option--selected' : ''}`}
            onClick={() => select('')}
          >
            <span>{placeholder}</span>
            {!value && <Check size={12} />}
          </div>
          {options.map((o) => (
            <div
              key={o.value}
              className={`fsel-option ${value === o.value ? 'fsel-option--selected' : ''}`}
              onClick={() => select(o.value)}
            >
              <span>{o.label}</span>
              {value === o.value && <Check size={12} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
