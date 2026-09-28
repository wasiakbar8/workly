"use client";
import { useState, useEffect, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, MapPin, Navigation, Users } from "lucide-react";
import WorkerCard from "@/components/workers/WorkerCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Skeleton from "@/components/ui/Skeleton";
import { getWorkers } from "@/services/workersService";
import { getCategories } from "@/services/categoriesService";
import { WorkerProfile, Category } from "@/types";

const sortOptions = [
  { value: "recommended", label: "Recommended" },
  { value: "rating", label: "Rating" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "experience", label: "Most Experienced" },
  { value: "nearest", label: "Nearest" },
];

const distanceOptions = [
  { label: "Any distance", value: null },
  { label: "Within 1 km", value: 1 },
  { label: "Within 5 km", value: 5 },
  { label: "Within 10 km", value: 10 },
  { label: "Within 25 km", value: 25 },
  { label: "Within 50 km", value: 50 },
];

export default function WorkersPage() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category") || "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [workersList, setWorkersList] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState("recommended");
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [minRating, setMinRating] = useState(0);
  const [mode, setMode] = useState<"all" | "remote" | "onsite">("all");
  const [selectedDistance, setSelectedDistance] = useState<number | null>(null);

  // User location
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [locating, setLocating] = useState(false);

  // Load categories
  useEffect(() => {
    getCategories().then((cats) => {
      setCategories(cats);
    });
  }, []);

  // Fetch workers when filters change
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    getWorkers({
      category,
      search,
      sort,
      minRating: minRating > 0 ? minRating : undefined,
      maxPrice: maxPrice < 5000 ? maxPrice : undefined,
      remote: mode === "remote" ? true : undefined,
      onsite: mode === "onsite" ? true : undefined,
      lat: userCoords?.lat,
      lng: userCoords?.lng,
      maxDistanceKm: selectedDistance ?? undefined,
    }).then((res) => {
      if (!isCancelled) {
        setWorkersList(res);
        setLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [search, category, sort, maxPrice, minRating, mode, userCoords, selectedDistance]);

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLocationName("📍 Current Location");
        setLocating(false);
        if (sort === "recommended") setSort("nearest");
      },
      (err) => {
        console.warn("Location error:", err);
        setLocating(false);
        alert("Location access was denied or is unavailable. You can search by city.");
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Find workers</h1>
          <p className="text-ink-secondary text-sm mt-1">
            {loading ? "Searching verified workers..." : `${workersList.length} workers available`}
          </p>
        </div>

        {/* Location GPS trigger */}
        <div className="flex items-center gap-2">
          {locationName ? (
            <span className="text-xs bg-primary/20 text-ink font-medium px-3 py-1.5 rounded-xl border border-primary/30 flex items-center gap-1.5">
              {locationName}
              <button onClick={() => { setUserCoords(null); setLocationName(""); }} className="hover:text-error ml-1 font-bold">×</button>
            </span>
          ) : (
            <Button variant="outline" size="sm" onClick={detectLocation} loading={locating} className="text-xs">
              <Navigation size={14} /> Use My Location
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters */}
        <aside className={`lg:w-64 shrink-0 space-y-5 ${showFilters ? "block" : "hidden lg:block"}`}>
          <div className="bg-white rounded-2xl border border-border p-5 space-y-5 sticky top-20">
            <div>
              <label className="text-sm font-medium text-ink mb-2 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-ink mb-2 block">Service type</label>
              <div className="flex flex-wrap gap-2">
                {(["all", "remote", "onsite"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      mode === m ? "bg-primary border-primary text-ink" : "border-border text-ink-secondary hover:bg-surface-muted"
                    }`}
                  >
                    {m === "all" ? "All" : m === "remote" ? "Remote" : "On-site"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-ink mb-2 block">Max price: Rs. {maxPrice}</label>
              <input
                type="range"
                min={500}
                max={5000}
                step={100}
                value={maxPrice}
                onChange={(e) => setMaxPrice(+e.target.value)}
                className="w-full accent-primary"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-ink mb-2 block">Min rating</label>
              <div className="flex gap-2">
                {[0, 3, 4, 4.5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setMinRating(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                      minRating === r ? "bg-primary border-primary" : "border-border text-ink-secondary"
                    }`}
                  >
                    {r === 0 ? "Any" : `${r}+`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-ink mb-2 block">Distance</label>
              <select
                value={selectedDistance === null ? "" : selectedDistance}
                onChange={(e) => setSelectedDistance(e.target.value ? Number(e.target.value) : null)}
                className="w-full h-10 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              >
                {distanceOptions.map((d) => (
                  <option key={d.label} value={d.value === null ? "" : d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                setCategory("");
                setMaxPrice(5000);
                setMinRating(0);
                setMode("all");
                setSearch("");
                setSelectedDistance(null);
                setUserCoords(null);
                setLocationName("");
              }}
            >
              Clear filters
            </Button>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="flex-1">
              <Input
                icon={<Search size={16} />}
                placeholder="Search by skill, name, or profession..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="h-11 rounded-xl border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Button variant="outline" className="lg:hidden" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal size={16} /> Filters
            </Button>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-border p-5 space-y-4">
                  <div className="flex gap-4">
                    <Skeleton className="w-16 h-16 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          ) : workersList.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No workers found"
              description="Try adjusting your filters or search terms to find more workers."
              actionLabel="Clear filters"
              actionHref="/workers"
            />
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {workersList.map((w) => (
                <WorkerCard key={w.id} worker={w} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
