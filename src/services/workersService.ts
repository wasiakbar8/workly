import { supabase } from "@/lib/supabase/client";
import { WorkerProfile } from "@/types";

export interface WorkerFilterParams {
  category?: string;
  city?: string;
  minRating?: number;
  maxPrice?: number;
  remote?: boolean;
  onsite?: boolean;
  sort?: string;
  search?: string;
  lat?: number;
  lng?: number;
  maxDistanceKm?: number;
}

export async function getWorkers(filters?: WorkerFilterParams): Promise<WorkerProfile[]> {
  try {
    // Use the database search_workers function for fast distance and filter calculations
    const { data, error } = await supabase.rpc("search_workers", {
      p_category: filters?.category || null,
      p_search: filters?.search || null,
      p_city: filters?.city || null,
      p_min_rating: filters?.minRating && filters.minRating > 0 ? filters.minRating : null,
      p_max_price: filters?.maxPrice && filters.maxPrice < 5000 ? filters.maxPrice : null,
      p_remote: filters?.remote ?? null,
      p_onsite: filters?.onsite ?? null,
      p_lat: filters?.lat ?? null,
      p_lng: filters?.lng ?? null,
      p_max_distance_km: filters?.maxDistanceKm ?? null,
      p_sort: filters?.sort || "recommended",
    });

    if (error) {
      console.warn("search_workers RPC error, falling back to direct table query:", error.message);
      return await fallbackGetWorkers(filters);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Fetch portfolio items for these workers
    const workerIds = data.map((w: any) => w.id);
    const { data: portfolios } = await supabase
      .from("portfolio_items")
      .select("*")
      .in("worker_id", workerIds);

    const portfolioMap = new Map<string, any[]>();
    (portfolios || []).forEach((p) => {
      const list = portfolioMap.get(p.worker_id) || [];
      list.push({
        id: p.id,
        title: p.title,
        imageUrl: p.image_url,
        description: p.description || undefined,
      });
      portfolioMap.set(p.worker_id, list);
    });

    return data.map((w: any): WorkerProfile => ({
      id: w.id,
      userId: w.user_id,
      fullName: w.full_name,
      avatarUrl: w.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(w.full_name || "Worker")}&background=F6C945&color=1E1E1E`,
      professionalTitle: w.professional_title,
      categoryId: w.category_id || "",
      categoryName: w.category_name || "General",
      subcategory: w.subcategory || undefined,
      description: w.description || "",
      skills: w.skills || [],
      experienceYears: w.experience_years || 0,
      hourlyRate: Number(w.hourly_rate),
      currency: w.currency || "PKR",
      rating: Number(w.average_rating) || 5.0,
      reviewCount: w.total_reviews || 0,
      jobsCompleted: w.completed_jobs || 0,
      responseTime: w.response_time || "< 1 hour",
      verified: w.verification_status === "verified",
      location: {
        city: w.city || "Lahore",
        area: w.area || "",
        latitude: w.latitude,
        longitude: w.longitude,
      },
      serviceRadiusKm: w.service_radius_km || 25,
      remoteAvailable: Boolean(w.remote_available),
      onsiteAvailable: Boolean(w.onsite_available),
      availability: w.availability || "Available this week",
      languages: w.languages || ["English", "Urdu"],
      portfolio: portfolioMap.get(w.id) || [],
      distanceKm: w.distance_km !== null && w.distance_km !== undefined ? Number(w.distance_km) : undefined,
      createdAt: w.created_at,
    }));
  } catch (err) {
    console.error("Failed to get workers:", err);
    return [];
  }
}

async function fallbackGetWorkers(filters?: WorkerFilterParams): Promise<WorkerProfile[]> {
  let query = supabase
    .from("worker_profiles")
    .select(`
      *,
      profiles:user_id (
        id, full_name, avatar_url, city, area, latitude, longitude
      ),
      categories:category_id (
        id, name, slug
      ),
      portfolio_items (
        id, title, description, image_url
      )
    `);

  if (filters?.minRating) {
    query = query.gte("average_rating", filters.minRating);
  }
  if (filters?.maxPrice && filters.maxPrice < 5000) {
    query = query.lte("hourly_rate", filters.maxPrice);
  }
  if (filters?.remote) {
    query = query.eq("remote_available", true);
  }
  if (filters?.onsite) {
    query = query.eq("onsite_available", true);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((w: any) => ({
    id: w.id,
    userId: w.user_id,
    fullName: w.profiles?.full_name || "Worker",
    avatarUrl: w.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(w.profiles?.full_name || "Worker")}&background=F6C945&color=1E1E1E`,
    professionalTitle: w.professional_title,
    categoryId: w.category_id || "",
    categoryName: w.categories?.name || "General",
    subcategory: w.subcategory || undefined,
    description: w.description || "",
    skills: w.skills || [],
    experienceYears: w.experience_years || 0,
    hourlyRate: Number(w.hourly_rate),
    currency: w.currency || "PKR",
    rating: Number(w.average_rating) || 5.0,
    reviewCount: w.total_reviews || 0,
    jobsCompleted: w.completed_jobs || 0,
    responseTime: w.response_time || "< 1 hour",
    verified: w.verification_status === "verified",
    location: {
      city: w.city || w.profiles?.city || "Lahore",
      area: w.area || w.profiles?.area || "",
      latitude: w.latitude || w.profiles?.latitude,
      longitude: w.longitude || w.profiles?.longitude,
    },
    serviceRadiusKm: w.service_radius_km || 25,
    remoteAvailable: Boolean(w.remote_available),
    onsiteAvailable: Boolean(w.onsite_available),
    availability: w.availability || "Available this week",
    languages: w.languages || ["English", "Urdu"],
    portfolio: (w.portfolio_items || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      imageUrl: p.image_url,
      description: p.description,
    })),
    createdAt: w.created_at,
  }));
}

