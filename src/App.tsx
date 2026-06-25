import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AccessibilityWidget from "@/components/accessibility/AccessibilityWidget";
import CookieConsent from "@/components/CookieConsent";
import FloatingHelpButton from "@/components/FloatingHelpButton";
// Kept eager: first-paint-critical pages (landing, storefront, auth entry).
import Index from "./pages/Index";
import Register from "./pages/Register";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import StoreFront from "./pages/StoreFront";
import NotFound from "./pages/NotFound";
import { useResolvedTenant } from "@/hooks/useResolvedTenant";
import ShabbatGate from "@/components/ShabbatGate";
import ErrorBoundary from "@/components/ErrorBoundary";
import { captureUtm } from "@/lib/utmCapture";
// Lazy-loaded: heavy or non-first-paint pages get their own chunk, loaded on
// demand. This keeps the initial bundle small so navigation feels snappy.
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const StoreAboutPage = lazy(() => import("./pages/StoreAboutPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Accessibility = lazy(() => import("./pages/Accessibility"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const AllTemplates = lazy(() => import("./pages/AllTemplates"));
const Contact = lazy(() => import("./pages/Contact"));
const PublishPayment = lazy(() => import("./pages/PublishPayment"));
const AICreditPayment = lazy(() => import("./pages/AICreditPayment"));
const PreviewPayments = lazy(() => import("./pages/PreviewPayments"));
const PreviewEmails = lazy(() => import("./pages/PreviewEmails"));
const PublishCheckoutPreview = lazy(() => import("./pages/PublishCheckoutPreview"));
const PreviewOnboardingV2 = lazy(() => import("./pages/PreviewOnboardingV2"));
const PreviewWhatsApp = lazy(() => import("./pages/PreviewWhatsApp"));
const OnboardingCompleteGate = lazy(() => import("./pages/OnboardingCompleteGate"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const StoreLegalPage = lazy(() => import("./pages/StoreLegalPage"));
const StoreUnsubscribe = lazy(() => import("./pages/StoreUnsubscribe"));

const queryClient = new QueryClient();

const App = () => {
  // When served from a tenant subdomain (e.g. aurora.siango.app) OR a customer's
  // own custom domain (bought via Siango), the whole app IS that one store: paths
  // map to the store's home/about, and platform marketing/auth routes are not
  // exposed. On the apex it's the full platform. Custom domains resolve async, so
  // `resolving` covers the brief lookup window (avoid flashing the marketing site).
  const { tenantSlug, resolving } = useResolvedTenant();

  // Capture first-touch UTM from ad links (Siango acquisition attribution).
  useEffect(() => { captureUtm(); }, []);

  return (
  <ErrorBoundary>
  <HelmetProvider>
    <LanguageProvider>
      <AccessibilityProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={
                <div className="min-h-screen flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              }>
              {resolving ? (
                <div className="min-h-screen flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : tenantSlug ? (
                <Routes>
                  <Route path="/" element={<StoreFront slugOverride={tenantSlug} />} />
                  <Route path="/about" element={<StoreAboutPage slugOverride={tenantSlug} />} />
                  <Route path="/terms" element={<StoreLegalPage docType="terms" slugOverride={tenantSlug} />} />
                  <Route path="/privacy" element={<StoreLegalPage docType="privacy" slugOverride={tenantSlug} />} />
                  <Route path="/unsubscribe" element={<StoreUnsubscribe slugOverride={tenantSlug} />} />
                  {/* Any other path on a store subdomain falls back to the store home. */}
                  <Route path="*" element={<StoreFront slugOverride={tenantSlug} />} />
                </Routes>
              ) : (
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/register" element={<ShabbatGate><Register /></ShabbatGate>} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/onboarding" element={<ShabbatGate><Onboarding /></ShabbatGate>} />
                  <Route path="/onboarding/complete" element={<OnboardingCompleteGate />} />
                  <Route path="/publish-payment" element={<PublishPayment />} />
                  <Route path="/thank-you" element={<ThankYou />} />
                  <Route path="/ai-credits-payment" element={<AICreditPayment />} />
                  <Route path="/preview/payments" element={<PreviewPayments />} />
                  <Route path="/preview/emails" element={<PreviewEmails />} />
                  <Route path="/preview/publish" element={<PublishCheckoutPreview />} />
                  <Route path="/preview/onboarding-v2" element={<PreviewOnboardingV2 />} />
                  <Route path="/preview/whatsapp" element={<PreviewWhatsApp />} />
                  <Route path="/store" element={<StoreFront />} />
                  <Route path="/store/:slug" element={<StoreFront />} />
                  <Route path="/store/:slug/about" element={<StoreAboutPage />} />
                  <Route path="/store/:slug/terms" element={<StoreLegalPage docType="terms" />} />
                  <Route path="/store/:slug/privacy" element={<StoreLegalPage docType="privacy" />} />
                  <Route path="/store/:slug/unsubscribe" element={<StoreUnsubscribe />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/manage-x7k9" element={<AdminDashboard />} />
                  <Route path="/accessibility" element={<Accessibility />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/help" element={<HelpCenter />} />
                  <Route path="/templates" element={<AllTemplates />} />
                  <Route path="/contact" element={<Contact />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              )}
              </Suspense>
              <AccessibilityWidget />
              {!tenantSlug && <FloatingHelpButton />}
              <CookieConsent />
            </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </AccessibilityProvider>
    </LanguageProvider>
  </HelmetProvider>
  </ErrorBoundary>
  );
};

export default App;
