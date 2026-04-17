import './Card.css';

export default function Card({ children, className = '', padding = true, onClick }) {
  return (
    <div
      className={`card ${padding ? 'card--padded' : ''} ${onClick ? 'card--clickable' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
