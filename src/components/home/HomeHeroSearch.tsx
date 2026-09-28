"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin } from "lucide-react";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

export default function HomeHeroSearch() {
  const router = useRouter();
  const { user } = useAuth();
  const [taskQuery, setTaskQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      const destination = "/workers" + (taskQuery ? `?search=${encodeURIComponent(taskQuery)}` : "");
      router.push(`/login?redirect=${encodeURIComponent(destination)}`);
      return;
    }

    const params = new URLSearchParams();
    if (taskQuery.trim()) params.set("search", taskQuery.trim());
    if (locationQuery.trim()) params.set("city", locationQuery.trim());
    router.push(`/workers${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <form onSubmit={handleSearch} className="mt-10 max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-elevated border border-border p-2 flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex items-center gap-2 px-3">
          <Search className="text-ink-muted shrink-0" size={18} />
          <input
            type="text"
            value={taskQuery}
            onChange={(e) => setTaskQuery(e.target.value)}
            placeholder="What do you need help with?"
            className="w-full h-11 text-sm outline-none text-ink placeholder:text-ink-muted bg-transparent"
          />
        </div>
        <div className="hidden sm:block w-px bg-border" />
        <div className="flex-1 flex items-center gap-2 px-3">
          <MapPin className="text-ink-muted shrink-0" size={18} />
          <input
            type="text"
            value={locationQuery}
            onChange={(e) => setLocationQuery(e.target.value)}
            placeholder="Where? (e.g. Lahore)"
            className="w-full h-11 text-sm outline-none text-ink placeholder:text-ink-muted bg-transparent"
          />
        </div>
        <Button type="submit" size="lg" className="w-full sm:w-auto font-semibold">
          Find Workers
        </Button>
      </div>
    </form>
  );
}
