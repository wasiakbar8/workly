"use client";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  MapPin, CheckCircle, Clock, Briefcase, Globe, Star, MessageSquare, Heart, Navigation
} from "lucide-react";
import StarRating from "@/components/ui/StarRating";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import { formatCurrency, getServiceModeLabel } from "@/lib/utils";
import { getWorkerById } from "@/services/workersService";
import { getReviewsForWorker } from "@/services/reviewsService";
import { createJobRequest } from "@/services/bookingService";
import { isWorkerSaved, saveWorker, unsaveWorker } from "@/services/savedWorkersService";
import { useAuth } from "@/context/AuthContext";
import { WorkerProfile, Review } from "@/types";

export default function WorkerProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const workerId = String(params.id);
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // Request form state
  const [showRequest, setShowRequest] = useState(searchParams.get("request") === "true");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState("");

  const [taskDescription, setTaskDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Lahore");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({});

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      getWorkerById(workerId),
      getReviewsForWorker(workerId),
      isWorkerSaved(workerId),
    ]).then(([w, r, s]) => {
      if (active) {
        setWorker(w);
        setReviews(r);
        setSaved(s);
        if (w?.hourlyRate) {
          setBudget(String(w.hourlyRate * 2));
        }
        if (w?.location?.city) {
          setCity(w.location.city);
        }
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [workerId]);

  const toggleSave = async () => {
    if (!user) {
      router.push("/login");
      return;
    }
    try {
      if (saved) {
        await unsaveWorker(workerId);
        setSaved(false);
      } else {
        await saveWorker(workerId);
        setSaved(true);
      }
    } catch (err) {
      console.error("Save worker error:", err);
    }
  };

  const useMyLocationForJob = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAddress("📍 Current GPS Location");
      },
      () => {
        alert("Location permission denied. Please enter address manually.");
      }
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      await createJobRequest({
        workerId,
        taskDescription,
        date,
        startTime,
        endTime,
        budget: Number(budget) || (worker ? worker.hourlyRate * 2 : 2000),
        notes,
        location: {
          city: city || worker?.location.city || "Lahore",
          address: address || "On-site address",
          latitude: coords.lat,
          longitude: coords.lng,
        },
      });
      setSent(true);
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || "Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="flex gap-5">
              <Skeleton className="w-24 h-24 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </Card>
            <Card className="space-y-4">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-16 w-full" />
            </Card>
          </div>
          <div>
            <Card className="h-64 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-ink">Worker not found</h1>
        <Link href="/workers" className="text-sm text-ink-secondary underline mt-2 inline-block">Back to workers</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex flex-col sm:flex-row gap-5">
              <Image src={worker.avatarUrl} alt={worker.fullName} width={96} height={96} className="rounded-2xl object-cover w-24 h-24" />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-ink">{worker.fullName}</h1>
                  {worker.verified && (
                    <Badge variant="success"><CheckCircle size={12} /> Verified</Badge>
                  )}
                </div>
                <p className="text-ink-secondary mt-0.5">{worker.professionalTitle} · {worker.categoryName}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-ink-secondary">
                  <StarRating rating={worker.rating} showValue reviewCount={worker.reviewCount} />
                  <span className="flex items-center gap-1"><Briefcase size={14} /> {worker.jobsCompleted} jobs</span>
                  <span className="flex items-center gap-1"><Clock size={14} /> {worker.responseTime}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-ink-secondary">
                  <span className="flex items-center gap-1"><MapPin size={14} /> {worker.location.city}{worker.location.area ? `, ${worker.location.area}` : ""}</span>
                  <span className="flex items-center gap-1">
                    <Globe size={14} /> {getServiceModeLabel(worker.remoteAvailable, worker.onsiteAvailable)}
                    {worker.onsiteAvailable && worker.serviceRadiusKm > 0 && ` · ${worker.serviceRadiusKm} km radius`}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold text-ink mb-3">About</h2>
            <p className="text-sm text-ink-secondary leading-relaxed">{worker.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {worker.skills.map((s) => (
                <Badge key={s} variant="outline">{s}</Badge>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><p className="text-ink-muted text-xs">Experience</p><p className="font-medium">{worker.experienceYears} years</p></div>
              <div><p className="text-ink-muted text-xs">Languages</p><p className="font-medium">{worker.languages.join(", ")}</p></div>
              <div><p className="text-ink-muted text-xs">Rate</p><p className="font-medium">{formatCurrency(worker.hourlyRate)}/hr</p></div>
              <div><p className="text-ink-muted text-xs">Availability</p><p className="font-medium">{worker.availability}</p></div>
            </div>
          </Card>

          {worker.portfolio.length > 0 && (
            <Card>
              <h2 className="font-semibold text-ink mb-4">Portfolio</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {worker.portfolio.map((p) => (
                  <div key={p.id} className="rounded-xl overflow-hidden border border-border">
                    <Image src={p.imageUrl} alt={p.title} width={400} height={240} className="w-full h-40 object-cover" />
                    <div className="p-3">
                      <p className="text-sm font-medium text-ink">{p.title}</p>
                      {p.description && <p className="text-xs text-ink-secondary mt-0.5">{p.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <h2 className="font-semibold text-ink mb-4">Reviews ({reviews.length || worker.reviewCount})</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-ink-secondary">No reviews yet for this worker in the database.</p>
            ) : (
              <div className="space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="border-b border-border last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center gap-2 mb-1">
                      {r.customerAvatar && (
                        <Image src={r.customerAvatar} alt="" width={28} height={28} className="rounded-full" />
                      )}
                      <span className="text-sm font-medium">{r.customerName}</span>
                      <StarRating rating={r.rating} size={12} />
                    </div>
                    <p className="text-sm text-ink-secondary">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar - Request */}
        <div className="space-y-4">
          <Card className="sticky top-20">
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-ink">{formatCurrency(worker.hourlyRate)}</p>
              <p className="text-sm text-ink-secondary">per hour</p>
            </div>
            <div className="flex gap-2 mb-4">
              <Button className="flex-1" onClick={() => setShowRequest(true)}>Request Worker</Button>
              <Link
                href={`/messages?to=${worker.userId}&name=${encodeURIComponent(worker.fullName)}&avatar=${encodeURIComponent(worker.avatarUrl)}`}
                className="flex-1"
              >
                <Button variant="outline" size="md" className="w-full">
                  <MessageSquare size={16} /> Chat
                </Button>
              </Link>
              <Button
                variant={saved ? "primary" : "outline"}
                size="md"
                onClick={toggleSave}
                title={saved ? "Saved" : "Save Worker"}
              >
                <Heart size={16} className={saved ? "fill-ink" : ""} />
              </Button>
            </div>

            {showRequest && !sent && (
              <form onSubmit={handleSend} className="space-y-3 border-t border-border pt-4">
                <h3 className="font-semibold text-ink text-sm">Request this worker</h3>

                {formError && (
                  <p className="text-xs text-error font-medium p-2 rounded-lg bg-error/10">{formError}</p>
                )}

                <div>
                  <label className="text-xs font-medium text-ink-secondary">Task description</label>
                  <textarea
                    required
                    rows={3}
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Describe what you need..."
                  />
                </div>
                <Input
                  label="Date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Start time"
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                  <Input
                    label="End time"
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-ink-secondary">Job Location</label>
                    <button
                      type="button"
                      onClick={useMyLocationForJob}
                      className="text-[11px] text-primary-600 hover:underline flex items-center gap-1"
                    >
                      <Navigation size={10} /> Use My GPS
                    </button>
                  </div>
                  <Input
                    placeholder="Job address or neighborhood"
                    required
                    icon={<MapPin size={14} />}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <Input
                  label="Budget (PKR)"
                  type="number"
                  placeholder="Estimated budget"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />

                <div>
                  <label className="text-xs font-medium text-ink-secondary">Additional notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full mt-1 rounded-xl border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Gate codes, parking instructions..."
                  />
                </div>

                <Button type="submit" className="w-full" loading={submitting}>
                  Send Work Request
                </Button>
              </form>
            )}

            {sent && (
              <div className="border-t border-border pt-4 text-center">
                <CheckCircle className="w-10 h-10 text-success mx-auto mb-2" />
                <p className="font-semibold text-ink">Request sent!</p>
                <p className="text-sm text-ink-secondary mt-1">The worker will receive your request and respond shortly.</p>
                <Link href="/dashboard"><Button variant="outline" size="sm" className="mt-3">Go to Dashboard</Button></Link>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
