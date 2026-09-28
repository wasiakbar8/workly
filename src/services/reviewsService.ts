import { supabase } from "@/lib/supabase/client";
import { Review } from "@/types";

export async function getReviewsForWorker(workerId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(`
      *,
      customer:customer_id (id, full_name, avatar_url)
    `)
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((r: any): Review => ({
    id: r.id,
    bookingId: r.booking_id,
    workerId: r.worker_id,
    customerId: r.customer_id,
    customerName: r.customer?.full_name || "Customer",
    customerAvatar: r.customer?.avatar_url,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.created_at,
  }));
}

export async function createReview(params: {
  bookingId: string;
  workerId: string;
  rating: number;
  comment: string;
}): Promise<Review> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in to leave a review");

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      booking_id: params.bookingId,
      worker_id: params.workerId,
      customer_id: user.id,
      rating: params.rating,
      comment: params.comment,
    })
    .select(`
      *,
      customer:customer_id (id, full_name, avatar_url)
    `)
    .single();

  if (error) throw error;

  return {
    id: data.id,
    bookingId: data.booking_id,
    workerId: data.worker_id,
    customerId: data.customer_id,
    customerName: data.customer?.full_name || "Customer",
    customerAvatar: data.customer?.avatar_url,
    rating: data.rating,
    comment: data.comment,
    createdAt: data.created_at,
  };
}
