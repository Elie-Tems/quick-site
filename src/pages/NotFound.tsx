import { Link } from "react-router-dom";
import { Helmet } from 'react-helmet-async';
import { Button } from "@/components/ui/button";
import { Home, ShoppingBag, Phone, ArrowRight } from "lucide-react";

const NotFound = () => {
  return (
    <>
      <Helmet>
        <title>הדף לא נמצא | סיאנגו</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <main id="main-content" className="text-center max-w-md" role="main">
          {/* Visual indicator */}
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
              <span className="text-5xl font-bold text-muted-foreground">404</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              הדף שחיפשת לא נמצא
            </h1>
            <p className="text-muted-foreground">
              ייתכן שהקישור שגוי או שהדף הוסר. 
              בואו נחזיר אתכם למסלול הנכון.
            </p>
          </div>

          {/* Action buttons */}
          <nav aria-label="ניווט מהיר" className="space-y-3">
            <Button asChild size="lg" className="w-full gap-2">
              <Link to="/">
                <Home className="w-4 h-4" />
                חזרה לדף הבית
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg" className="w-full gap-2">
              <Link to="/store">
                <ShoppingBag className="w-4 h-4" />
                לחנות
              </Link>
            </Button>

            <Button asChild variant="ghost" size="lg" className="w-full gap-2">
              <a href="tel:03-1234567">
                <Phone className="w-4 h-4" />
                יצירת קשר
              </a>
            </Button>
          </nav>

          {/* Back link */}
          <div className="mt-8">
            <button 
              onClick={() => window.history.back()}
              className="text-sm text-primary hover:underline inline-flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-ring rounded"
            >
              <ArrowRight className="w-3 h-3" />
              חזרה לעמוד הקודם
            </button>
          </div>
        </main>
      </div>
    </>
  );
};

export default NotFound;
