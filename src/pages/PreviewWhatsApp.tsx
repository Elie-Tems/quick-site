import { useState } from "react";
import DashboardWhatsApp from "@/components/dashboard/DashboardWhatsApp";

/**
 * Private preview of the WhatsApp merchant area (for Moti's review only - not in
 * any nav). Toggles between the pre-connection guidance screen and the connected
 * state (mailing list / campaigns / settings) with sample data, so the feature
 * can be reviewed WITHOUT going live (no DB, no provider, nothing deployed).
 */
const PreviewWhatsApp = () => {
  const [connected, setConnected] = useState(false);

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 px-4 py-2.5">
        <div className="container max-w-4xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            👁️ תצוגה מקדימה פרטית · וואטסאפ · נתוני דמו · לא חי
          </span>
          <div className="flex gap-1 bg-background/60 rounded-lg p-1">
            <button onClick={() => setConnected(false)}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${!connected ? "bg-background shadow-sm font-medium text-foreground" : "text-muted-foreground"}`}>
              מסך הסבר (לפני חיבור)
            </button>
            <button onClick={() => setConnected(true)}
              className={`px-3 py-1 rounded-md text-xs transition-colors ${connected ? "bg-background shadow-sm font-medium text-foreground" : "text-muted-foreground"}`}>
              אחרי חיבור
            </button>
          </div>
        </div>
      </div>

      <DashboardWhatsApp forceConnected={connected} />
    </div>
  );
};

export default PreviewWhatsApp;
