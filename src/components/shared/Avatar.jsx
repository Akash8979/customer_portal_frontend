import { initials, avatarColor } from '../../utils/formatters';
import './Avatar.css';

export default function Avatar({ name, size = 'md', src }) {
  const bg = avatarColor(name);
  if (src) return <img className={`avatar avatar--${size}`} src={src} alt={name} />;
  return (
    <span className={`avatar avatar--${size}`} style={{ background: bg }} title={name}>
      {initials(name)}
    </span>
  );
}
