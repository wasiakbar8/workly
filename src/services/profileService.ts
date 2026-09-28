import { supabase } from "@/lib/supabase/client";
import { User, LocationInfo } from "@/types";

export async function getProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    phone: data.phone,
    role: data.role as any,
    location: data.city ? {
      country: data.country,
      city: data.city,
      area: data.area,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
    } : undefined,
    createdAt: data.created_at,
  };
}

export async function updateProfile(userId: string, updates: {
  fullName?: string;
  avatarUrl?: string;
  phone?: string;
  location?: LocationInfo;
  bio?: string;
}) {
  const payload: any = {
    updated_at: new Date().toISOString(),
  };

  if (updates.fullName !== undefined) payload.full_name = updates.fullName;
  if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;
  if (updates.phone !== undefined) payload.phone = updates.phone;
  if (updates.bio !== undefined) payload.bio = updates.bio;

  if (updates.location) {
    if (updates.location.city !== undefined) payload.city = updates.location.city;
    if (updates.location.area !== undefined) payload.area = updates.location.area;
    if (updates.location.address !== undefined) payload.address = updates.location.address;
    if (updates.location.country !== undefined) payload.country = updates.location.country;
    if (updates.location.latitude !== undefined) payload.latitude = updates.location.latitude;
    if (updates.location.longitude !== undefined) payload.longitude = updates.location.longitude;
  }

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId);

  if (error) throw error;
}

export async function uploadAvatar(file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in to upload avatar");

  const fileExt = file.name.split(".").pop();
  const filePath = `${user.id}/${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  await updateProfile(user.id, { avatarUrl: data.publicUrl });
  return data.publicUrl;
}
