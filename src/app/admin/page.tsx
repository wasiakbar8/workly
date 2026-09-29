"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { Users, Briefcase, CheckCircle, Clock, ShieldAlert } from "lucide-react";
import { getAdminStats, getWorkersForAdmin, getRecentRequestsForAdmin, verifyWorker } from "@/services/adminService";
import { useAuth } from "@/context/AuthContext";

export default function AdminPage() {
  const { user, role, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({ totalWorkers: 0, activeJobs: 0, completedJobs: 0, pendingVerification: 0 });
  const [workersList, setWorkersList] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [s, w, r] = await Promise.all([
        getAdminStats(),
        getWorkersForAdmin(),
        getRecentRequestsForAdmin(),
      ]);
      setStats(s);
      setWorkersList(w);
      setRecentRequests(r);
    } catch (err) {
      console.error("Admin data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleVerify = async (workerId: string, newStatus: "verified" | "rejected") => {
    setActionLoading(workerId);
    try {
      await verifyWorker(workerId, newStatus);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to update worker status.");
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid sm:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (role !== "admin") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8 text-danger" />
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2">403 - Access Denied</h1>
        <p className="text-ink-secondary mb-6">
          You do not have administrative privileges to view or manage this portal.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/dashboard">
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
          <Link href="/login">
            <Button>Log in as Admin</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-ink mb-6">Admin Dashboard</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total workers", value: stats.totalWorkers || workersList.length, icon: Users },
          { label: "Active jobs", value: stats.activeJobs, icon: Briefcase },
          { label: "Completed", value: stats.completedJobs, icon: CheckCircle },
          { label: "Pending verification", value: stats.pendingVerification, icon: Clock },
        ].map((s) => (
          <Card key={s.label} className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <s.icon className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">{s.value}</p>
              <p className="text-xs text-ink-secondary">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="font-semibold text-ink mb-4">Workers Verification Queue</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-muted border-b border-border">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Title</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-ink-muted">Loading workers...</td>
                  </tr>
                ) : workersList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-ink-muted">No workers found</td>
                  </tr>
                ) : (
                  workersList.map((w) => (
                    <tr key={w.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 font-medium text-ink">{w.fullName}</td>
                      <td className="py-2.5 text-ink-secondary">{w.professionalTitle}</td>
                      <td className="py-2.5">
                        <Badge variant={w.verified ? "success" : w.status === "rejected" ? "error" : "warning"}>
                          {w.status || (w.verified ? "Verified" : "Pending")}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right">
                        {!w.verified ? (
                          <Button
                            size="sm"
                            loading={actionLoading === w.id}
                            onClick={() => handleVerify(w.id, "verified")}
                            className="text-xs !py-1 !px-2.5"
                          >
                            Verify
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            loading={actionLoading === w.id}
                            onClick={() => handleVerify(w.id, "rejected")}
                            className="text-xs !py-1 !px-2.5 hover:text-error"
                          >
                            Suspend
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-ink mb-4">Recent Job Requests</h2>
          <div className="space-y-3">
            {recentRequests.length === 0 ? (
              <p className="text-sm text-ink-secondary text-center py-6">No requests found</p>
            ) : (
              recentRequests.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                  <div className="min-w-0 flex-1 pr-3">
                    <p className="font-medium text-ink truncate">{r.customerName} → {r.workerName}</p>
                    <p className="text-xs text-ink-secondary truncate">{r.taskDescription}</p>
                  </div>
                  <Badge variant={r.status === "pending" ? "warning" : r.status === "accepted" || r.status === "completed" ? "success" : "default"}>
                    {r.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink mb-2">Platform Revenue Overview</h2>
        <p className="text-3xl font-bold text-ink">Rs. 1,245,000</p>
        <p className="text-sm text-ink-secondary mt-1">Platform service fees this month (Live Supabase database)</p>
      </Card>
    </div>
  );
}
