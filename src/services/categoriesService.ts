import { supabase } from "@/lib/supabase/client";
import { Category } from "@/types";

let cachedCategories: Category[] | null = null;
let lastFetch = 0;

export async function getCategories(): Promise<Category[]> {
  const now = Date.now();
  if (cachedCategories && now - lastFetch < 60000) {
    return cachedCategories;
  }

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    return cachedCategories || [];
  }

  cachedCategories = (data || []).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    workerCount: c.worker_count || 0,
    description: c.description || undefined,
  }));
  lastFetch = now;

  return cachedCategories;
}
