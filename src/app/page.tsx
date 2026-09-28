import Link from "next/link";
import Image from "next/image";
import {
  Search, MapPin, Home, Laptop, Sparkles, Wrench, Truck, GraduationCap,
  PartyPopper, Sparkle, HardHat, Palette, Briefcase, Heart, Shield,
  CheckCircle, Star, Clock, MessageSquare, Calendar, ArrowRight, UserCheck
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import WorkerCard from "@/components/workers/WorkerCard";
import HomeHeroSearch from "@/components/home/HomeHeroSearch";
import HomeCTAActions from "@/components/home/HomeCTAActions";
import { getCategories } from "@/services/categoriesService";
import { getFeaturedWorkers } from "@/services/workersService";

const iconMap: Record<string, React.ElementType> = {
  Home, Laptop, Sparkles, Wrench, Truck, GraduationCap,
  PartyPopper, Sparkle, HardHat, Palette, Briefcase, Heart,
};

const howItWorks = [
  { step: "1", title: "Describe your task", desc: "Tell us what you need done and when you need it." },
  { step: "2", title: "Find the right person", desc: "Browse verified workers near you or online." },
  { step: "3", title: "Hire & get it done", desc: "Request, communicate, and complete the job." },
];

const trustFeatures = [
  { icon: Shield, title: "Verified workers", desc: "Identity-checked professionals" },
  { icon: CheckCircle, title: "Secure requests", desc: "Safe hiring workflow" },
  { icon: Star, title: "Reviews & ratings", desc: "Real feedback from actual completed jobs" },
  { icon: MessageSquare, title: "Easy communication", desc: "Built-in real-time messaging" },
  { icon: Calendar, title: "Flexible scheduling", desc: "Book when it suits you" },
  { icon: Clock, title: "Transparent pricing", desc: "Clear rates agreed before starting" },
];

export default async function HomePage() {
  const [categories, featured] = await Promise.all([
    getCategories(),
    getFeaturedWorkers(),
  ]);

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary-100 to-surface-muted pt-16 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <Badge variant="primary" className="mb-4">Marketplace for every skill</Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-ink tracking-tight max-w-3xl mx-auto leading-tight">
            Find the right person for any task.
          </h1>
          <p className="mt-4 text-lg text-ink-secondary max-w-xl mx-auto">
            From home repairs to digital work, hire verified people for the time you need.
          </p>

          {/* Interactive Search with Login Requirement */}
          <HomeHeroSearch />
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 -mt-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {categories.map((cat) => {
            const Icon = iconMap[cat.icon] || Briefcase;
            return (
              <Link key={cat.id} href={`/workers?category=${cat.slug}`}>
                <Card hover className="text-center !p-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-2">
                    <Icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <p className="text-sm font-medium text-ink">{cat.name}</p>
                  <p className="text-xs text-ink-muted mt-0.5">
                    {cat.workerCount === 1
                      ? "1 worker"
                      : cat.workerCount > 1
                      ? `${cat.workerCount.toLocaleString()} workers`
                      : "Explore"}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Actual Featured workers (Real registered workers from DB) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-ink">Featured Workers</h2>
            <p className="text-ink-secondary text-sm mt-1">Verified professionals ready to help</p>
          </div>
          <Link href="/workers" className="text-sm font-medium text-ink hover:underline flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {featured.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.map((w) => (
              <WorkerCard key={w.id} worker={w} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-border p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-3 text-ink">
              <Briefcase size={22} className="text-primary-600" />
            </div>
            <h3 className="font-semibold text-ink text-lg mb-1">No registered workers yet</h3>
            <p className="text-sm text-ink-secondary max-w-md mx-auto mb-5">
              Be among the first skilled professionals to offer services in your area. Sign up and start getting hired.
            </p>
            <Link href="/become-worker">
              <Button>Become a Worker</Button>
            </Link>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="bg-white border-y border-border py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-bold text-ink text-center mb-2">How it works</h2>
          <p className="text-ink-secondary text-center mb-10">Get help in three simple steps</p>
          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 text-lg font-bold text-ink">
                  {item.step}
                </div>
                <h3 className="font-semibold text-ink mb-1">{item.title}</h3>
                <p className="text-sm text-ink-secondary">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Guarantees */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <h2 className="text-2xl font-bold text-ink text-center mb-2">Your work, your way.</h2>
        <p className="text-ink-secondary text-center mb-10">Built for trust and quality assurance</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {trustFeatures.map((f) => (
            <Card key={f.title} className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-ink">{f.title}</h3>
                <p className="text-sm text-ink-secondary mt-0.5">{f.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Interactive CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-primary rounded-2xl p-10 sm:p-14 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-3">Ready to get started?</h2>
          <p className="text-ink/80 mb-8 max-w-md mx-auto">
            Join verified customers and skilled workers on Workly today.
          </p>
          <HomeCTAActions />
        </div>
      </section>
    </div>
  );
}
