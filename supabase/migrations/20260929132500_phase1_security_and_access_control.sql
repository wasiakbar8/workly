-- Migration: 20260929132500_phase1_security_and_access_control.sql
-- Description: Phase 1 hardening - RLS enforcement, privilege escalation protection, search_path fixes, and RPC access revocation.

-- 1. Restrict public.spatial_ref_sys to read-only for anon and authenticated
REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated;
GRANT SELECT ON TABLE public.spatial_ref_sys TO anon, authenticated;

-- 2. Hardened is_admin() function with search_path = ''
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
$$;

-- 3. Prevent Privilege Escalation on profiles table
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Prevent altering profile id
  IF NEW.id <> OLD.id THEN
    RAISE EXCEPTION 'User ID cannot be modified.';
  END IF;

  -- Only admins can change role; for non-admins, retain original role
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin() THEN
      NEW.role := OLD.role;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_fields();

-- 4. Prevent Worker Profile Metric Tampering
CREATE OR REPLACE FUNCTION public.protect_worker_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.id <> OLD.id OR NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'Worker identifier cannot be modified.';
  END IF;

  -- Only admins can change verification_status
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NOT public.is_admin() THEN
      NEW.verification_status := OLD.verification_status;
    END IF;
  END IF;

  -- Non-admins cannot forge metrics
  IF NOT public.is_admin() THEN
    NEW.average_rating := OLD.average_rating;
    NEW.total_reviews := OLD.total_reviews;
    NEW.completed_jobs := OLD.completed_jobs;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_worker_profile_fields ON public.worker_profiles;
CREATE TRIGGER trg_protect_worker_profile_fields
BEFORE UPDATE ON public.worker_profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_worker_profile_fields();

-- 5. Booking Status Authorization Validation
CREATE OR REPLACE FUNCTION public.validate_booking_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_is_party boolean;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Check if caller is customer, worker, or administrator
    SELECT EXISTS (
      SELECT 1 FROM public.bookings b
      LEFT JOIN public.worker_profiles wp ON wp.id = b.worker_id
      WHERE b.id = NEW.id
      AND (b.customer_id = v_uid OR wp.user_id = v_uid)
    ) INTO v_is_party;

    IF NOT v_is_party AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Unauthorized: only booking participants or administrators can update booking status.';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_booking_status ON public.bookings;
CREATE TRIGGER trg_validate_booking_status
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.validate_booking_status_update();

-- 6. Hardened RPCs with Search Path & Input Validation

-- send_chat_message
CREATE OR REPLACE FUNCTION public.send_chat_message(
  p_conversation_id uuid,
  p_content text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_user_name text;
  v_msg_id uuid;
  v_created_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated. Please log in to send a message.';
  END IF;

  IF p_content IS NULL OR trim(p_content) = '' THEN
    RAISE EXCEPTION 'Message content cannot be empty.';
  END IF;

  IF length(p_content) > 4000 THEN
    RAISE EXCEPTION 'Message exceeds 4000 character limit.';
  END IF;

  -- Ensure caller is already a legitimate participant, or admin
  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants cp 
    WHERE cp.conversation_id = p_conversation_id AND cp.user_id = v_user_id
  ) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: You are not a participant in this conversation.';
  END IF;

  SELECT p.full_name INTO v_user_name FROM public.profiles p WHERE p.id = v_user_id;

  INSERT INTO public.messages (conversation_id, sender_id, content, type, created_at)
  VALUES (p_conversation_id, v_user_id, trim(p_content), 'text', now())
  RETURNING id, created_at INTO v_msg_id, v_created_at;

  UPDATE public.conversations SET updated_at = now() WHERE id = p_conversation_id;

  RETURN jsonb_build_object(
    'id', v_msg_id,
    'conversation_id', p_conversation_id,
    'sender_id', v_user_id,
    'sender_name', COALESCE(v_user_name, 'User'),
    'content', trim(p_content),
    'created_at', v_created_at,
    'read', false,
    'type', 'text'
  );
END;
$$;

