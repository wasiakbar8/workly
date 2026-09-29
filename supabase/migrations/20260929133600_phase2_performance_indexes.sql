-- Migration: 20260929133600_phase2_performance_indexes.sql
-- Description: Add covering indexes for all 23 foreign keys, filter indexes, and optimize RLS initplan queries with (SELECT auth.uid()).

-- ============================================================================
-- 1. COVERING INDEXES FOR ALL FOREIGN KEYS (Eliminates Advisor Warnings)
-- ============================================================================

-- Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_worker_id ON public.bookings(worker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_job_post_id ON public.bookings(job_post_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Conversation Participants & Messages
CREATE INDEX IF NOT EXISTS idx_conv_participants_user_id ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);

-- Job Applications
CREATE INDEX IF NOT EXISTS idx_job_applications_worker_id ON public.job_applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job_post_id ON public.job_applications(job_post_id);

-- Job Posts
CREATE INDEX IF NOT EXISTS idx_job_posts_customer_id ON public.job_posts(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_category_id ON public.job_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_service_id ON public.job_posts(service_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_status ON public.job_posts(status);

-- Job Requests
CREATE INDEX IF NOT EXISTS idx_job_requests_customer_id ON public.job_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_worker_id ON public.job_requests(worker_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_service_id ON public.job_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_job_requests_status ON public.job_requests(status);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);

-- Portfolio Items
CREATE INDEX IF NOT EXISTS idx_portfolio_items_worker_id ON public.portfolio_items(worker_id);

-- Reports
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON public.reports(reported_user_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON public.reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_worker_id ON public.reviews(worker_id);
CREATE INDEX IF NOT EXISTS idx_reviews_booking_id ON public.reviews(booking_id);

-- Saved Workers
CREATE INDEX IF NOT EXISTS idx_saved_workers_worker_id ON public.saved_workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_saved_workers_user_id ON public.saved_workers(user_id);

-- Worker Profiles & Relations
CREATE INDEX IF NOT EXISTS idx_worker_profiles_category_id ON public.worker_profiles(category_id);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_city ON public.worker_profiles(city);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_rating ON public.worker_profiles(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_verified ON public.worker_profiles(verification_status);

CREATE INDEX IF NOT EXISTS idx_worker_services_service_id ON public.worker_services(service_id);
CREATE INDEX IF NOT EXISTS idx_worker_services_worker_id ON public.worker_services(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_availability_worker_id ON public.worker_availability(worker_id);

-- ============================================================================
-- 2. REWRITE RLS POLICIES TO USE (SELECT auth.uid()) (Optimizes InitPlan)
-- ============================================================================

-- profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

-- worker_profiles
DROP POLICY IF EXISTS "Workers can create own worker profile" ON public.worker_profiles;
CREATE POLICY "Workers can create own worker profile" ON public.worker_profiles
FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Workers can update own worker profile" ON public.worker_profiles;
CREATE POLICY "Workers can update own worker profile" ON public.worker_profiles
FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- worker_services
DROP POLICY IF EXISTS "Workers can manage their own worker services" ON public.worker_services;
CREATE POLICY "Workers can manage their own worker services" ON public.worker_services
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.worker_profiles wp
  WHERE wp.id = worker_services.worker_id AND wp.user_id = (SELECT auth.uid())
));

-- worker_availability
DROP POLICY IF EXISTS "Workers can manage their availability" ON public.worker_availability;
CREATE POLICY "Workers can manage their availability" ON public.worker_availability
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.worker_profiles wp
  WHERE wp.id = worker_availability.worker_id AND wp.user_id = (SELECT auth.uid())
));

-- portfolio_items
DROP POLICY IF EXISTS "Workers can manage their portfolio" ON public.portfolio_items;
CREATE POLICY "Workers can manage their portfolio" ON public.portfolio_items
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.worker_profiles wp
  WHERE wp.id = portfolio_items.worker_id AND wp.user_id = (SELECT auth.uid())
));

-- job_requests
DROP POLICY IF EXISTS "Users can view relevant job requests" ON public.job_requests;
CREATE POLICY "Users can view relevant job requests" ON public.job_requests
FOR SELECT USING (
  ((SELECT auth.uid()) = customer_id) OR
  (EXISTS (
    SELECT 1 FROM public.worker_profiles wp
    WHERE wp.id = job_requests.worker_id AND wp.user_id = (SELECT auth.uid())
  )) OR
  public.is_admin()
);

DROP POLICY IF EXISTS "Customers can create job requests" ON public.job_requests;
CREATE POLICY "Customers can create job requests" ON public.job_requests
FOR INSERT WITH CHECK ((SELECT auth.uid()) = customer_id);

DROP POLICY IF EXISTS "Workers and customers can update relevant requests" ON public.job_requests;
CREATE POLICY "Workers and customers can update relevant requests" ON public.job_requests
FOR UPDATE USING (
  (EXISTS (
    SELECT 1 FROM public.worker_profiles wp
    WHERE wp.id = job_requests.worker_id AND wp.user_id = (SELECT auth.uid())
  )) OR
  (((SELECT auth.uid()) = customer_id) AND status = 'pending') OR
  public.is_admin()
);

