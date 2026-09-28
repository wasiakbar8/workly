import { supabase } from "@/lib/supabase/client";

export interface JobPost {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  categoryId?: string;
  categoryName?: string;
  title: string;
  description: string;
  budget: number;
  currency: string;
  locationCity: string;
  locationArea?: string;
  scheduledDate?: string;
  status: "open" | "assigned" | "completed" | "cancelled";
  applicationsCount?: number;
  hasApplied?: boolean;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  jobPostId: string;
  workerId: string;
  workerName: string;
  workerTitle?: string;
  workerAvatar?: string;
  workerRating?: number;
  workerReviewsCount?: number;
  bidAmount?: number;
  coverNote?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export async function getJobPosts(filters?: {
  categoryId?: string;
  city?: string;
}): Promise<JobPost[]> {
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from("job_posts")
    .select(`
      *,
      customer:customer_id (id, full_name, avatar_url),
      category:category_id (id, name, slug),
      applications:job_applications (id, worker_id)
    `)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (filters?.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters?.city) {
    query = query.ilike("location_city", `%${filters.city}%`);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Check if current user's worker profile has applied
  let myWorkerId: string | null = null;
  if (user) {
    const { data: wp } = await supabase
      .from("worker_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    myWorkerId = wp?.id || null;
  }

  return data.map((jp: any): JobPost => ({
    id: jp.id,
    customerId: jp.customer_id,
    customerName: jp.customer?.full_name || "Customer",
    customerAvatar: jp.customer?.avatar_url,
    categoryId: jp.category_id,
    categoryName: jp.category?.name || "General",
    title: jp.title,
    description: jp.description,
    budget: Number(jp.budget),
    currency: jp.currency || "PKR",
    locationCity: jp.location_city,
    locationArea: jp.location_area || undefined,
    scheduledDate: jp.scheduled_date || undefined,
    status: jp.status,
    applicationsCount: jp.applications?.length || 0,
    hasApplied: myWorkerId ? jp.applications?.some((a: any) => a.worker_id === myWorkerId) : false,
    createdAt: jp.created_at,
  }));
}

export async function createJobPost(params: {
  title: string;
  description: string;
  categoryId?: string;
  budget: number;
  locationCity: string;
  locationArea?: string;
  scheduledDate?: string;
}): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in to post a task");

  const { data, error } = await supabase
    .from("job_posts")
    .insert({
      customer_id: user.id,
      title: params.title,
      description: params.description,
      category_id: params.categoryId || null,
      budget: params.budget,
      location_city: params.locationCity,
      location_area: params.locationArea || null,
      scheduled_date: params.scheduledDate || null,
      status: "open",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function applyToJobPost(params: {
  jobPostId: string;
  bidAmount?: number;
  coverNote?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in as a worker to apply");

  const { data: wp, error: wpErr } = await supabase
    .from("worker_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (wpErr || !wp) throw new Error("Please complete your worker profile before applying for tasks");

  const { error } = await supabase
    .from("job_applications")
    .insert({
      job_post_id: params.jobPostId,
      worker_id: wp.id,
      bid_amount: params.bidAmount || null,
      cover_note: params.coverNote || null,
      status: "pending",
    });

  if (error) throw error;
}

export async function getApplicationsForJobPost(jobPostId: string): Promise<JobApplication[]> {
  const { data, error } = await supabase
    .from("job_applications")
    .select(`
      *,
      worker:worker_id (
        id,
        professional_title,
        average_rating,
        total_reviews,
        profiles:user_id (id, full_name, avatar_url)
      )
    `)
    .eq("job_post_id", jobPostId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((a: any): JobApplication => ({
    id: a.id,
    jobPostId: a.job_post_id,
    workerId: a.worker_id,
    workerName: a.worker?.profiles?.full_name || "Worker",
    workerTitle: a.worker?.professional_title,
    workerAvatar: a.worker?.profiles?.avatar_url,
    workerRating: a.worker?.average_rating,
    workerReviewsCount: a.worker?.total_reviews,
    bidAmount: a.bid_amount ? Number(a.bid_amount) : undefined,
    coverNote: a.cover_note || undefined,
    status: a.status,
    createdAt: a.created_at,
  }));
}

export async function getCustomerJobPosts(): Promise<(JobPost & { applications: (JobApplication & { workerUserId?: string })[] })[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("job_posts")
    .select(`
      *,
      category:category_id (name),
      applications:job_applications (
        id,
        job_post_id,
        worker_id,
        bid_amount,
        cover_note,
        status,
        created_at,
        worker:worker_id (
          id,
          user_id,
          professional_title,
          average_rating,
          total_reviews,
          profiles:user_id (id, full_name, avatar_url)
        )
      )
    `)
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((jp: any) => ({
    id: jp.id,
    customerId: jp.customer_id,
    customerName: user.user_metadata?.full_name || "You",
    categoryId: jp.category_id,
    categoryName: jp.category?.name || "General",
    title: jp.title,
    description: jp.description,
    budget: Number(jp.budget),
    currency: jp.currency || "PKR",
    locationCity: jp.location_city,
    locationArea: jp.location_area || undefined,
    scheduledDate: jp.scheduled_date || undefined,
    status: jp.status,
    applicationsCount: jp.applications?.length || 0,
    createdAt: jp.created_at,
    applications: (jp.applications || []).map((a: any) => ({
      id: a.id,
      jobPostId: a.job_post_id,
      workerId: a.worker_id,
      workerUserId: a.worker?.user_id,
      workerName: a.worker?.profiles?.full_name || "Worker",
      workerTitle: a.worker?.professional_title,
      workerAvatar: a.worker?.profiles?.avatar_url,
      workerRating: Number(a.worker?.average_rating) || 5.0,
      workerReviewsCount: a.worker?.total_reviews || 0,
      bidAmount: a.bid_amount ? Number(a.bid_amount) : undefined,
      coverNote: a.cover_note || undefined,
      status: a.status,
      createdAt: a.created_at,
    })),
  }));
}

export async function acceptJobApplication(applicationId: string): Promise<string> {
  const { data, error } = await supabase.rpc("accept_job_application", {
    p_application_id: applicationId,
  });

  if (error) throw error;
  return data;
}

