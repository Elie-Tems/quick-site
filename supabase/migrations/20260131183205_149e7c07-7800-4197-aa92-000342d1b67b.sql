-- Fix the view to use security_invoker
DROP VIEW IF EXISTS public.admin_payment_stats;

CREATE VIEW public.admin_payment_stats 
WITH (security_invoker = on) AS
SELECT 
  COUNT(*) AS total_payments,
  COUNT(*) FILTER (WHERE status = 'success') AS successful_payments,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_payments,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending_payments,
  COUNT(*) FILTER (WHERE status = 'refunded') AS refunded_payments,
  COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0) AS total_revenue,
  COALESCE(SUM(amount) FILTER (WHERE status = 'success' AND created_at >= NOW() - INTERVAL '30 days'), 0) AS revenue_last_30_days,
  COALESCE(SUM(amount) FILTER (WHERE status = 'success' AND created_at >= NOW() - INTERVAL '7 days'), 0) AS revenue_last_7_days,
  COALESCE(SUM(amount) FILTER (WHERE status = 'success' AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())), 0) AS revenue_this_month
FROM public.payments;