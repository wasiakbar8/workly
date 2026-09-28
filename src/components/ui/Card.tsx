import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: boolean;
}

export default function Card({ children, className, hover, padding = true }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-border shadow-soft",
        hover && "hover:shadow-card hover:border-primary/30 transition-all duration-200",
        padding && "p-5",
        className
      )}
    >
      {children}
    </div>
  );
}
