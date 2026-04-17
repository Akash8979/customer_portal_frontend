import './Button.css';

export default function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false, icon, iconOnly = false,
  onClick, type = 'button', className = '', ...props
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size} ${iconOnly ? 'btn--icon' : ''} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading ? <span className="btn-spinner" /> : icon && <span className="btn-icon">{icon}</span>}
      {!iconOnly && children}
    </button>
  );
}
