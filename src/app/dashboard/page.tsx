"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar, Clock, MapPin, MessageSquare, Bell, Briefcase, PlusCircle, CheckCircle, Star, Send
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { getBookings, getJobRequests } from "@/services/bookingService";
import { getNotifications } from "@/services/notificationsService";
import { getSavedWorkers } from "@/services/savedWorkersService";
import { getConversations } from "@/services/messageService";
import { getCustomerJobPosts, acceptJobApplication } from "@/services/jobPostService";
import { useAuth } from "@/context/AuthContext";
import { formatCurrency } from "@/lib/utils";
import { Booking, JobRequest, Notification, WorkerProfile } from "@/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [pending, setPending] = useState<JobRequest[]>([]);
  const [notificationsList, setNotificationsList] = useState<Notification[]>([]);
  const [savedWorkers, setSavedWorkers] = useState<WorkerProfile[]>([]);
  const [conversationCount, setConversationCount] = useState(0);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    const [b, r, n, s, convs, posts] = await Promise.all([
      getBookings("upcoming"),
      getJobRequests("pending"),
      getNotifications(),
      getSavedWorkers(),
      getConversations(),
      getCustomerJobPosts(),
    ]);

    setUpcoming(b);
    setPending(r);
    setNotificationsList(n);
    setSavedWorkers(s);
    setConversationCount(convs.length);
    setMyTasks(posts);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleAcceptProposal = async (applicationId: string) => {
    setAcceptingId(applicationId);
    try {
      await acceptJobApplication(applicationId);
      // Reload both upcoming bookings and tasks to show the new upcoming job immediately!
      await loadAll();
    } catch (err: any) {
      console.error("Accept proposal error:", err);
      alert(err.message || "Failed to accept proposal.");
    } finally {
      setAcceptingId(null);
    }
  };

  const unreadCount = notificationsList.filter((n) => !n.read).length;
  const totalProposals = myTasks.reduce((acc, t) => acc + (t.applications?.length || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            Welcome back{user?.fullName ? `, ${user.fullName.split(" ")[0]}` : ""}
          </h1>
          <p className="text-ink-secondary text-sm mt-1">Here&apos;s what&apos;s happening with your tasks and bookings</p>
        </div>

        <div className="flex gap-2">
          <Link href="/post-task">
            <Button size="sm">
              <PlusCircle size={15} /> Post a Task
            </Button>
          </Link>
          <Link href="/workers">
            <Button variant="outline" size="sm">Find Workers</Button>
          </Link>
        </div>
      </div>

      {/* Metrics Header */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Upcoming jobs", value: upcoming.length, icon: Calendar, href: "/bookings" },
          { label: "Worker proposals", value: totalProposals, icon: Briefcase, href: "#my-tasks" },
          { label: "Messages", value: conversationCount, icon: MessageSquare, href: "/messages" },
          { label: "Notifications", value: unreadCount, icon: Bell, href: "/notifications" },
        ].map((s) => (
          <Link key={s.label} href={s.href}>
            <Card hover className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <s.icon className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">{s.value}</p>
                <p className="text-xs text-ink-secondary">{s.label}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* SECTION 1: My Posted Tasks & Worker Applications */}
      <div id="my-tasks" className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-ink">My Posted Tasks & Worker Proposals</h2>
            <p className="text-xs text-ink-secondary">Review worker applications and accept proposals to create bookings</p>
          </div>
          <Link href="/post-task">
            <Button variant="outline" size="sm">
              <PlusCircle size={14} /> Post Another Task
            </Button>
          </Link>
        </div>

        {loading ? (
          <Card className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-20 w-full" />
          </Card>
        ) : myTasks.length === 0 ? (
          <Card className="text-center py-8">
            <Briefcase size={36} className="text-ink-muted mx-auto mb-2 opacity-60" />
            <p className="font-semibold text-ink text-sm">No tasks posted yet</p>
            <p className="text-xs text-ink-secondary max-w-sm mx-auto mb-4">
              Post a task to receive competitive quotes and proposals from skilled workers near you.
            </p>
            <Link href="/post-task">
              <Button size="sm">Post Your First Task</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {myTasks.map((task) => (
              <Card key={task.id} className="border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-ink text-base">{task.title}</h3>
                      <Badge variant={task.status === "open" ? "primary" : task.status === "assigned" ? "success" : "default"}>
                        {task.status === "open" ? "Open for Bids" : task.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 text-xs text-ink-secondary">
                      <span>Category: {task.categoryName}</span>
                      <span>•</span>
                      <span>Budget: {formatCurrency(task.budget, task.currency)}</span>
                      <span>•</span>
                      <span>Location: {task.locationCity}{task.locationArea ? `, ${task.locationArea}` : ""}</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-ink bg-surface-muted px-3 py-1 rounded-xl self-start sm:self-auto">
                    {task.applications.length} {task.applications.length === 1 ? "Worker applied" : "Workers applied"}
                  </span>
                </div>

                {/* Worker Applications List */}
                <div className="mt-3 space-y-3">
                  {task.applications.length === 0 ? (
                    <p className="text-xs text-ink-muted py-2 italic">
                      Waiting for workers to view and submit proposals...
                    </p>
                  ) : (
                    task.applications.map((app: any) => (
                      <div
                        key={app.id}
                        className="p-3 rounded-xl bg-surface-muted/50 border border-border/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3">
                          {app.workerAvatar ? (
                            <Image
                              src={app.workerAvatar}
                              alt=""
                              width={40}
                              height={40}
                              className="rounded-full w-10 h-10 object-cover border border-border shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-ink shrink-0">
                              {app.workerName.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-sm text-ink">{app.workerName}</p>
                              {app.workerRating && (
                                <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-500">
                                  <Star size={11} className="fill-amber-400" /> {app.workerRating.toFixed(1)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-ink-secondary">{app.workerTitle || "Service Specialist"}</p>
                            {app.coverNote && (
                              <p className="text-xs text-ink mt-1 bg-white p-2 rounded-lg border border-border/50 max-w-lg">
                                &ldquo;{app.coverNote}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Bid & Actions */}
                        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-border/40">
                          <div>
                            <p className="text-[10px] text-ink-muted text-right">Proposed Price</p>
                            <p className="text-sm font-bold text-ink">
                              {formatCurrency(app.bidAmount || task.budget)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Chat with worker */}
                            {app.workerUserId && (
                              <Link href={`/messages?to=${app.workerUserId}&name=${encodeURIComponent(app.workerName)}`}>
                                <Button variant="outline" size="sm" title="Chat with worker">
                                  <MessageSquare size={13} />
                                </Button>
                              </Link>
                            )}

                            {app.status === "accepted" ? (
                              <Badge variant="success" className="px-3 py-1.5">Accepted</Badge>
                            ) : task.status === "open" ? (
                              <Button
                                size="sm"
                                loading={acceptingId === app.id}
                                onClick={() => handleAcceptProposal(app.id)}
                              >
                                Accept Proposal
                              </Button>
                            ) : (
                              <Badge variant="default">Closed</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Upcoming Jobs & Bookings */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-ink">Upcoming Scheduled Jobs</h2>
            <Link href="/bookings" className="text-sm text-ink-secondary hover:underline">View all</Link>
          </div>
          {loading ? (
            <Card className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </Card>
          ) : upcoming.length === 0 ? (
            <Card><p className="text-sm text-ink-secondary text-center py-6">No upcoming jobs scheduled yet</p></Card>
          ) : (
            <div className="space-y-3">
              {upcoming.map((b) => (
                <Card key={b.id} hover className="border-border">
                  <div className="flex gap-3">
                    {b.workerAvatar ? (
                      <Image src={b.workerAvatar} alt="" width={48} height={48} className="rounded-full object-cover w-12 h-12 shrink-0 border border-border" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-ink shrink-0">
                        {b.workerName.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-ink truncate">{b.task}</p>
                        <Badge variant="primary">{b.status}</Badge>
                      </div>
                      <p className="text-xs text-ink-secondary font-medium mt-0.5">{b.workerName}</p>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-ink-muted">
                        <span className="flex items-center gap-1"><Calendar size={12} /> {b.date}</span>
                        <span className="flex items-center gap-1"><Clock size={12} /> {b.startTime}</span>
                        <span className="flex items-center gap-1"><MapPin size={12} /> {b.location.city}</span>
                        <span className="font-bold text-ink ml-auto">{formatCurrency(b.price)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border flex justify-end">
                    <Link href={`/messages?to=${b.workerUserId || b.workerId}&name=${encodeURIComponent(b.workerName)}&avatar=${encodeURIComponent(b.workerAvatar || "")}`}>
                      <Button variant="outline" size="sm">
                        <MessageSquare size={13} /> Chat with Worker
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 3: Recent Activity / Notifications */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-ink">Recent Activity & Notifications</h2>
            <Link href="/notifications" className="text-sm text-ink-secondary hover:underline">View all</Link>
          </div>
          {loading ? (
            <Card className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </Card>
          ) : notificationsList.length === 0 ? (
            <Card><p className="text-sm text-ink-secondary text-center py-6">No recent activity</p></Card>
          ) : (
            <div className="space-y-3">
              {notificationsList.slice(0, 5).map((n) => (
                <Link key={n.id} href={n.link || "/dashboard"} className="block">
                  <Card hover className="!p-3.5 border-border">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Bell size={14} className="text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-ink">{n.title}</p>
                        <p className="text-xs text-ink-secondary truncate">{n.body}</p>
                        <p className="text-[10px] text-ink-muted mt-1">{new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
