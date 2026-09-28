"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PlusCircle, CheckCircle, Calendar, MapPin, DollarSign } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { getCategories } from "@/services/categoriesService";
import { createJobPost } from "@/services/jobPostService";
import { useAuth } from "@/context/AuthContext";
import { Category } from "@/types";

export default function PostTaskPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [city, setCity] = useState(user?.location?.city || "Lahore");
  const [area, setArea] = useState(user?.location?.area || "");
  const [scheduledDate, setScheduledDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0 && !categoryId) {
        setCategoryId(cats[0].id);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push("/login");
      return;
    }

    if (!title || !description || !budget || !city) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await createJobPost({
        title,
        description,
        categoryId: categoryId || undefined,
        budget: Number(budget),
        locationCity: city,
        locationArea: area || undefined,
        scheduledDate: scheduledDate || undefined,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/jobs");
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to publish task. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Post a Task / Job</h1>
        <p className="text-ink-secondary text-sm mt-1">
          Tell workers what you need done. Qualified professionals will view your post and apply with proposals.
        </p>
      </div>

      {!user && (
        <div className="mb-6 p-4 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-between">
          <span className="text-sm font-medium text-ink">Please log in to publish a task post.</span>
          <Link href="/login"><Button size="sm">Log In</Button></Link>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm font-medium">
          {error}
        </div>
      )}

      {success ? (
        <Card className="text-center py-10">
          <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
          <h2 className="text-xl font-bold text-ink mb-1">Task Published Successfully!</h2>
          <p className="text-sm text-ink-secondary mb-4">
            Workers in your area can now view your post and submit their applications.
          </p>
          <Button onClick={() => router.push("/jobs")}>View Job Board</Button>
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Task title"
              placeholder="e.g. Need Electrician to Install 5 Ceiling Fans"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-11 rounded-xl border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 bg-white"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">Task Description</label>
              <textarea
                rows={4}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the task in detail, requirements, and any specific tools needed..."
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Budget (PKR)"
                type="number"
                placeholder="e.g. 3500"
                required
                icon={<DollarSign size={16} />}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />

              <Input
                label="Preferred Date"
                type="date"
                icon={<Calendar size={16} />}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="City"
                placeholder="e.g. Lahore, Karachi, Islamabad"
                required
                icon={<MapPin size={16} />}
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />

              <Input
                label="Area / Neighborhood"
                placeholder="e.g. Model Town, DHA Phase 4"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <Button type="submit" loading={submitting}>
                <PlusCircle size={16} /> Publish Task
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
