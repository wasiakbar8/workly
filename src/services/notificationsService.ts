import { supabase } from "@/lib/supabase/client";
import { Notification } from "@/types";

export async function getNotifications(): Promise<Notification[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((n: any): Notification => ({
    id: n.id,
    type: n.type as any,
    title: n.title,
    body: n.body,
    read: n.read,
    createdAt: n.created_at,
    link: n.link,
  }));
}

export async function markNotificationAsRead(id: string) {
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
}

export async function markAllNotificationsAsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id);
}
