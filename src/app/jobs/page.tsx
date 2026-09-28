"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Briefcase, MapPin, Calendar, DollarSign, Send, CheckCircle, Search, Filter } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { getJobPosts, applyToJobPost, JobPost } from "@/services/jobPostService";
import { getCategories } from "@/services/categoriesService";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";
import { Category } from "@/types";

export default function JobsPage() {
  const { user, role } = useAuth();
  const [posts, setPosts] = useState<JobPost[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [loading, setLoading] = useState(true);

  // Apply modal state
  const [activePost, setActivePost] = useState<JobPost | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [applying, setApplying] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [applyError, setApplyError] = useState("");

  const loadPosts = async () => {
    setLoading(true);
    const data = await getJobPosts({
      categoryId: selectedCat || undefined,
      city: cityFilter || undefined,
    });
    setPosts(data);
    setLoading(false);
  };

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    loadPosts();
  }, [selectedCat, cityFilter]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePost) return;
    setApplying(true);
    setApplyError("");

    try {
      await applyToJobPost({
        jobPostId: activePost.id,
        bidAmount: bidAmount ? Number(bidAmount) : activePost.budget,
        coverNote,
      });

      setApplySuccess(true);
      setTimeout(() => {
        setApplySuccess(false);
        setActivePost(null);
        setBidAmount("");
        setCoverNote("");
        loadPosts();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setApplyError(err.message || "Failed to submit application. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Job Board — Available Tasks</h1>
          <p className="text-ink-secondary text-sm mt-1">
            Browse tasks posted by customers looking for skilled workers. Apply with your proposal.
          </p>
        </div>

        {role !== "worker" && (
          <Link href="/post-task">
            <Button size="sm">Post a Task</Button>
          </Link>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-border p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="w-full h-10 rounded-xl border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Filter by city (e.g. Lahore, Karachi)"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-full h-10 rounded-xl border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No open tasks right now"
          description="Check back soon or post a new task for workers to view."
          actionLabel="Post a Task"
          actionHref="/post-task"
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map((post) => (
            <Card key={post.id} className="flex flex-col justify-between hover:border-primary/40 transition-colors">
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge variant="primary">{post.categoryName}</Badge>
                  <span className="text-xs text-ink-muted">
                    {post.applicationsCount} {post.applicationsCount === 1 ? "applicant" : "applicants"}
                  </span>
                </div>

                <h3 className="font-bold text-ink text-base mb-1 line-clamp-1">{post.title}</h3>
                <p className="text-sm text-ink-secondary line-clamp-3 mb-4 leading-relaxed">
                  {post.description}
                </p>

                <div className="space-y-1.5 text-xs text-ink-secondary mb-4 border-t border-border pt-3">
                  <p className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-ink-muted" />
                    <span>{post.locationCity}{post.locationArea ? `, ${post.locationArea}` : ""}</span>
                  </p>
                  {post.scheduledDate && (
                    <p className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-ink-muted" />
                      <span>{post.scheduledDate}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-1.5">
                    <DollarSign size={13} className="text-ink-muted" />
                    <span className="font-semibold text-ink">{formatCurrency(post.budget, post.currency)}</span>
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-ink-muted">Posted by {post.customerName}</span>
                {post.hasApplied ? (
                  <Badge variant="success">Applied</Badge>
                ) : role === "worker" ? (
                  <Button size="sm" onClick={() => { setActivePost(post); setBidAmount(String(post.budget)); }}>
                    Apply
                  </Button>
                ) : (
                  <Link href="/login">
                    <Button variant="outline" size="sm">Apply as Worker</Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Application Modal */}
      {activePost && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg bg-white relative">
            <h3 className="text-lg font-bold text-ink mb-1">Apply for Task</h3>
            <p className="text-xs text-ink-secondary mb-4">{activePost.title} — Budget: {formatCurrency(activePost.budget)}</p>

            {applyError && (
              <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-medium">
                {applyError}
              </div>
            )}

            {applySuccess ? (
              <div className="text-center py-6">
                <CheckCircle className="w-12 h-12 text-success mx-auto mb-2" />
                <p className="font-bold text-ink">Application Submitted!</p>
                <p className="text-xs text-ink-secondary">The customer will review your proposal.</p>
              </div>
            ) : (
              <form onSubmit={handleApply} className="space-y-4">
                <Input
                  label="Your Bid Amount (PKR)"
                  type="number"
                  required
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={String(activePost.budget)}
                />

                <div>
                  <label className="text-xs font-medium text-ink mb-1 block">Proposal / Cover Note</label>
                  <textarea
                    rows={3}
                    value={coverNote}
                    onChange={(e) => setCoverNote(e.target.value)}
                    placeholder="Explain why you are the best fit for this task and when you can start..."
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setActivePost(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" loading={applying}>
                    <Send size={14} /> Submit Proposal
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
