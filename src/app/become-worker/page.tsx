"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Image from "next/image";
import { Check, Camera, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCategories } from "@/services/categoriesService";
import { createWorkerProfile } from "@/services/workersService";
import { uploadAvatar } from "@/services/profileService";
import { useAuth } from "@/context/AuthContext";
import { Category } from "@/types";

const steps = ["Basic Info", "Skills", "Experience", "Pricing", "Availability", "Preview"];

export default function BecomeWorkerPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState("");

  const [categories, setCategories] = useState<Category[]>([]);

  // Form state
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [fullName, setFullName] = useState(user?.fullName || "");
  const [professionalTitle, setProfessionalTitle] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [city, setCity] = useState(user?.location?.city || "");
  const [area, setArea] = useState(user?.location?.area || "");

  const [skills, setSkills] = useState("");
  const [description, setDescription] = useState("");
  const [languages, setLanguages] = useState("Urdu, English");

  const [experienceYears, setExperienceYears] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  const [hourlyRate, setHourlyRate] = useState("");
  const [serviceMode, setServiceMode] = useState<"On-site" | "Remote" | "Both">("Both");
  const [serviceRadiusKm, setServiceRadiusKm] = useState(20);

  const [availability, setAvailability] = useState("Available weekdays 9 AM – 6 PM");

  useEffect(() => {
    if (user?.avatarUrl && !avatarUrl) {
      setAvatarUrl(user.avatarUrl);
    }
    if (user?.fullName && !fullName) {
      setFullName(user.fullName);
    }
    if (user?.location?.city && !city) {
      setCity(user.location.city);
    }
    getCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0 && !categoryId) {
        setCategoryId(cats[0].id);
      }
    });
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setError("");
    try {
      const url = await uploadAvatar(file);
      setAvatarUrl(url);
      await refreshUser();
    } catch (err: any) {
      console.error(err);
      setError("Failed to upload profile picture. Please try again.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePublish = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await createWorkerProfile({
        fullName,
        professionalTitle,
        categoryId: categoryId || undefined,
        city: city || "Unknown",
        area: area || "",
        skills: skills ? skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
        description: description || "Professional service provider available for hire.",
        languages: languages ? languages.split(",").map((l) => l.trim()).filter(Boolean) : ["English", "Urdu"],
        experienceYears: Number(experienceYears) || 1,
        hourlyRate: Number(hourlyRate) || 1000,
        remoteAvailable: serviceMode === "Remote" || serviceMode === "Both",
        onsiteAvailable: serviceMode === "On-site" || serviceMode === "Both",
        serviceRadiusKm,
        availability,
        portfolioImages: portfolioUrl ? [portfolioUrl] : [],
      });

      await refreshUser();
      setDone(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to publish profile. Please verify your details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-success/15 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-success" />
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2">Profile created!</h1>
        <p className="text-ink-secondary mb-6">Your worker profile is ready and published to Supabase.</p>
        <Button onClick={() => router.push("/worker-dashboard")}>Go to Worker Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-ink mb-1">Become a Worker</h1>
      <p className="text-ink-secondary text-sm mb-8">Create your professional profile in a few steps</p>

      {!user && (
        <div className="mb-6 p-4 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-between">
          <span className="text-sm font-medium text-ink">You are not logged in. Log in to save your worker profile.</span>
          <Link href="/login"><Button size="sm">Log In</Button></Link>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm font-medium">
          {error}
        </div>
      )}

      <div className="flex gap-1 mb-8 overflow-x-auto pb-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-1 shrink-0">
            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold", i <= step ? "bg-primary text-ink" : "bg-zinc-100 text-ink-muted")}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={cn("text-xs hidden sm:inline", i <= step ? "text-ink font-medium" : "text-ink-muted")}>{s}</span>
            {i < steps.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
          </div>
        ))}
      </div>

      <Card>
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-ink">Basic Information</h2>

            {/* Profile Picture Upload */}
            <div className="flex items-center gap-4 p-4 bg-surface-muted rounded-2xl border border-border">
              <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary shrink-0 bg-white flex items-center justify-center shadow-sm">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="Avatar" width={64} height={64} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-ink">{fullName ? fullName.charAt(0) : "W"}</span>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-bold">
                    ...
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-ink">Profile Picture</p>
                <p className="text-xs text-ink-secondary mb-2">Upload your real photo so customers recognize and trust you</p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-border text-xs font-semibold text-ink cursor-pointer hover:border-primary transition-colors">
                  <Camera size={14} className="text-primary-600" />
                  <span>{uploadingAvatar ? "Uploading photo..." : "Upload Photo"}</span>
                  <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploadingAvatar} className="hidden" />
                </label>
              </div>
            </div>

            <Input
              label="Full name"
              placeholder="Your full name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <Input
              label="Professional title"
              placeholder="e.g. Electrician, Developer, Plumber"
              required
              value={professionalTitle}
              onChange={(e) => setProfessionalTitle(e.target.value)}
            />
            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-11 rounded-xl border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="City"
              placeholder="e.g. Lahore, Karachi, Islamabad"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
            <Input
              label="Area / Neighborhood"
              placeholder="e.g. DHA Phase 5, Gulberg, F-7"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-ink">Skills</h2>
            <Input
              label="Skills (comma-separated)"
              placeholder="Wiring, Panel Upgrade, Lighting"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">About you</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Describe your experience and what you offer..."
              />
            </div>
            <Input
              label="Languages"
              placeholder="Urdu, English"
              value={languages}
              onChange={(e) => setLanguages(e.target.value)}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-ink">Experience</h2>
            <Input
              label="Years of experience"
              type="number"
              placeholder="5"
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
            />
            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">Portfolio images (URL)</label>
              <Input
                placeholder="https://images.unsplash.com/..."
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-ink">Pricing</h2>
            <Input
              label="Hourly rate (PKR)"
              type="number"
              placeholder="1500"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">Service type</label>
              <div className="flex gap-2">
                {(["On-site", "Remote", "Both"] as const).map((m) => (
                  <Badge
                    key={m}
                    variant={serviceMode === m ? "primary" : "outline"}
                    className="cursor-pointer px-3 py-1.5"
                    onClick={() => setServiceMode(m)}
                  >
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">Service radius (km)</label>
              <select
                value={serviceRadiusKm}
                onChange={(e) => setServiceRadiusKm(Number(e.target.value))}
                className="w-full h-11 rounded-xl border border-border px-3 text-sm"
              >
                {[5, 10, 20, 50].map((r) => <option key={r} value={r}>{r} km</option>)}
              </select>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-ink">Availability</h2>
            <Input
              label="Availability note"
              placeholder="e.g. Available weekdays 9 AM – 6 PM"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <label key={d} className="flex items-center gap-2 text-sm border border-border rounded-xl px-3 py-2 cursor-pointer hover:bg-surface-muted">
                  <input type="checkbox" defaultChecked={d !== "Sun"} className="accent-primary" /> {d}
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 text-center">
            <h2 className="font-semibold text-ink">Profile Preview</h2>
            <p className="text-sm text-ink-secondary">Your profile looks great! Review and submit to go live.</p>
            <div className="bg-surface-muted rounded-xl p-6 text-left space-y-2">
              <p className="font-bold text-ink text-base">{professionalTitle || "Service Specialist"}</p>
              <p className="text-sm text-ink">{fullName} · {city} {area ? `(${area})` : ""}</p>
              <p className="text-sm text-ink-secondary">{description || "No description added."}</p>
              <div className="pt-2 flex flex-wrap gap-2 text-xs">
                <Badge variant="primary">Rs. {hourlyRate}/hr</Badge>
                <Badge variant="outline">{serviceMode}</Badge>
                <Badge variant="outline">{experienceYears} Years Exp</Badge>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8 pt-4 border-t border-border">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>Continue</Button>
          ) : (
            <Button onClick={handlePublish} loading={submitting}>Publish Profile</Button>
          )}
        </div>
      </Card>
    </div>
  );
}
