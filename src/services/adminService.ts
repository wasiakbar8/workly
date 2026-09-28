import { supabase } from "@/lib/supabase/client";

export async function getAdminStats() {
  const [workersRes, activeJobsRes, completedJobsRes, pendingVerifRes] = await Promise.all([
    supabase.from("worker_profiles").select("id", { count: "exact", head: true }),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "upcoming"),
    supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("worker_profiles").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
  ]);

  return {
    totalWorkers: workersRes.count || 0,
    activeJobs: activeJobsRes.count || 0,
    completedJobs: completedJobsRes.count || 0,
    pendingVerification: pendingVerifRes.count || 0,
  };
}

export async function getWorkersForAdmin() {
  const { data, error } = await supabase
    .from("worker_profiles")
    .select(`
      id,
      professional_title,
      verification_status,
      created_at,
      profiles:user_id (id, full_name, email)
    `)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((w: any) => ({
    id: w.id,
    fullName: w.profiles?.full_name || "Worker",
    email: w.profiles?.email || "",
    professionalTitle: w.professional_title,
    verified: w.verification_status === "verified",
    status: w.verification_status,
  }));
}

export async function verifyWorker(workerId: string, status: "verified" | "rejected" | "pending") {
  const { error } = await supabase
    .from("worker_profiles")
    .update({ verification_status: status })
    .eq("id", workerId);

  if (error) throw error;
}

export async function getRecentRequestsForAdmin() {
  const { data, error } = await supabase
    .from("job_requests")
    .select(`
      id,
      title,
      description,
      status,
      created_at,
      customer:customer_id (full_name),
      worker:worker_id (
        profiles:user_id (full_name)
      )
    `)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) return [];

  return data.map((r: any) => ({
    id: r.id,
    customerName: r.customer?.full_name || "Customer",
    workerName: r.worker?.profiles?.full_name || "Worker",
    taskDescription: r.description,
    status: r.status,
  }));
}