-- get_or_create_conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_target_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid := (SELECT auth.uid());
  v_target_user_id uuid;
  v_conv_id uuid;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated. Please log in first.';
  END IF;

  IF p_target_id IS NULL THEN
    RAISE EXCEPTION 'Invalid recipient identifier.';
  END IF;

  SELECT user_id INTO v_target_user_id
  FROM public.worker_profiles
  WHERE id = p_target_id;

  IF v_target_user_id IS NULL THEN
    v_target_user_id := p_target_id;
  END IF;

  IF v_caller_id = v_target_user_id THEN
    RAISE EXCEPTION 'Cannot start a conversation with yourself.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_target_user_id) THEN
    RAISE EXCEPTION 'Recipient user profile does not exist.';
  END IF;

  SELECT cp1.conversation_id INTO v_conv_id
  FROM public.conversation_participants cp1
  JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
  WHERE cp1.user_id = v_caller_id
    AND cp2.user_id = v_target_user_id
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  INSERT INTO public.conversations (created_at, updated_at)
  VALUES (now(), now())
  RETURNING id INTO v_conv_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id, created_at, last_read_at)
  VALUES
    (v_conv_id, v_caller_id, now(), now()),
    (v_conv_id, v_target_user_id, now(), now());

  RETURN v_conv_id;
END;
$$;

-- get_my_conversations
CREATE OR REPLACE FUNCTION public.get_my_conversations()
RETURNS TABLE(
  id uuid,
  participant_id uuid,
  participant_name text,
  participant_avatar text,
  last_message text,
  last_message_time timestamptz,
  unread_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH my_convs AS (
    SELECT 
      cp_me.conversation_id,
      COALESCE(cp_other.user_id, cp_me.user_id) AS other_user_id,
      COALESCE(p.full_name, 'Workly User') AS other_name,
      p.avatar_url AS other_avatar
    FROM public.conversation_participants cp_me
    LEFT JOIN public.conversation_participants cp_other 
      ON cp_other.conversation_id = cp_me.conversation_id 
      AND cp_other.user_id != cp_me.user_id
    LEFT JOIN public.profiles p ON p.id = cp_other.user_id
    WHERE cp_me.user_id = v_user_id
  ),
  distinct_convs AS (
    SELECT DISTINCT ON (mc.conversation_id)
      mc.conversation_id,
      mc.other_user_id,
      mc.other_name,
      mc.other_avatar
    FROM my_convs mc
    ORDER BY mc.conversation_id, (mc.other_user_id != v_user_id) DESC
  ),
  latest_msgs AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content,
      m.created_at
    FROM public.messages m
    JOIN distinct_convs dc ON dc.conversation_id = m.conversation_id
    ORDER BY m.conversation_id, m.created_at DESC
  ),
  unreads AS (
    SELECT 
      m.conversation_id,
      COUNT(*)::INT AS cnt
    FROM public.messages m
    JOIN distinct_convs dc ON dc.conversation_id = m.conversation_id
    WHERE m.sender_id != v_user_id
      AND m.read_at IS NULL
    GROUP BY m.conversation_id
  )
  SELECT 
    dc.conversation_id AS id,
    dc.other_user_id AS participant_id,
    dc.other_name AS participant_name,
    dc.other_avatar AS participant_avatar,
    COALESCE(lm.content, 'No messages yet') AS last_message,
    lm.created_at AS last_message_time,
    COALESCE(u.cnt, 0) AS unread_count
  FROM distinct_convs dc
  LEFT JOIN latest_msgs lm ON lm.conversation_id = dc.conversation_id
  LEFT JOIN unreads u ON u.conversation_id = dc.conversation_id
  ORDER BY COALESCE(lm.created_at, '2000-01-01'::timestamptz) DESC;
END;
$$;

-- get_conversation_messages
CREATE OR REPLACE FUNCTION public.get_conversation_messages(p_conv_id uuid)
RETURNS TABLE(
  id uuid,
  conversation_id uuid,
  sender_id uuid,
  sender_name text,
  content text,
  created_at timestamptz,
  read boolean,
  type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conv_id AND cp.user_id = v_user_id
  ) AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: You are not a participant in this conversation.';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.conversation_id,
    m.sender_id,
    COALESCE(p.full_name, 'User') AS sender_name,
    m.content,
    m.created_at,
    (m.read_at IS NOT NULL) AS read,
    COALESCE(m.type, 'text') AS type
  FROM public.messages m
  LEFT JOIN public.profiles p ON p.id = m.sender_id
  WHERE m.conversation_id = p_conv_id
  ORDER BY m.created_at ASC;
END;
$$;

-- mark_messages_read
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conv_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conv_id AND cp.user_id = v_user_id
  ) AND NOT public.is_admin() THEN
    RETURN;
  END IF;

  UPDATE public.messages
  SET read_at = now()
  WHERE conversation_id = p_conv_id
    AND sender_id != v_user_id
    AND read_at IS NULL;

  UPDATE public.conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conv_id
    AND user_id = v_user_id;
END;
$$;

-- get_unread_messages_count
CREATE OR REPLACE FUNCTION public.get_unread_messages_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := (SELECT auth.uid());
  v_count int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.messages m
  JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
  WHERE cp.user_id = v_user_id
    AND m.sender_id != v_user_id
    AND m.read_at IS NULL;

  RETURN COALESCE(v_count, 0);
