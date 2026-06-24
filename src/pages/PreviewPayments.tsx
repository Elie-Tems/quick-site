import DashboardPayments from "@/components/dashboard/DashboardPayments";
import type { BusinessSettings } from "@/components/dashboard/DashboardSettings";

// Public, no-auth visual preview of the merchant "סליקה" screen - so we can
// review the UI without logging in / having a business. Safe: any credential
// query runs as anon (RLS returns nothing). Temporary - remove when done.
const PreviewPayments = () => {
  const fakeSettings = { id: "preview" } as unknown as BusinessSettings;
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="mx-auto max-w-3xl">
        <DashboardPayments settings={fakeSettings} onSettingsChange={() => {}} />
      </div>
    </div>
  );
};

export default PreviewPayments;
