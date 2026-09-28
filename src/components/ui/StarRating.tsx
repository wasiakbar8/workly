import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  size?: number;
  showValue?: boolean;
  reviewCount?: number;
}

export default function StarRating({ rating, size = 14, showValue, reviewCount }: StarRatingProps) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={cn(
            i <= Math.round(rating) ? "fill-primary text-primary" : "fill-zinc-200 text-zinc-200"
          )}
        />
      ))}
      {showValue && (
        <span className="text-sm font-medium text-ink ml-1">
          {rating.toFixed(1)}
          {reviewCount !== undefined && (
            <span className="text-ink-secondary font-normal"> ({reviewCount})</span>
          )}
        </span>
      )}
    </div>
  );
}