END;
$$;

-- accept_job_application
CREATE OR REPLACE FUNCTION public.accept_job_application(p_application_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller_id uuid := (SELECT auth.uid());
  v_app record;
  v_post record;
  v_worker_user_id uuid;
  v_worker_name text;
  v_booking_id uuid;
  v_conv_id uuid;
  v_start_datetime timestamptz;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated.';
  END IF;

  SELECT * INTO v_app FROM public.job_applications WHERE id = p_application_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  SELECT * INTO v_post FROM public.job_posts WHERE id = v_app.job_post_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job post not found';
  END IF;

  IF v_post.customer_id != v_caller_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the task owner can accept proposals';
  END IF;

  IF v_post.status != 'open' THEN
    RAISE EXCEPTION 'This job post is no longer open for assignment';
  END IF;

  SELECT wp.user_id, p.full_name
  INTO v_worker_user_id, v_worker_name
  FROM public.worker_profiles wp
  JOIN public.profiles p ON p.id = wp.user_id
  WHERE wp.id = v_app.worker_id;

  UPDATE public.job_applications SET status = 'accepted' WHERE id = p_application_id;
  UPDATE public.job_applications SET status = 'rejected' WHERE job_post_id = v_app.job_post_id AND id != p_application_id;
  UPDATE public.job_posts SET status = 'assigned', updated_at = now() WHERE id = v_app.job_post_id;

  IF v_post.scheduled_date IS NOT NULL THEN
    v_start_datetime := (v_post.scheduled_date::text || ' 10:00:00')::timestamptz;
  ELSE
    v_start_datetime := now() + interval '1 day';
  END IF;

  INSERT INTO public.bookings (
    job_post_id,
    customer_id,
    worker_id,
    task,
    start_datetime,
    end_datetime,
    duration_hours,
    agreed_price,
    currency,
    status
  ) VALUES (
    v_post.id,
    v_post.customer_id,
    v_app.worker_id,
    v_post.title,
    v_start_datetime,
    v_start_datetime + interval '2 hours',
    2,
    COALESCE(v_app.bid_amount, v_post.budget),
    v_post.currency,
    'upcoming'
  )
  RETURNING id INTO v_booking_id;

  IF v_worker_user_id IS NOT NULL THEN
    SELECT cp1.conversation_id INTO v_conv_id
    FROM public.conversation_participants cp1
    JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    WHERE cp1.user_id = v_post.customer_id AND cp2.user_id = v_worker_user_id
    LIMIT 1;

    IF v_conv_id IS NULL THEN
      INSERT INTO public.conversations (id, created_at, updated_at)
      VALUES (gen_random_uuid(), now(), now())
      RETURNING id INTO v_conv_id;

      INSERT INTO public.conversation_participants (conversation_id, user_id)
      VALUES (v_conv_id, v_post.customer_id), (v_conv_id, v_worker_user_id);
    END IF;

    INSERT INTO public.messages (conversation_id, sender_id, content, type)
    VALUES (
      v_conv_id,
      v_post.customer_id,
      'Congratulations! I have accepted your proposal for: "' || v_post.title || '". Let us discuss the schedule and task details here.',
      'text'
    );

    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      body,
      related_id,
      link
    ) VALUES (
      v_worker_user_id,
      'proposal_accepted',
      'Proposal Accepted!',
      'Your proposal for "' || v_post.title || '" was accepted. A new upcoming job has been scheduled in your dashboard.',
      v_booking_id::text,
      '/bookings'
    );
  END IF;

  RETURN v_booking_id;
END;
$$;

-- 7. Fix search path on other trigger functions
ALTER FUNCTION public.search_workers(text, text, text, numeric, numeric, boolean, boolean, double precision, double precision, double precision, text) SET search_path = '';
ALTER FUNCTION public.update_category_worker_count() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.handle_new_job_request() SET search_path = '';
ALTER FUNCTION public.handle_review_stats() SET search_path = '';
ALTER FUNCTION public.handle_booking_completion() SET search_path = '';
ALTER FUNCTION public.handle_job_request_acceptance() SET search_path = '';
ALTER FUNCTION public.handle_new_job_application() SET search_path = '';
ALTER FUNCTION public.auto_confirm_new_users() SET search_path = '';

-- 8. Revoke EXECUTE from anon role on authenticated-only RPCs
REVOKE EXECUTE ON FUNCTION public.accept_job_application(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_conversation_messages(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_my_conversations() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_or_create_conversation(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_unread_messages_count() FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_messages_read(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.send_chat_message(uuid, text) FROM anon;
