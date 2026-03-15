interface CardProps {
  children: React.ReactNode;
  /** Use "flush" for cards with custom header sections (no padding, overflow-hidden) */
  flush?: boolean;
  className?: string;
}

export function Card({ children, flush, className = "" }: CardProps) {
  return (
    <div className={`${flush ? "card-flush" : "card"} ${className}`}>
      {children}
    </div>
  );
}
