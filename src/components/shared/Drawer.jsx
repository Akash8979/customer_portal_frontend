import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import './Drawer.css';

export default function Drawer({ open, onClose, title, children, width = 480, side = 'right' }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <>
      {open && <div className="drawer-overlay" onClick={onClose} />}
      <div
        className={`drawer drawer--${side} ${open ? 'drawer--open' : ''}`}
        style={{ width }}
        role="dialog"
        aria-modal="true"
      >
        <div className="drawer-header">
          <span className="drawer-title">{title}</span>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
    </>,
    document.body,
  );
}
