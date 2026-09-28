"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/services/notificationsService";
import { cn } from "@/lib/utils";
import { Notification } from "@/types";

export default function NotificationsPage() {
  const [list, setList] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    getNotifications().then((data) => {
      if (active) {
        setList(data);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const handleRead = async (id: string) => {
    await markNotificationAsRead(id);
    setList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleReadAll = async () => {
    await markAllNotificationsAsRead();
    setList((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-ink">Notifications</h1>
        {list.some((n) => !n.read) && (
          <Button variant="outline" size="sm" onClick={handleReadAll} className="text-xs">
            <CheckCheck size={14} /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="!p-4 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </Card>
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications" description="You're all caught up." />
      ) : (
        <div className="space-y-2">
          {list.map((n) => (
            <Link key={n.id} href={n.link || "#"} onClick={() => handleRead(n.id)}>
              <Card className={cn("!p-4 hover:shadow-card transition-shadow", !n.read && "border-primary/40 bg-primary/5")}>
                <div className="flex items-start gap-3">
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">{n.title}</p>
                    <p className="text-xs text-ink-secondary mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-ink-muted mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
