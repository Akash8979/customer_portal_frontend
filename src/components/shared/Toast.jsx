import { createPortal } from 'react-dom';
import useAppStore from '../../stores/useAppStore';
import './Toast.css';

const ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

export default function ToastContainer() {
  const { toasts, removeToast } = useAppStore();
  return createPortal(
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type || 'info'}`} onClick={() => removeToast(t.id)}>
          <span className="toast-icon">{ICONS[t.type] || 'ℹ'}</span>
          <span className="toast-msg">{t.message}</span>
        </div>
      ))}
    </div>,
    document.body,
  );
}
