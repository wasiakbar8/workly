import { supabase } from "@/lib/supabase/client";
import { Booking, JobRequest } from "@/types";

export async function getBookings(status?: string): Promise<Booking[]> {
  const { data: { user } } = await supabase.auth.getUser();

  let query = supabase
    .from("bookings")
    .select(`
      *,
      customer:customer_id (id, full_name, avatar_url),
      worker:worker_id (
        id,
        professional_title,
        profiles:user_id (id, full_name, avatar_url)
      ),
      request:request_id (
        location_address, location_city, location_area, location_latitude, location_longitude
      )
    `)
    .order("start_datetime", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error("Error fetching bookings:", error);
    return [];
  }

  return data.map((b: any): Booking => {
    const start = new Date(b.start_datetime);
    const end = new Date(b.end_datetime);
    return {
      id: b.id,
      requestId: b.request_id,
      customerId: b.customer_id,
      customerName: b.customer?.full_name || "Customer",
      workerId: b.worker_id,
      workerUserId: b.worker?.profiles?.id || b.worker_id,
      workerName: b.worker?.profiles?.full_name || "Worker",
      workerAvatar: b.worker?.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(b.worker?.profiles?.full_name || "Worker")}&background=F6C945&color=1E1E1E`,
      task: b.task,
      date: start.toISOString().split("T")[0],
      startTime: start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      endTime: end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      location: {
        city: b.request?.location_city || "Lahore",
        area: b.request?.location_area || "",
        address: b.request?.location_address || "",
        latitude: b.request?.location_latitude,
        longitude: b.request?.location_longitude,
      },
      price: Number(b.agreed_price),
      currency: b.currency || "PKR",
      status: b.status as "upcoming" | "active" | "completed" | "cancelled",
      createdAt: b.created_at,
    };
  });
}

export async function getJobRequests(status?: string): Promise<JobRequest[]> {
  let query = supabase
    .from("job_requests")
    .select(`
      *,
      customer:customer_id (id, full_name, avatar_url),
      worker:worker_id (
        id,
        professional_title,
        profiles:user_id (id, full_name, avatar_url)
      )
    `)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error || !data) {
    console.error("Error fetching job requests:", error);
    return [];
  }

  return data.map((r: any): JobRequest => ({
    id: r.id,
    customerId: r.customer_id,
    customerName: r.customer?.full_name || "Customer",
    customerAvatar: r.customer?.avatar_url,
    workerId: r.worker_id,
    workerUserId: r.worker?.profiles?.id || r.worker_id,
    workerName: r.worker?.profiles?.full_name || "Worker",
    workerAvatar: r.worker?.profiles?.avatar_url,
    taskDescription: r.description,
    date: r.scheduled_date,
    startTime: r.start_time,
    endTime: r.end_time,
    durationHours: Number(r.duration_hours) || 1,
    location: {
      city: r.location_city,
      area: r.location_area,
      address: r.location_address,
      latitude: r.location_latitude,
      longitude: r.location_longitude,
    },
    budget: Number(r.budget),
    currency: r.currency || "PKR",
    notes: r.customer_notes,
    status: r.status as any,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getJobRequestById(id: string): Promise<JobRequest | null> {
  const { data: r, error } = await supabase
    .from("job_requests")
    .select(`
      *,
      customer:customer_id (id, full_name, avatar_url),
      worker:worker_id (
        id,
        professional_title,
        profiles:user_id (id, full_name, avatar_url)
      )
    `)
    .eq("id", id)
    .single();

  if (error || !r) return null;

  return {
    id: r.id,
    customerId: r.customer_id,
    customerName: r.customer?.full_name || "Customer",
    customerAvatar: r.customer?.avatar_url,
    workerId: r.worker_id,
    workerUserId: r.worker?.profiles?.id || r.worker_id,
    workerName: r.worker?.profiles?.full_name || "Worker",
    workerAvatar: r.worker?.profiles?.avatar_url,
    taskDescription: r.description,
    date: r.scheduled_date,
    startTime: r.start_time,
    endTime: r.end_time,
    durationHours: Number(r.duration_hours) || 1,
    location: {
      city: r.location_city,
      area: r.location_area,
      address: r.location_address,
      latitude: r.location_latitude,
      longitude: r.location_longitude,
    },
    budget: Number(r.budget),
    currency: r.currency || "PKR",
    notes: r.customer_notes,
    status: r.status as any,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function createJobRequest(params: {
  workerId: string;
  taskDescription: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours?: number;
  budget: number;
  currency?: string;
  notes?: string;
  location: {
    city: string;
    area?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
}): Promise<JobRequest> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in to create a work request");

  const { data, error } = await supabase
    .from("job_requests")
    .insert({
      customer_id: user.id,
      worker_id: params.workerId,
      description: params.taskDescription,
      scheduled_date: params.date,
      start_time: params.startTime,
      end_time: params.endTime,
      duration_hours: params.durationHours || 1,
      budget: params.budget,
      currency: params.currency || "PKR",
      customer_notes: params.notes,
      location_city: params.location.city,
      location_area: params.location.area,
      location_address: params.location.address,
      location_latitude: params.location.latitude,
      location_longitude: params.location.longitude,
      status: "pending",
    })
    .select(`
      *,
      customer:customer_id (id, full_name, avatar_url),
      worker:worker_id (
        id,
        professional_title,
        profiles:user_id (id, full_name, avatar_url)
      )
    `)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    customerId: data.customer_id,
    customerName: data.customer?.full_name || "Customer",
    customerAvatar: data.customer?.avatar_url,
    workerId: data.worker_id,
    workerName: data.worker?.profiles?.full_name || "Worker",
    workerAvatar: data.worker?.profiles?.avatar_url,
    taskDescription: data.description,
    date: data.scheduled_date,
    startTime: data.start_time,
    endTime: data.end_time,
    durationHours: Number(data.duration_hours) || 1,
    location: {
      city: data.location_city,
      area: data.location_area,
      address: data.location_address,
      latitude: data.location_latitude,
      longitude: data.location_longitude,
    },
    budget: Number(data.budget),
    currency: data.currency || "PKR",
    notes: data.customer_notes,
    status: data.status as any,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function updateJobRequestStatus(id: string, status: string) {
  const { error } = await supabase
    .from("job_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function updateBookingStatus(id: string, status: string) {
  const { error } = await supabase
    .from("bookings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}
