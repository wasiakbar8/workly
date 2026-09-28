"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, MapPin, CalendarX, MessageSquare, Star, CheckCircle } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { getBookings, updateBookingStatus } from "@/services/bookingService";
import { createReview } from "@/services/reviewsService";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";
import { Booking } from "@/types";

import { supabase } from "@/lib/supabase/client";

const tabs = ["upcoming", "active", "completed", "cancelled"] as const;
const statusVariant: Record<string, "primary" | "success" | "warning" | "error" | "default"> = {
  upcoming: "primary",
  active: "warning",
  pending_approval: "warning",
  completed: "success",
  cancelled: "error",
};

export default function BookingsPage() {
  const { user, role } = useAuth();
  const [tab, setTab] = useState<(typeof tabs)[number]>("upcoming");
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<string[]>([]);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Updating booking status state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await getBookings();
    setAllBookings(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusUpdate = async (bookingId: string, newStatus: any) => {
    setActionLoading(bookingId);
    try {
      await updateBookingStatus(bookingId, newStatus);

      const targetBooking = allBookings.find((x) => x.id === bookingId);
      if (targetBooking) {
        if (newStatus === "pending_approval") {
          // Notify hirer that worker has marked task completed
          await supabase.from("notifications").insert({
            user_id: targetBooking.customerId,
            type: "job_completed",
            title: "Work Completed by Worker",
            body: `${targetBooking.workerName} marked "${targetBooking.task}" as completed. Please review and approve.`,
            link: "/bookings",
          });
        } else if (newStatus === "completed") {
          // Notify worker that hirer approved work
          await supabase.from("notifications").insert({
            user_id: targetBooking.workerUserId || targetBooking.workerId,
            type: "job_completed",
            title: "Work Approved by Client",
            body: `Your work for "${targetBooking.task}" was approved! Earnings have been credited to your account.`,
            link: "/worker-dashboard",
          });
        }
      }

      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to update status. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking) return;
    setSubmittingReview(true);
    setReviewError("");

    try {
      await createReview({
        bookingId: reviewBooking.id,
        workerId: reviewBooking.workerId,
        rating,
        comment: comment || "Great service! Very satisfied with the work.",
      });

      setReviewedBookingIds((prev) => [...prev, reviewBooking.id]);
      setReviewSuccess(true);
      setTimeout(() => {
        setReviewSuccess(false);
        setReviewBooking(null);
        setComment("");
        setRating(5);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setReviewError(err.message || "Failed to submit review.");
    } finally {
      setSubmittingReview(false);
    }
  };

  const filtered = allBookings.filter((b) => {
    if (tab === "active") {
      return b.status === "active" || b.status === "pending_approval" || b.status === "upcoming";
    }
    return b.status === tab;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">My Bookings & Jobs</h1>
          <p className="text-ink-secondary text-sm mt-1">
            Track confirmed scheduled jobs, communicate with each other, and review completed work.
          </p>
        </div>

        {role === "customer" && (
          <Link href="/workers">
            <Button size="sm">Book a Worker</Button>
          </Link>
        )}
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-colors ${
              tab === t
                ? "bg-primary text-ink font-semibold"
                : "bg-white border border-border text-ink-secondary hover:bg-surface-muted"
            }`}
          >
            {t} ({allBookings.filter((b) => b.status === t || (t === "active" && b.status === "upcoming")).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title="No bookings"
          description={`You have no ${tab} bookings.`}
          actionLabel={role === "worker" ? "Check Job Board" : "Find workers"}
          actionHref={role === "worker" ? "/jobs" : "/workers"}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((b) => (
            <Card key={b.id} className="flex flex-col justify-between hover:border-primary/40 transition-colors">
              <div>
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex gap-3 min-w-0">
                    {b.workerAvatar ? (
                      <Image
                        src={b.workerAvatar}
                        alt=""
                        width={44}
                        height={44}
                        className="rounded-full w-11 h-11 object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-primary/20 flex items-center justify-center font-bold text-ink shrink-0">
                        {(role === "worker" ? b.customerName : b.workerName).charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-ink truncate">
                        {role === "worker" ? b.customerName : b.workerName}
                      </p>
                      <p className="text-xs text-ink-secondary line-clamp-1">{b.task}</p>
                    </div>
                  </div>
                  <Badge variant={statusVariant[b.status] || "default"} className="shrink-0">{b.status}</Badge>
                </div>

                <div className="space-y-1.5 text-xs text-ink-secondary mb-3">
                  <p className="flex items-center gap-1.5"><Calendar size={12} /> {b.date}</p>
                  <p className="flex items-center gap-1.5"><Clock size={12} /> {b.startTime} – {b.endTime}</p>
                  <p className="flex items-center gap-1.5"><MapPin size={12} /> {b.location.city}{b.location.area ? `, ${b.location.area}` : ""}</p>
                </div>

                <p className="font-bold text-ink text-base mb-4">{formatCurrency(b.price)}</p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border flex flex-wrap gap-2">
                {/* Chat button for confirmed bookings */}
                <Link
                  href={`/messages?to=${role === "worker" ? b.customerId : (b.workerUserId || b.workerId)}&name=${encodeURIComponent(role === "worker" ? b.customerName : b.workerName)}`}
                  className="flex-1"
                >
                  <Button variant="outline" size="sm" className="w-full">
                    <MessageSquare size={14} /> Chat
                  </Button>
                </Link>

                {/* Worker Controls */}
                {role === "worker" && (
                  <>
                    {b.status === "upcoming" && (
                      <Button
                        size="sm"
                        className="flex-1"
                        loading={actionLoading === b.id}
                        onClick={() => handleStatusUpdate(b.id, "active")}
                      >
                        Start Job
                      </Button>
                    )}
                    {b.status === "active" && (
                      <Button
                        size="sm"
                        className="flex-1 bg-primary text-ink hover:bg-primary/90 font-semibold"
                        loading={actionLoading === b.id}
                        onClick={() => handleStatusUpdate(b.id, "pending_approval")}
                      >
                        Mark Completed (Send for Approval)
                      </Button>
                    )}
                    {b.status === "pending_approval" && (
                      <div className="flex-1 text-center py-1.5 px-3 bg-primary/10 border border-primary/30 rounded-xl text-xs font-semibold text-ink flex items-center justify-center gap-1.5">
                        <Clock size={13} className="text-ink animate-spin" />
                        Awaiting Hirer Approval
                      </div>
                    )}
                  </>
                )}

                {/* Hirer / Customer Controls */}
                {role === "customer" && (
                  <>
                    {b.status === "pending_approval" && (
                      <Button
                        size="sm"
                        className="flex-1 bg-success hover:bg-success/90 text-white font-semibold shadow-soft"
                        loading={actionLoading === b.id}
                        onClick={async () => {
                          await handleStatusUpdate(b.id, "completed");
                          setReviewBooking(b);
                        }}
                      >
                        <CheckCircle size={14} /> Approve Work & Rate
                      </Button>
                    )}
                    {b.status === "completed" && (
                      reviewedBookingIds.includes(b.id) ? (
                        <Badge variant="success" className="px-3 py-1.5">✓ Reviewed</Badge>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => setReviewBooking(b)}
                        >
                          <Star size={14} className="fill-ink" /> Rate Worker
                        </Button>
                      )
                    )}
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewBooking && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-white">
            <h3 className="text-lg font-bold text-ink mb-1">Rate Your Experience</h3>
            <p className="text-xs text-ink-secondary mb-4">
              Leave feedback for <span className="font-semibold text-ink">{reviewBooking.workerName}</span> on &quot;{reviewBooking.task}&quot;
            </p>

            {reviewError && (
              <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-medium">
                {reviewError}
              </div>
            )}

            {reviewSuccess ? (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-success mx-auto mb-2" />
                <p className="font-bold text-ink">Thank you for your review!</p>
                <p className="text-xs text-ink-secondary">The worker&apos;s rating has been updated.</p>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {/* Star selection */}
                <div>
                  <label className="text-xs font-semibold text-ink mb-2 block">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 text-amber-400 hover:scale-110 transition-transform"
                      >
                        <Star
                          size={28}
                          className={star <= rating ? "fill-amber-400 text-amber-400" : "text-zinc-200"}
                        />
                      </button>
                    ))}
                    <span className="self-center ml-2 text-sm font-bold text-ink">{rating} / 5</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-ink mb-1 block">Your Review (Optional)</label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share how the worker performed, punctuality, quality of work, and attitude..."
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setReviewBooking(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" loading={submittingReview}>
                    Submit Review
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