export async function getWorkerById(id: string): Promise<WorkerProfile | null> {
  const { data: w, error } = await supabase
    .from("worker_profiles")
    .select(`
      *,
      profiles:user_id (
        id, full_name, avatar_url, city, area, latitude, longitude
      ),
      categories:category_id (
        id, name, slug
      ),
      portfolio_items (
        id, title, description, image_url
      )
    `)
    .eq("id", id)
    .single();

  if (error || !w) return null;

  return {
    id: w.id,
    userId: w.user_id,
    fullName: w.profiles?.full_name || "Worker",
    avatarUrl: w.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(w.profiles?.full_name || "Worker")}&background=F6C945&color=1E1E1E`,
    professionalTitle: w.professional_title,
    categoryId: w.category_id || "",
    categoryName: w.categories?.name || "General",
    subcategory: w.subcategory || undefined,
    description: w.description || "",
    skills: w.skills || [],
    experienceYears: w.experience_years || 0,
    hourlyRate: Number(w.hourly_rate),
    currency: w.currency || "PKR",
    rating: Number(w.average_rating) || 5.0,
    reviewCount: w.total_reviews || 0,
    jobsCompleted: w.completed_jobs || 0,
    responseTime: w.response_time || "< 1 hour",
    verified: w.verification_status === "verified",
    location: {
      city: w.city || w.profiles?.city || "Lahore",
      area: w.area || w.profiles?.area || "",
      latitude: w.latitude || w.profiles?.latitude,
      longitude: w.longitude || w.profiles?.longitude,
    },
    serviceRadiusKm: w.service_radius_km || 25,
    remoteAvailable: Boolean(w.remote_available),
    onsiteAvailable: Boolean(w.onsite_available),
    availability: w.availability || "Available this week",
    languages: w.languages || ["English", "Urdu"],
    portfolio: (w.portfolio_items || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      imageUrl: p.image_url,
      description: p.description,
    })),
    createdAt: w.created_at,
  };
}

export async function getFeaturedWorkers(): Promise<WorkerProfile[]> {
  const workers = await getWorkers({ sort: "recommended" });
  const verified = workers.filter((w) => w.verified);
  if (verified.length > 0) return verified.slice(0, 4);
  return workers.slice(0, 4);
}

export async function createWorkerProfile(profileData: {
  fullName?: string;
  professionalTitle: string;
  categoryId?: string;
  categoryName?: string;
  city: string;
  area?: string;
  skills: string[];
  description: string;
  languages: string[];
  experienceYears: number;
  hourlyRate: number;
  remoteAvailable: boolean;
  onsiteAvailable: boolean;
  serviceRadiusKm: number;
  availability: string;
  portfolioImages?: string[];
  latitude?: number;
  longitude?: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in to create worker profile");

  // 1. Ensure user profile role is set to worker and name is updated
  await supabase
    .from("profiles")
    .update({
      full_name: profileData.fullName || user.user_metadata?.full_name,
      role: "worker",
      city: profileData.city,
      area: profileData.area,
      latitude: profileData.latitude,
      longitude: profileData.longitude,
    })
    .eq("id", user.id);

  // 2. Check if worker profile already exists for this user
  const { data: existing } = await supabase
    .from("worker_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let workerProfileId: string;

  if (existing) {
    const { data: updated, error } = await supabase
      .from("worker_profiles")
      .update({
        professional_title: profileData.professionalTitle,
        category_id: profileData.categoryId || null,
        city: profileData.city,
        area: profileData.area,
        skills: profileData.skills,
        description: profileData.description,
        languages: profileData.languages,
        experience_years: profileData.experienceYears,
        hourly_rate: profileData.hourlyRate,
        remote_available: profileData.remoteAvailable,
        onsite_available: profileData.onsiteAvailable,
        service_radius_km: profileData.serviceRadiusKm,
        availability: profileData.availability,
        latitude: profileData.latitude,
        longitude: profileData.longitude,
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) throw error;
    workerProfileId = updated.id;
  } else {
    const { data: inserted, error } = await supabase
      .from("worker_profiles")
      .insert({
        user_id: user.id,
        professional_title: profileData.professionalTitle,
        category_id: profileData.categoryId || null,
        city: profileData.city,
        area: profileData.area,
        skills: profileData.skills,
        description: profileData.description,
        languages: profileData.languages,
        experience_years: profileData.experienceYears,
        hourly_rate: profileData.hourlyRate,
        remote_available: profileData.remoteAvailable,
        onsite_available: profileData.onsiteAvailable,
        service_radius_km: profileData.serviceRadiusKm,
        availability: profileData.availability,
        latitude: profileData.latitude,
        longitude: profileData.longitude,
        verification_status: "pending",
      })
      .select()
      .single();

    if (error) throw error;
    workerProfileId = inserted.id;
  }

  // 3. Link worker services under the selected category
  if (profileData.categoryId) {
    const { data: catServices } = await supabase
      .from("services")
      .select("id, name")
      .eq("category_id", profileData.categoryId);

    if (catServices && catServices.length > 0) {
      await supabase.from("worker_services").delete().eq("worker_id", workerProfileId);
      const serviceLinks = catServices.slice(0, 3).map((s) => ({
        worker_id: workerProfileId,
        service_id: s.id,
      }));
      await supabase.from("worker_services").insert(serviceLinks);
    }
  }

  // 4. Save default weekly availability
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  await supabase.from("worker_availability").delete().eq("worker_id", workerProfileId);
  const availRows = days.map((day) => ({
    worker_id: workerProfileId,
    day_of_week: day,
    start_time: "09:00:00",
    end_time: "18:00:00",
    is_available: true,
  }));
  await supabase.from("worker_availability").insert(availRows);

  // 5. Add portfolio items if provided
  if (profileData.portfolioImages && profileData.portfolioImages.length > 0) {
    await supabase.from("portfolio_items").delete().eq("worker_id", workerProfileId);
    const portfolioRows = profileData.portfolioImages.map((url, i) => ({
      worker_id: workerProfileId,
      title: `Project ${i + 1}`,
      image_url: url,
    }));
    await supabase.from("portfolio_items").insert(portfolioRows);
  }

  return { id: workerProfileId };
}
