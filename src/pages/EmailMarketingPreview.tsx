import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import DashboardEmailMarketing from "@/components/dashboard/DashboardEmailMarketing";

// Standalone preview of the email-marketing module (build-only). Shared with Moti
// via a direct link, NOT added to the live dashboard nav yet (like the WhatsApp
// preview). noindex so it doesn't get crawled.
const EmailMarketingPreview = () => (
  <div className="min-h-screen bg-muted/30" dir="rtl">
    <SEOHead title="תצוגת מערכת דיוור | סיאנגו" noindex={true} />
    <header className="sticky top-0 z-40 bg-background border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 md:px-6">
        <span className="text-sm font-semibold">תצוגה מקדימה - מערכת דיוור (build-only)</span>
        <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="w-4 h-4" /> לדשבורד
        </Link>
      </div>
    </header>
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <DashboardEmailMarketing />
    </div>
  </div>
);

export default EmailMarketingPreview;
