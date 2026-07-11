import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useAdmin";

/**
 * Gates internal-only pages (investor deck, platform mockups with sample data)
 * behind admin auth so they are reachable for Moti/Daniel to review but NOT by
 * the public or crawlers. Non-admins are bounced to the homepage.
 *
 * These pages carry illustrative/sample data and internal strategy - they must
 * never render for a random visitor (project "no fake data" + no-leak rules).
 */
export default function AdminOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  if (authLoading || (user && adminLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
