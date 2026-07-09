-- Store the tax-invoice/receipt document URL on each Siango billing charge so the
-- merchant dashboard can list + download their invoices directly (Cardcom returns a
-- DocumentUrl on the charge; the old DashboardInvoices only read iCount, so Cardcom
-- invoices never appeared). Nullable - older rows + failed charges have none.
ALTER TABLE public.billing_charges ADD COLUMN IF NOT EXISTS invoice_url text;
