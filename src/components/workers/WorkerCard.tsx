import Link from "next/link";
import Image from "next/image";
import { MapPin, CheckCircle, Globe, MessageSquare } from "lucide-react";
import { WorkerProfile } from "@/types";
import StarRating from "@/components/ui/StarRating";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatCurrency, formatDistance, getServiceModeLabel } from "@/lib/utils";

interface WorkerCardProps {
  worker: WorkerProfile;
}

export default function WorkerCard({ worker }: WorkerCardProps) {
  const distance = formatDistance(worker.distanceKm);
  const mode = getServiceModeLabel(worker.remoteAvailable, worker.onsiteAvailable);

  return (
    <div className="bg-white rounded-2xl border border-border shadow-soft hover:shadow-card hover:border-primary/30 transition-all duration-200 p-5 flex flex-col">
      <div className="flex gap-4 mb-3">
        <div className="relative shrink-0">
          <Image
            src={worker.avatarUrl}
            alt={worker.fullName}
            width={64}
            height={64}
            className="rounded-full object-cover w-16 h-16"
          />
          {worker.verified && (
            <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5">
              <CheckCircle className="w-4 h-4 text-success fill-green-50" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-ink truncate">{worker.fullName}</h3>
            {worker.verified && (
              <Badge variant="success" className="shrink-0">
                <CheckCircle size={10} /> Verified
              </Badge>
            )}
          </div>
          <p className="text-sm text-ink-secondary">{worker.professionalTitle}</p>
          <StarRating rating={worker.rating} showValue reviewCount={worker.reviewCount} size={12} />
        </div>
      </div>

      <p className="text-sm text-ink-secondary line-clamp-2 mb-3 flex-1">{worker.description}</p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {worker.skills.slice(0, 3).map((s) => (
          <Badge key={s} variant="outline">{s}</Badge>
        ))}
        {worker.skills.length > 3 && <Badge variant="outline">+{worker.skills.length - 3}</Badge>}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-secondary mb-3">
        <span className="flex items-center gap-1">
          <MapPin size={12} />
          {worker.location.city}
          {distance && ` · ${distance}`}
        </span>
        <span className="flex items-center gap-1">
          {worker.remoteAvailable && worker.onsiteAvailable ? (
            <><Globe size={12} /> {mode}</>
          ) : worker.remoteAvailable ? (
            <><Globe size={12} /> Remote</>
          ) : (
            <><MapPin size={12} /> On-site</>
          )}
        </span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-lg font-bold text-ink">{formatCurrency(worker.hourlyRate, worker.currency)}</span>
          <span className="text-xs text-ink-secondary">/hour</span>
        </div>
        <Badge variant="primary">{worker.availability}</Badge>
      </div>

      <div className="flex gap-2">
        <Link href={`/workers/${worker.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">View Profile</Button>
        </Link>
        <Link
          href={`/messages?to=${worker.userId}&name=${encodeURIComponent(worker.fullName)}&avatar=${encodeURIComponent(worker.avatarUrl)}`}
          title={`Chat with ${worker.fullName}`}
        >
          <Button variant="outline" size="sm" className="px-3" aria-label={`Chat with ${worker.fullName}`}>
            <MessageSquare size={15} />
          </Button>
        </Link>
        <Link href={`/workers/${worker.id}?request=true`} className="flex-1">
          <Button size="sm" className="w-full">Request</Button>
        </Link>
      </div>
    </div>
  );
}
