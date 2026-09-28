"use client";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { MapPin, Calendar, Clock, CheckCircle, XCircle, MessageSquare } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { getJobRequestById, updateJobRequestStatus } from "@/services/bookingService";
import { formatCurrency } from "@/lib/utils";
import { JobRequest } from "@/types";
import { useAuth } from "@/context/AuthContext";

export default function RequestDetailPage() {
  const params = useParams();
  const requestId = String(params.id);
  const { user } = useAuth();
  const [request, setRequest] = useState<JobRequest | null>(null);
  const [status, setStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);

    getJobRequestById(requestId).then((r) => {
      if (active) {
        setRequest(r);
        setStatus(r?.status || "pending");
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [requestId]);

  const handleStatusChange = async (newStatus: string) => {
    setUpdating(true);
    try {
      await updateJobRequestStatus(requestId, newStatus);
      setStatus(newStatus);
    } catch (err) {
      console.error("Failed to update request status:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </Card>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-ink">Request not found</h1>
        <Link href="/worker-dashboard" className="text-sm text-ink-secondary underline mt-2 inline-block">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-ink">Work Request</h1>
        <Badge variant={status === "pending" ? "warning" : status === "accepted" || status === "completed" ? "success" : "default"}>
          {status}
        </Badge>
      </div>
      <Card className="space-y-5">
        <div className="flex gap-4">
          {request.customerAvatar ? (
            <Image src={request.customerAvatar} alt="" width={48} height={48} className="rounded-full w-12 h-12 object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-bold text-ink">
              {request.customerName.charAt(0)}
            </div>
          )}
          <div>
            <p className="text-sm text-ink-muted">Customer</p>
            <p className="font-semibold text-ink">{request.customerName}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-sm text-ink-muted">Worker</p>
            <p className="font-semibold text-ink">{request.workerName}</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-ink-muted mb-1">Task</p>
          <p className="text-ink">{request.taskDescription}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><p className="text-ink-muted text-xs flex items-center gap-1"><Calendar size={12} /> Date</p><p className="font-medium">{request.date}</p></div>
          <div><p className="text-ink-muted text-xs flex items-center gap-1"><Clock size={12} /> Time</p><p className="font-medium">{request.startTime} – {request.endTime}</p></div>
          <div><p className="text-ink-muted text-xs">Duration</p><p className="font-medium">{request.durationHours}h</p></div>
          <div><p className="text-ink-muted text-xs">Budget</p><p className="font-medium">{formatCurrency(request.budget)}</p></div>
        </div>
        <div>
          <p className="text-sm text-ink-muted mb-1 flex items-center gap-1"><MapPin size={12} /> Location</p>
          <p className="text-ink">{request.location.address || request.location.area || "Job Location"}, {request.location.city}</p>
        </div>
        {request.notes && (
          <div>
            <p className="text-sm text-ink-muted mb-1">Notes</p>
            <p className="text-sm text-ink-secondary">{request.notes}</p>
          </div>
        )}
        {status === "pending" && (
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button className="flex-1" loading={updating} onClick={() => handleStatusChange("accepted")}>
              <CheckCircle size={16} /> Accept
            </Button>
            <Button variant="danger" className="flex-1" loading={updating} onClick={() => handleStatusChange("rejected")}>
              <XCircle size={16} /> Reject
            </Button>
          </div>
        )}
        {status === "accepted" && (
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex gap-3">
              <Button className="flex-1" loading={updating} onClick={() => handleStatusChange("in_progress")}>
                Start Job
              </Button>
              <Button variant="outline" className="flex-1" loading={updating} onClick={() => handleStatusChange("cancelled")}>
                Cancel
              </Button>
            </div>
            <Link
              href={`/messages?to=${user?.id === request.customerId ? (request.workerUserId || request.workerId) : request.customerId}&name=${encodeURIComponent(user?.id === request.customerId ? request.workerName : request.customerName)}`}
              className="block"
            >
              <Button variant="outline" className="w-full">
                <MessageSquare size={16} /> Open Chat with {user?.id === request.customerId ? request.workerName : request.customerName}
              </Button>
            </Link>
          </div>
        )}
        {status === "in_progress" && (
          <div className="space-y-3 pt-4 border-t border-border">
            <Button className="w-full" loading={updating} onClick={() => handleStatusChange("completed")}>
              Mark Complete
            </Button>
            <Link
              href={`/messages?to=${user?.id === request.customerId ? (request.workerUserId || request.workerId) : request.customerId}&name=${encodeURIComponent(user?.id === request.customerId ? request.workerName : request.customerName)}`}
              className="block"
            >
              <Button variant="outline" className="w-full">
                <MessageSquare size={16} /> Open Chat with {user?.id === request.customerId ? request.workerName : request.customerName}
              </Button>
            </Link>
          </div>
        )}
        {status === "completed" && (
          <div className="text-center pt-4 border-t border-border">
            <CheckCircle className="w-10 h-10 text-success mx-auto mb-2" />
            <p className="font-semibold text-ink">Job completed</p>
            <p className="text-xs text-ink-secondary mt-1">This job has been marked complete in the database.</p>
            <div className="flex gap-2 justify-center mt-4">
              <Link href={`/messages?to=${user?.id === request.customerId ? (request.workerUserId || request.workerId) : request.customerId}&name=${encodeURIComponent(user?.id === request.customerId ? request.workerName : request.customerName)}`}>
                <Button variant="outline" size="sm"><MessageSquare size={14} /> Messages</Button>
              </Link>
              <Link href="/bookings"><Button size="sm">View Bookings</Button></Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
