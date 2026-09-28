import { supabase } from "@/lib/supabase/client";
import { WorkerProfile } from "@/types";
import { getWorkerById } from "./workersService";

export async function getSavedWorkers(): Promise<WorkerProfile[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("saved_workers")
    .select("worker_id")
    .eq("user_id", user.id);

  if (error || !data) return [];

  const workerPromises = data.map((item) => getWorkerById(item.worker_id));
  const results = await Promise.all(workerPromises);
  return results.filter((w): w is WorkerProfile => w !== null);
}

export async function saveWorker(workerId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Must be logged in to save workers");

  await supabase
    .from("saved_workers")
    .insert({
      user_id: user.id,
      worker_id: workerId,
    });
}

export async function unsaveWorker(workerId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("saved_workers")
    .delete()
    .eq("user_id", user.id)
    .eq("worker_id", workerId);
}

export async function isWorkerSaved(workerId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("saved_workers")
    .select("id")
    .eq("user_id", user.id)
    .eq("worker_id", workerId)
    .single();

  return Boolean(data);
}
