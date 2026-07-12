import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Loader2, ReceiptText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * The merchant's Siango invoices/receipts. Source of truth = billing_charges
 * (every successful platform charge - publish subscription, add-ons), which now
 * carries the tax-invoice/receipt URL issued by the gateway (Cardcom Document).
 * RLS restricts the rows to the logged-in merchant's own charges. Rows from
 * before invoice URLs were captured still show (amount + date) without a download.
 */

type Charge = {
  id: string;
  amount_ils: number | null;
  payment_description: string | null;
  created_at: string;
  invoice_url: string | null;
};

const fmtDate = (s: string) => {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const DashboardInvoices = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["billing-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("billing_charges")
        .select("id, amount_ils, payment_description, created_at, invoice_url")
        .eq("status", "success")
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data || []) as Charge[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const charges = data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ReceiptText className="w-5 h-5 text-primary" /> חשבוניות וקבלות
        </CardTitle>
        <CardDescription>החשבוניות והקבלות שלך - לצפייה והורדה בכל עת.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            החשבוניות יופיעו כאן לאחר החיוב הראשון. אם יש בעיה, פנו לתמיכה.
          </p>
        ) : !charges.length ? (
          <div className="py-10 text-center text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">אין עדיין חשבוניות. הן יופיעו כאן אוטומטית לאחר החיוב הראשון.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {charges.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {c.payment_description || "חשבונית / קבלה"}
                  </div>
                  <div className="text-xs text-muted-foreground">{fmtDate(c.created_at)}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {c.amount_ils ? (
                    <span className="font-semibold text-foreground whitespace-nowrap">
                      ₪{Number(c.amount_ils).toLocaleString("he-IL")}
                    </span>
                  ) : null}
                  {c.invoice_url ? (
                    <a
                      href={c.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <Download className="w-4 h-4" /> הורדה
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground" title="החשבונית נשלחה ישירות מחברת הסליקה לכתובת המייל שלך">
                      נשלחה למייל שלך
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardInvoices;
