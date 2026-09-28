"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { DollarSign, Calendar, Star, Briefcase } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { getJobRequests, getBookings } from "@/services/bookingService";
import { formatCurrency } from "@/lib/utils";
import { JobRequest, Booking } from "@/types";

import { supabase } from "@/lib/supabase/client";

export default function WorkerDashboardPage() {
  const [pending, setPending] = useState<JobRequest[]>([]);
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [completed, setCompleted] = useState<Booking[]>([]);
  const [workerStats, setWorkerStats] = useState<{ rating: number; reviewCount: number; completedJobs: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      const [p, u, c, wpRes] = await Promise.all([
        getJobRequests("pending"),
        getBookings("upcoming"),
        getBookings("completed"),
        user
          ? supabase
              .from("worker_profiles")
              .select("average_rating, total_reviews, completed_jobs")
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (active) {
        setPending(p);
        setUpcoming(u);
        setCompleted(c);
        if (wpRes.data) {
          setWorkerStats({
            rating: Number(wpRes.data.average_rating) || 5.0,
            reviewCount: wpRes.data.total_reviews || 0,
            completedJobs: wpRes.data.completed_jobs || 0,
          });
        }
        setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const totalEarned = completed.reduce((sum, b) => sum + (b.price || 0), 0);
  const pendingPayout = pending.reduce((sum, r) => sum + (r.budget || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-ink mb-1">Worker Dashboard</h1>
      <p className="text-ink-secondary text-sm mb-8">Manage your jobs, earnings, and availability</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Completed earnings", value: formatCurrency(totalEarned), icon: DollarSign },
          { label: "Pending requests", value: String(pending.length), icon: Briefcase },
          { label: "Upcoming jobs", value: String(upcoming.length), icon: Calendar },
          {
            label: "Avg. rating",
            value: workerStats && workerStats.reviewCount > 0
              ? `${workerStats.rating.toFixed(1)} (${workerStats.reviewCount})`
              : "New (No reviews)",
            icon: Star,
          },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <s.icon className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-ink">{s.value}</p>
              <p className="text-xs text-ink-secondary">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold text-ink mb-4">Pending requests</h2>
          {loading ? (
            <Card className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </Card>
          ) : pending.length === 0 ? (
            <Card>
              <p className="text-sm text-ink-secondary text-center py-6">No pending work requests</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {pending.map((r) => (
                <Card key={r.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{r.customerName}</p>
                      <p className="text-sm text-ink-secondary mt-0.5">{r.taskDescription}</p>
                      <div className="flex gap-3 mt-2 text-xs text-ink-muted">
                        <span>{r.date}</span>
                        <span>{r.startTime} – {r.endTime}</span>
                        <span>{formatCurrency(r.budget)}</span>
                      </div>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                  <div className="mt-4">
                    <Link href={`/requests/${r.id}`}>
                      <Button size="sm">View & Respond</Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-semibold text-ink mb-4">Earnings overview</h2>
          <Card>
            <div className="space-y-4">
              {[
                { label: "Completed jobs earnings", value: formatCurrency(totalEarned) },
                { label: "Pending requests potential", value: formatCurrency(pendingPayout) },
                { label: "Completed jobs count", value: String(completed.length) },
              ].map((row) => (
                <div key={row.label} className="flex justify-between text-sm">
                  <span className="text-ink-secondary">{row.label}</span>
                  <span className="font-medium text-ink">{row.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
