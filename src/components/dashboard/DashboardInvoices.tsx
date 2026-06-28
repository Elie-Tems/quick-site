import { useQuery } from "@tanstack/react-query";
import { FileText, Download, Loader2, ReceiptText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * The merchant's invoices/receipts, pulled live from iCount via the
 * icount-invoices edge function (server-side, token-protected). Shows nothing
 * sensitive until there are real documents.
 */

type Invoice = {
  doctype: string;
  doctype_name: string;
  docnum: string;
  date: string;
  total: number;
  url: string;
};

const fmtDate = (s: string) => {
  if (!s) return "";
  const d = new Date(s.replace(/-/g, "/"));
  return isNaN(d.getTime()) ? s : d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const DashboardInvoices = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["icount-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("icount-invoices", { body: {} });
      if (error) throw error;
      return data as { ok: boolean; configured: boolean; clientFound: boolean; docs: Invoice[] };
    },
    staleTime: 5 * 60 * 1000,
  });

  const docs = data?.docs || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ReceiptText className="w-5 h-5 text-primary" /> חשבוניות וקבלות
        </CardTitle>
        <CardDescription>החשבוניות שלך מ-iCount - לצפייה והורדה בכל עת.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : isError || data?.configured === false ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            החשבוניות יופיעו כאן לאחר החיוב הראשון. אם יש בעיה, פנו לתמיכה.
          </p>
        ) : !docs.length ? (
          <div className="py-10 text-center text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">אין עדיין חשבוניות. הן יופיעו כאן אוטומטית לאחר החיוב הראשון.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {docs.map((inv, i) => (
              <div key={`${inv.docnum}-${i}`} className="flex items-center justify-between py-3 gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {inv.doctype_name || "חשבונית"} {inv.docnum ? `#${inv.docnum}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground">{fmtDate(inv.date)}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {inv.total ? (
                    <span className="font-semibold text-foreground whitespace-nowrap">
                      ₪{inv.total.toLocaleString("he-IL")}
                    </span>
                  ) : null}
                  {inv.url ? (
                    <a
                      href={inv.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <Download className="w-4 h-4" /> הורדה
                    </a>
                  ) : null}
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