-- bookings
DROP POLICY IF EXISTS "Participants can view their bookings" ON public.bookings;
CREATE POLICY "Participants can view their bookings" ON public.bookings
FOR SELECT USING (
  ((SELECT auth.uid()) = customer_id) OR
  (EXISTS (
    SELECT 1 FROM public.worker_profiles wp
    WHERE wp.id = bookings.worker_id AND wp.user_id = (SELECT auth.uid())
  )) OR
  public.is_admin()
);

DROP POLICY IF EXISTS "Participants can update booking status" ON public.bookings;
CREATE POLICY "Participants can update booking status" ON public.bookings
FOR UPDATE USING (
  ((SELECT auth.uid()) = customer_id) OR
  (EXISTS (
    SELECT 1 FROM public.worker_profiles wp
    WHERE wp.id = bookings.worker_id AND wp.user_id = (SELECT auth.uid())
  )) OR
  public.is_admin()
);

DROP POLICY IF EXISTS "Allow booking insertion" ON public.bookings;
CREATE POLICY "Allow booking insertion" ON public.bookings
FOR INSERT WITH CHECK (
  ((SELECT auth.uid()) = customer_id) OR
  (EXISTS (
    SELECT 1 FROM public.worker_profiles wp
    WHERE wp.id = bookings.worker_id AND wp.user_id = (SELECT auth.uid())
  )) OR
  public.is_admin()
);

-- reviews
DROP POLICY IF EXISTS "Customer can create review for completed booking" ON public.reviews;
CREATE POLICY "Customer can create review for completed booking" ON public.reviews
FOR INSERT WITH CHECK (
  ((SELECT auth.uid()) = customer_id) AND
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = reviews.booking_id AND b.customer_id = (SELECT auth.uid()) AND b.status = 'completed'
  )
);

-- notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own notifications (mark read)" ON public.notifications;
CREATE POLICY "Users can update own notifications (mark read)" ON public.notifications
FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "System/users can insert notifications" ON public.notifications;
CREATE POLICY "System/users can insert notifications" ON public.notifications
FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- saved_workers
DROP POLICY IF EXISTS "Users can manage own saved workers" ON public.saved_workers;
CREATE POLICY "Users can manage own saved workers" ON public.saved_workers
FOR ALL USING ((SELECT auth.uid()) = user_id);

-- reports
DROP POLICY IF EXISTS "Users can submit reports" ON public.reports;
CREATE POLICY "Users can submit reports" ON public.reports
FOR INSERT WITH CHECK ((SELECT auth.uid()) = reporter_id);

-- job_posts
DROP POLICY IF EXISTS "Customers can manage own job posts" ON public.job_posts;
CREATE POLICY "Customers can manage own job posts" ON public.job_posts
FOR ALL USING ((SELECT auth.uid()) = customer_id);

-- job_applications
DROP POLICY IF EXISTS "Workers can view and apply to job posts" ON public.job_applications;
CREATE POLICY "Workers can view and apply to job posts" ON public.job_applications
FOR INSERT WITH CHECK (EXISTS (
  SELECT 1 FROM public.worker_profiles wp
  WHERE wp.id = job_applications.worker_id AND wp.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS "Workers and customers can view applications" ON public.job_applications;
CREATE POLICY "Workers and customers can view applications" ON public.job_applications
FOR SELECT USING (
  (EXISTS (
    SELECT 1 FROM public.worker_profiles wp
    WHERE wp.id = job_applications.worker_id AND wp.user_id = (SELECT auth.uid())
  )) OR
  (EXISTS (
    SELECT 1 FROM public.job_posts jp
    WHERE jp.id = job_applications.job_post_id AND jp.customer_id = (SELECT auth.uid())
  ))
);

DROP POLICY IF EXISTS "Customers can update applications for their posts" ON public.job_applications;
CREATE POLICY "Customers can update applications for their posts" ON public.job_applications
FOR UPDATE USING (EXISTS (
  SELECT 1 FROM public.job_posts jp
  WHERE jp.id = job_applications.job_post_id AND jp.customer_id = (SELECT auth.uid())
));

-- conversations & participants
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" ON public.conversations
FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
CREATE POLICY "Participants can view conversations" ON public.conversations
FOR SELECT USING (
  public.is_conversation_participant(id, (SELECT auth.uid())) OR public.is_admin()
);

DROP POLICY IF EXISTS "Users can join or add participants" ON public.conversation_participants;
CREATE POLICY "Users can join or add participants" ON public.conversation_participants
FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Participants can view conversation members" ON public.conversation_participants;
CREATE POLICY "Participants can view conversation members" ON public.conversation_participants
FOR SELECT USING (
  (user_id = (SELECT auth.uid())) OR
  public.is_conversation_participant(conversation_id, (SELECT auth.uid())) OR
  public.is_admin()
);

-- messages
DROP POLICY IF EXISTS "Participants can view conversation messages" ON public.messages;
CREATE POLICY "Participants can view conversation messages" ON public.messages
FOR SELECT USING (
  public.is_conversation_participant(conversation_id, (SELECT auth.uid())) OR
  public.is_admin()
);

DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can send messages" ON public.messages
FOR INSERT WITH CHECK (
  ((SELECT auth.uid()) = sender_id) AND
  public.is_conversation_participant(conversation_id, (SELECT auth.uid()))
);
