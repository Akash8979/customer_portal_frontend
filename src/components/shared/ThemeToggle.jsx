import useAppStore from '../../stores/useAppStore';
import './ThemeToggle.css';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore();
  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? '☀' : '☽'}
    </button>
  );
}
