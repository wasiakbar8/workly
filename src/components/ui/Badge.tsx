import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "primary" | "outline";
  className?: string;
  onClick?: () => void;
}

export default function Badge({ children, variant = "default", className, onClick }: BadgeProps) {
  const variants = {
    default: "bg-zinc-100 text-ink-secondary",
    success: "bg-green-50 text-success",
    warning: "bg-amber-50 text-warning",
    error: "bg-red-50 text-error",
    primary: "bg-primary/20 text-ink",
    outline: "border border-border text-ink-secondary bg-white",
  };
  return (
    <span
      onClick={onClick}
      className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}
    >
      {children}
    </span>
  );
}
