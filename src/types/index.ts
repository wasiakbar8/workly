export type ServiceMode = "remote" | "onsite" | "both";

export interface LocationInfo {
  country?: string;
  city: string;
  area?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  phone?: string;
  role: "customer" | "worker" | "admin";
  location?: LocationInfo;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  workerCount: number;
  description?: string;
}

export interface WorkerProfile {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl: string;
  professionalTitle: string;
  categoryId: string;
  categoryName: string;
  subcategory?: string;
  description: string;
  skills: string[];
  experienceYears: number;
  hourlyRate: number;
  currency: string;
  rating: number;
  reviewCount: number;
  jobsCompleted: number;
  responseTime: string;
  verified: boolean;
  location: LocationInfo;
  serviceRadiusKm: number;
  remoteAvailable: boolean;
  onsiteAvailable: boolean;
  availability: string;
  languages: string[];
  portfolio: { id: string; title: string; imageUrl: string; description?: string }[];
  distanceKm?: number;
  createdAt: string;
}

export interface JobRequest {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  workerId: string;
  workerUserId?: string;
  workerName: string;
  workerAvatar?: string;
  taskDescription: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  location: LocationInfo;
  budget: number;
  currency: string;
  notes?: string;
  status: "pending" | "accepted" | "rejected" | "in_progress" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  requestId: string;
  customerId: string;
  customerName: string;
  workerId: string;
  workerUserId?: string;
  workerName: string;
  workerAvatar?: string;
  task: string;
  date: string;
  startTime: string;
  endTime: string;
  location: LocationInfo;
  price: number;
  currency: string;
  status: "upcoming" | "active" | "pending_approval" | "completed" | "cancelled";
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  workerId: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  read: boolean;
  type: "text" | "image" | "system";
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  online: boolean;
}

export interface Notification {
  id: string;
  type: "work_request" | "request_accepted" | "message" | "booking_reminder" | "job_completed" | "review_received";
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

export interface SavedWorker {
  id: string;
  workerId: string;
  savedAt: string;
}
