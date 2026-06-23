import {
  PLATFORM_EMAILS, orderConfirmationCustomer, type PlatformCtx, type BuiltEmail,
} from "@/lib/email/platformEmails";
import type { EmailSender } from "@/lib/email/rtlEmail";

// Public, no-auth preview that renders every platform/transactional email so we
// can review & approve them. Temporary — remove when done.
const ctx: PlatformCtx = {
  firstName: "ישראל",
  businessName: "הבוטיק של דנה",
  siteUrl: "https://dana.siango.app",
  dashboardUrl: "https://siango.app/dashboard",
  continueUrl: "https://siango.app/onboarding",
  amountIls: 69,
  invoiceUrl: "https://siango.app/invoice/123",
  freezeDate: "01/08/2026",
  deleteDate: "15/08/2026",
  daysLeft: 14,
};

const merchant: EmailSender = {
  businessName: "הבוטיק של דנה",
  email: "dana@example.com",
  address: 'דנה כהן, רחוב הרצל 1, תל אביב',
  brandColor: "#3B976C",
  unsubscribeUrl: "https://dana.siango.app/unsubscribe",
};

const LABELS: Record<string, string> = {
  accountWelcome: "1 · ברוך הבא לסיאנגו",
  onboardingAbandoned1: "2 · התחיל בנייה ולא סיים (24ש')",
  onboardingAbandoned2: "3 · תזכורת שנייה (72ש')",
  siteReady: "4 · האתר באוויר",
  paymentReceipt: "5 · קבלה — חיוב הצליח",
  paymentFailed: "6 · חיוב נכשל (יום 0)",
  paymentReminder: "7 · תזכורת חיוב (יום 3/7)",
  siteFrozen: "8 · האתר הוקפא (יום 10)",
  deletionWarning: "9 · אזהרה לפני מחיקה",
  siteDeleted: "10 · מחיקה סופית",
  siteReactivated: "11 · האתר חזר לפעילות",
  subscriptionCancelled: "12 · אישור ביטול מנוי",
  newOrderMerchant: "13 · לסוחר: הזמנה חדשה",
};

const PreviewEmails = () => {
  const items: { label: string; email: BuiltEmail }[] = Object.entries(PLATFORM_EMAILS).map(
    ([key, fn]) => ({ label: LABELS[key] || key, email: (fn as (c: PlatformCtx) => BuiltEmail)(ctx) }),
  );
  items.push({
    label: "14 · ללקוח: אישור הזמנה (טרנזקציוני)",
    email: orderConfirmationCustomer(merchant, {
      firstName: "נועה", storeName: "הבוטיק של דנה", orderTotal: 240, storeUrl: "https://dana.siango.app",
    }),
  });

  return (
    <div style={{ minHeight: "100vh", background: "#0A0B0D", padding: "24px 12px" }} dir="rtl">
      <div style={{ maxWidth: 680, margin: "0 auto" }}>
        <h1 style={{ color: "#F3F5F4", fontFamily: "Arial, sans-serif", fontSize: 22, marginBottom: 4 }}>
          תצוגת מיילים — לאישור
        </h1>
        <p style={{ color: "#9aa0a6", fontFamily: "Arial, sans-serif", fontSize: 14, marginBottom: 24 }}>
          {items.length} מיילים. נתונים לדוגמה.
        </p>
        {items.map((it, i) => (
          <div key={i} style={{ marginBottom: 28 }}>
            <div style={{ color: "#4FBA88", fontFamily: "Arial, sans-serif", fontSize: 13, marginBottom: 4 }}>
              {it.label}
            </div>
            <div style={{ color: "#F3F5F4", fontFamily: "Arial, sans-serif", fontSize: 15, fontWeight: "bold", marginBottom: 8 }}>
              נושא: {it.email.subject}
            </div>
            <iframe
              title={it.label}
              srcDoc={it.email.html}
              style={{ width: "100%", height: 520, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, background: "#fff" }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PreviewEmails;
