-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'success', 'failed', 'refunded', 'cancelled');

-- Create payments table to track all transactions
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ILS',
  status payment_status NOT NULL DEFAULT 'pending',
  payment_provider TEXT, -- icredit, cardcom, tranzila, etc.
  provider_transaction_id TEXT, -- Transaction ID from the payment provider
  error_message TEXT, -- Error message if payment failed
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional data from provider
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can view all payments
CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Business owners can view their payments
CREATE POLICY "Owners can view own payments"
ON public.payments
FOR SELECT
USING (is_business_owner(business_id));

-- Allow inserting payments (from edge functions or system)
CREATE POLICY "System can insert payments"
ON public.payments
FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM businesses WHERE id = business_id));

-- Business owners can update their payments
CREATE POLICY "Owners can update own payments"
ON public.payments
FOR UPDATE
USING (is_business_owner(business_id));

-- Create indexes for performance
CREATE INDEX idx_payments_business_id ON public.payments(business_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_created_at ON public.payments(created_at);
CREATE INDEX idx_payments_order_id ON public.payments(order_id);

-- Create trigger for updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a view for admin payment stats
CREATE OR REPLACE VIEW public.admin_payment_stats AS
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