"use client";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Menu, X, MessageSquare, Bell, Briefcase, LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { getUnreadMessagesCount } from "@/services/messageService";
import { supabase } from "@/lib/supabase/client";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const { user, role, signOut, loading } = useAuth();

  useEffect(() => {
    if (!user) {
      setUnreadMsgCount(0);
      return;
    }

    const checkUnread = async () => {
      const count = await getUnreadMessagesCount();
      setUnreadMsgCount(count);
    };

    checkUnread();

    // Check periodically and via realtime
    const interval = setInterval(checkUnread, 4000);

    const channel = supabase
      .channel(`nav-messages:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          checkUnread();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user]);

  const navLinks =
    role === "worker"
      ? [
          { href: "/jobs", label: "Job Board" },
          { href: "/worker-dashboard", label: "My Jobs & Requests" },
          { href: "/become-worker", label: "Edit Profile" },
        ]
      : role === "customer"
      ? [
          { href: "/workers", label: "Find Workers" },
          { href: "/post-task", label: "Post a Task" },
          { href: "/bookings", label: "My Bookings" },
        ]
      : [
          { href: "/workers", label: "Find Workers" },
          { href: "/post-task", label: "Post a Task" },
          { href: "/become-worker", label: "Become a Worker" },
        ];

  const dashboardHref =
    role === "admin" ? "/admin" : role === "worker" ? "/worker-dashboard" : "/dashboard";
  const dashboardLabel =
    role === "admin" ? "Admin" : role === "worker" ? "Worker Portal" : "Dashboard";

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-ink" />
            </div>
            <span className="text-xl font-bold text-ink tracking-tight">Workly</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="px-3 py-2 text-sm font-medium text-ink-secondary hover:text-ink rounded-lg hover:bg-surface-muted transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <Link href="/messages" className="p-2 rounded-lg text-ink-secondary hover:bg-surface-muted hover:text-ink relative" title="Messages">
                  <MessageSquare size={20} />
                  {unreadMsgCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-primary text-ink text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white animate-pulse">
                      {unreadMsgCount > 9 ? "9+" : unreadMsgCount}
                    </span>
                  )}
                </Link>
                <Link href="/notifications" className="p-2 rounded-lg text-ink-secondary hover:bg-surface-muted hover:text-ink relative" title="Notifications">
                  <Bell size={20} />
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full" />
                </Link>
                <Link href={dashboardHref}>
                  <Button variant="ghost" size="sm">
                    {role === "admin" ? <ShieldCheck size={16} /> : <LayoutDashboard size={16} />}
                    {dashboardLabel}
                  </Button>
                </Link>
                <div className="flex items-center gap-2 pl-2 border-l border-border">
                  {user.avatarUrl ? (
                    <Image src={user.avatarUrl} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-ink">
                      {user.fullName.charAt(0)}
                    </div>
                  )}
                  <span className="text-xs font-medium text-ink max-w-[100px] truncate">{user.fullName}</span>
                  <button
                    onClick={() => signOut()}
                    className="p-1.5 rounded-lg text-ink-muted hover:text-error hover:bg-error/10 transition-colors"
                    title="Log out"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </>
            ) : !loading ? (
              <>
                <Link href="/login">
                  <Button variant="outline" size="sm">Log in</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Sign up</Button>
                </Link>
              </>
            ) : null}
          </div>

          <button className="md:hidden p-2 rounded-lg hover:bg-surface-muted" onClick={() => setOpen(!open)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-white px-4 py-4 space-y-1">
          {navLinks.map((l) => (
            <Link key={l.label} href={l.href} onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-ink rounded-lg hover:bg-surface-muted">
              {l.label}
            </Link>
          ))}
          {user ? (
            <>
              <Link href={dashboardHref} onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-ink rounded-lg hover:bg-surface-muted">
                {dashboardLabel}
              </Link>
              <Link href="/messages" onClick={() => setOpen(false)} className="flex items-center justify-between px-3 py-2.5 text-sm font-medium text-ink rounded-lg hover:bg-surface-muted">
                <span>Messages</span>
                {unreadMsgCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-primary text-ink rounded-full">
                    {unreadMsgCount} new
                  </span>
                )}
              </Link>
              <Link href="/notifications" onClick={() => setOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-ink rounded-lg hover:bg-surface-muted">
                Notifications
              </Link>
              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="text-sm font-medium text-ink">{user.fullName}</span>
                <Button variant="outline" size="sm" onClick={() => { setOpen(false); signOut(); }}>
                  Log out
                </Button>
              </div>
            </>
          ) : (
            <div className="pt-3 flex gap-2">
              <Link href="/login" className="flex-1"><Button variant="outline" className="w-full" size="sm">Log in</Button></Link>
              <Link href="/signup" className="flex-1"><Button className="w-full" size="sm">Sign up</Button></Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
