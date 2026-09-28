import { supabase } from "@/lib/supabase/client";
import { User } from "@/types";

export async function signUp(email: string, password: string, fullName: string, role: "customer" | "worker" = "customer") {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) throw error;
  return data;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email || "",
    fullName: profile?.full_name || user.user_metadata?.full_name || "User",
    avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url,
    phone: profile?.phone,
    role: (profile?.role as "customer" | "worker" | "admin") || "customer",
    location: profile?.city ? {
      country: profile.country,
      city: profile.city,
      area: profile.area,
      address: profile.address,
      latitude: profile.latitude,
      longitude: profile.longitude,
    } : undefined,
    createdAt: profile?.created_at || user.created_at,
  };
}
