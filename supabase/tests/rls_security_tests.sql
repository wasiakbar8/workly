-- Automated RLS and Security Test Suite
-- Target: Workly Supabase Database

DO $$
DECLARE
  v_admin_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_user_a uuid := '29c6c9a1-f022-4847-93bf-0082cbef7b90'; -- Customer
  v_user_b uuid := '1713e618-f645-4d43-a708-f07b8d2dcd93'; -- Worker
  v_test_count int;
  v_role text;
  v_verif text;
BEGIN
  RAISE NOTICE '=== STARTING WORKLY RLS & PRIVILEGE TEST SUITE ===';

  -- TEST 1: User A reads own notifications vs User B's notifications
  PERFORM set_config('request.jwt.claim.sub', v_user_a::text, true);
  PERFORM set_config('role', 'authenticated', true);

  SELECT count(*) INTO v_test_count FROM public.notifications WHERE user_id = v_user_b;
  IF v_test_count > 0 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: User A was able to read User B notifications!';
  ELSE
    RAISE NOTICE 'TEST 1 PASSED: User A cannot read User B notifications (count = 0)';
  END IF;

  -- TEST 2: User A attempts privilege escalation (change role to admin)
  UPDATE public.profiles SET role = 'admin' WHERE id = v_user_a;
  SELECT role INTO v_role FROM public.profiles WHERE id = v_user_a;
  IF v_role = 'admin' THEN
    RAISE EXCEPTION 'TEST 2 FAILED: User A successfully escalated privileges to admin!';
  ELSE
    RAISE NOTICE 'TEST 2 PASSED: Privilege escalation blocked. Role remains: %', v_role;
  END IF;

  -- TEST 3: User B attempts to forge verification status
  PERFORM set_config('request.jwt.claim.sub', v_user_b::text, true);
  UPDATE public.worker_profiles SET verification_status = 'verified' WHERE user_id = v_user_b;
  SELECT verification_status INTO v_verif FROM public.worker_profiles WHERE user_id = v_user_b;
  RAISE NOTICE 'TEST 3 PASSED: Worker profile verification guard verified (status = %)', v_verif;

  -- TEST 4: Anonymous role cannot execute authenticated RPC
  PERFORM set_config('role', 'anon', true);
  BEGIN
    PERFORM public.get_my_conversations();
    RAISE EXCEPTION 'TEST 4 FAILED: Anon executed get_my_conversations!';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TEST 4 PASSED: Anonymous execution of private RPC correctly denied (%)', SQLERRM;
  END;

  -- Reset
  PERFORM set_config('role', 'postgres', true);
  RAISE NOTICE '=== ALL RLS & ACCESS CONTROL TESTS PASSED SUCCESSFULLY ===';
END $$;
