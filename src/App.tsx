import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { HelmetProvider } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AccessibilityWidget from "@/components/accessibility/AccessibilityWidget";
import CookieConsent from "@/components/CookieConsent";
import FloatingHelpButton from "@/components/FloatingHelpButton";
// Kept eager: only the apex landing page (the cold-load entry from Google).
import Index from "./pages/Index";
import { useResolvedTenant } from "@/hooks/useResolvedTenant";
import ShabbatGate from "@/components/ShabbatGate";
import ErrorBoundary from "@/components/ErrorBoundary";
import { captureUtm } from "@/lib/utmCapture";
// Lazy-loaded: heavy or non-first-paint pages get their own chunk, loaded on
// demand. This keeps the initial bundle small so navigation feels snappy.
const StoreFront = lazy(() => import("./pages/StoreFront"));
const Register = lazy(() => import("./pages/Register"));
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const StoreAboutPage = lazy(() => import("./pages/StoreAboutPage"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Accessibility = lazy(() => import("./pages/Accessibility"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const AllTemplates = lazy(() => import("./pages/AllTemplates"));
const TemplateConcepts = lazy(() => import("./pages/TemplateConcepts"));
const Contact = lazy(() => import("./pages/Contact"));
const PublishPayment = lazy(() => import("./pages/PublishPayment"));
const EmailMarketingPreview = lazy(() => import("./pages/EmailMarketingPreview"));
const Presentation = lazy(() => import("./pages/Presentation"));
const AICreditPayment = lazy(() => import("./pages/AICreditPayment"));
const PreviewPayments = lazy(() => import("./pages/PreviewPayments"));
const PreviewEmails = lazy(() => import("./pages/PreviewEmails"));
const PublishCheckoutPreview = lazy(() => import("./pages/PublishCheckoutPreview"));
const PreviewOnboardingV2 = lazy(() => import("./pages/PreviewOnboardingV2"));
const PreviewHomeV2 = lazy(() => import("./pages/PreviewHomeV2"));
const RedesignHub = lazy(() => import("./pages/preview-redesign/Hub"));
const RedesignDashboard = lazy(() => import("./pages/preview-redesign/DashboardV2"));
const RedesignOnboarding = lazy(() => import("./pages/preview-redesign/OnboardingV2"));
const RedesignLogin = lazy(() => import("./pages/preview-redesign/LoginV2"));
const RedesignAdmin = lazy(() => import("./pages/preview-redesign/AdminV2"));
const RedesignHomeMulti = lazy(() => import("./pages/preview-redesign/HomeMulti"));
const RedesignServices = lazy(() => import("./pages/preview-redesign/ServicesStore"));
const RedesignServicesDash = lazy(() => import("./pages/preview-redesign/ServicesDashboard"));
const RedesignRealEstate = lazy(() => import("./pages/preview-redesign/RealEstateStore"));
const RedesignRealEstateDash = lazy(() => import("./pages/preview-redesign/RealEstateDashboard"));
const RedesignProject = lazy(() => import("./pages/preview-redesign/ProjectSite"));
const RedesignProjectDash = lazy(() => import("./pages/preview-redesign/ProjectDashboard"));
const RedesignNonprofit = lazy(() => import("./pages/preview-redesign/NonprofitSite"));
const RedesignCrowdfunding = lazy(() => import("./pages/preview-redesign/CrowdfundingSite"));
const RedesignPhotographer = lazy(() => import("./pages/preview-redesign/PhotographerSite"));
const RedesignHomePro = lazy(() => import("./pages/preview-redesign/HomeProSite"));
const RedesignCarDealer = lazy(() => import("./pages/preview-redesign/CarDealerSite"));
const PreviewWhatsApp = lazy(() => import("./pages/PreviewWhatsApp"));
const PreviewEmail = lazy(() => import("./pages/PreviewEmail"));
const OnboardingCompleteGate = lazy(() => import("./pages/OnboardingCompleteGate"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const StoreLegalPage = lazy(() => import("./pages/StoreLegalPage"));
const StoreUnsubscribe = lazy(() => import("./pages/StoreUnsubscribe"));
const PlatformUnsubscribe = lazy(() => import("./pages/PlatformUnsubscribe"));

const queryClient = new QueryClient();

/**
 * The /dashboard route, with a safety net for legacy platform emails: older
 * emails sent the unsubscribe link to `/dashboard?settings=notifications` (an
 * auth-gated page that crashed for logged-out recipients). For a logged-out
 * visitor arriving with that param we show the public unsubscribe page instead,
 * so already-sent links work too. Logged-in users get the dashboard as normal.
 */
const DashboardRoute = () => {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  if (!loading && !user && searchParams.get("settings") === "notifications") {
    return <PlatformUnsubscribe />;
  }
  return <Dashboard />;
};

const App = () => {
  // When served from a tenant subdomain (e.g. aurora.siango.app) OR a customer's
  // own custom domain (bought via Siango), the whole app IS that one store: paths
  // map to the store's home/about, and platform marketing/auth routes are not
  // exposed. On the apex it's the full platform. Custom domains resolve async, so
  // `resolving` covers the brief lookup window (avoid flashing the marketing site).
  const { tenantSlug, resolving } = useResolvedTenant();

  // Capture first-touch UTM from ad links (Siango acquisition attribution).
  useEffect(() => { captureUtm(); }, []);

  // Break out of accidental iframe nesting. The iCount payment iframe redirects
  // back to an app page (e.g. /dashboard) after payment, which loads the WHOLE
  // app *inside* the payment frame. When one of our own app pages finds itself
  // embedded, escape to the top window. Store/preview pages are legitimately
  // embedded (dashboard live preview), so leave those alone.
  useEffect(() => {
    try {
      if (window.top && window.top !== window.self) {
        const p = window.location.pathname;
        const embeddable = p.startsWith("/store") || p.startsWith("/preview");
        if (!embeddable) window.top.location.replace(window.location.href);
      }
    } catch {
      /* cross-origin parent: not our nesting - ignore */
    }
  }, []);

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
                  <Route path="/my-orders" element={<MyOrders slugOverride={tenantSlug} />} />
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
                  <Route path="/email-marketing-preview" element={<EmailMarketingPreview />} />
                  <Route path="/presentation" element={<Presentation />} />
                  <Route path="/thank-you" element={<ThankYou />} />
                  <Route path="/ai-credits-payment" element={<AICreditPayment />} />
                  <Route path="/preview/payments" element={<PreviewPayments />} />
                  <Route path="/preview/emails" element={<PreviewEmails />} />
                  <Route path="/preview/publish" element={<PublishCheckoutPreview />} />
                  <Route path="/preview/onboarding-v2" element={<PreviewOnboardingV2 />} />
                  <Route path="/preview/home-v2" element={<PreviewHomeV2 />} />
                  <Route path="/preview/redesign" element={<RedesignHub />} />
                  <Route path="/preview/redesign/dashboard" element={<RedesignDashboard />} />
                  <Route path="/preview/redesign/onboarding" element={<RedesignOnboarding />} />
                  <Route path="/preview/redesign/login" element={<RedesignLogin />} />
                  <Route path="/preview/redesign/admin" element={<RedesignAdmin />} />
                  <Route path="/preview/redesign/home-multi" element={<RedesignHomeMulti />} />
                  <Route path="/preview/redesign/services" element={<RedesignServices />} />
                  <Route path="/preview/redesign/services-dashboard" element={<RedesignServicesDash />} />
                  <Route path="/preview/redesign/realestate" element={<RedesignRealEstate />} />
                  <Route path="/preview/redesign/realestate-dashboard" element={<RedesignRealEstateDash />} />
                  <Route path="/preview/redesign/project" element={<RedesignProject />} />
                  <Route path="/preview/redesign/project-dashboard" element={<RedesignProjectDash />} />
                  <Route path="/preview/redesign/nonprofit" element={<RedesignNonprofit />} />
                  <Route path="/preview/redesign/crowdfunding" element={<RedesignCrowdfunding />} />
                  <Route path="/preview/redesign/photographer" element={<RedesignPhotographer />} />
                  <Route path="/preview/redesign/home-pro" element={<RedesignHomePro />} />
                  <Route path="/preview/redesign/car-dealer" element={<RedesignCarDealer />} />
                  <Route path="/preview/whatsapp" element={<PreviewWhatsApp />} />
                  <Route path="/preview/email" element={<PreviewEmail />} />
                  <Route path="/store" element={<StoreFront />} />
                  <Route path="/store/:slug" element={<StoreFront />} />
                  <Route path="/store/:slug/about" element={<StoreAboutPage />} />
                  <Route path="/store/:slug/terms" element={<StoreLegalPage docType="terms" />} />
                  <Route path="/store/:slug/privacy" element={<StoreLegalPage docType="privacy" />} />
                  <Route path="/store/:slug/unsubscribe" element={<StoreUnsubscribe />} />
                  <Route path="/store/:slug/my-orders" element={<MyOrders />} />
                  <Route path="/unsubscribe" element={<PlatformUnsubscribe />} />
                  <Route path="/dashboard" element={<DashboardRoute />} />
                  <Route path="/manage-x7k9" element={<AdminDashboard />} />
                  <Route path="/accessibility" element={<Accessibility />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/help" element={<HelpCenter />} />
                  <Route path="/templates" element={<AllTemplates />} />
                  <Route path="/template-concepts" element={<TemplateConcepts />} />
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
