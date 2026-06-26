import DashboardEmail from "@/components/dashboard/DashboardEmail";

/**
 * Private preview of the business-email area (Moti's review only - not in any
 * nav). Renders with sample owned-domains + mailboxes so the full flow is
 * visible WITHOUT going live (no DB, nothing deployed).
 */
const PreviewEmail = () => (
  <div dir="rtl" className="min-h-screen bg-background">
    <div className="sticky top-0 z-10 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 px-4 py-2.5">
      <div className="container max-w-4xl mx-auto">
        <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">👁️ תצוגה מקדימה פרטית · מייל עסקי · נתוני דמו · לא חי</span>
      </div>
    </div>
    <DashboardEmail forceConnected />
  </div>
);

export default PreviewEmail;
