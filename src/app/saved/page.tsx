"use client";
import { useState, useEffect } from "react";
import WorkerCard from "@/components/workers/WorkerCard";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { Heart } from "lucide-react";
import { getSavedWorkers } from "@/services/savedWorkersService";
import { WorkerProfile } from "@/types";

export default function SavedPage() {
  const [saved, setSaved] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    getSavedWorkers().then((data) => {
      if (active) {
        setSaved(data);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-ink mb-6">Saved workers</h1>
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-border p-5 space-y-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : saved.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No saved workers"
          description="Save workers you like to find them later."
          actionLabel="Browse workers"
          actionHref="/workers"
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {saved.map((w) => <WorkerCard key={w.id} worker={w} />)}
        </div>
      )}
    </div>
  );
}
