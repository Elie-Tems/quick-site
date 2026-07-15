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
import AdminOnlyRoute from "@/components/AdminOnlyRoute";
import LanguageUrlSync from "@/components/LanguageUrlSync";
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
const SynagogueScreen = lazy(() => import("./pages/SynagogueScreen"));
const SynagogueSite = lazy(() => import("./pages/SynagogueSite"));
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
const BookingCancel = lazy(() => import("./pages/BookingCancel"));
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
const RedesignNonprofitDash = lazy(() => import("./pages/preview-redesign/NonprofitDashboard"));
const RedesignCampaignDash = lazy(() => import("./pages/preview-redesign/CampaignDashboard"));
const RedesignVacation = lazy(() => import("./pages/preview-redesign/VacationRentalSite"));
const RedesignVacationDash = lazy(() => import("./pages/preview-redesign/VacationRentalDashboard"));
const RedesignEmails = lazy(() => import("./pages/preview-redesign/EmailsVertical"));
const RedesignTemplates = lazy(() => import("./pages/preview-redesign/TemplateShowcase"));
const RedesignBoutique = lazy(() => import("./pages/preview-redesign/BoutiqueSite"));
const RedesignFitness = lazy(() => import("./pages/preview-redesign/FitnessSite"));
const RedesignFitnessDash = lazy(() => import("./pages/preview-redesign/FitnessDashboard"));
const PreviewWhatsApp = lazy(() => import("./pages/PreviewWhatsApp"));
const PreviewEmail = lazy(() => import("./pages/PreviewEmail"));
const OnboardingCompleteGate = lazy(() => import("./pages/OnboardingCompleteGate"));
const ThankYou = lazy(() => import("./pages/ThankYou"));
const StoreLegalPage = lazy(() => import("./pages/StoreLegalPage"));
const StoreUnsubscribe = lazy(() => import("./pages/StoreUnsubscribe"));
const PlatformUnsubscribe = lazy(() => import("./pages/PlatformUnsubscribe"));

// Sane React Query defaults. The bare `new QueryClient()` used the library
// defaults (staleTime 0 + refetchOnWindowFocus + retry 3), which made every
// component mount and every tab-focus refire ALL queries, and every failed query
// retry 3x - a request storm that was crushing load times (worse during a
// Supabase incident). These defaults cache data, stop focus-refetch storms, and
// cut retries so the app stops "thinking" on every interaction.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // data stays fresh 5 min - dedupes remounts
      gcTime: 10 * 60 * 1000,          // keep cache 10 min
      refetchOnWindowFocus: false,     // don't refetch everything when the tab regains focus
      refetchOnReconnect: false,
      retry: 1,                        // 1 retry instead of 3 (huge under a slow backend)
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
});

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
              <LanguageUrlSync />
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
                  {/* Language homepages - crawlers get localized meta+hero+hreflang
                      from the edge middleware; humans get the SPA with the chrome
                      localized via LanguageUrlSync. */}
                  <Route path="/en" element={<Index />} />
                  <Route path="/ar" element={<Index />} />
                  <Route path="/fr" element={<Index />} />
                  <Route path="/ru" element={<Index />} />
                  <Route path="/register" element={<ShabbatGate><Register /></ShabbatGate>} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/onboarding" element={<ShabbatGate><Onboarding /></ShabbatGate>} />
                  <Route path="/onboarding/complete" element={<OnboardingCompleteGate />} />
                  <Route path="/publish-payment" element={<PublishPayment />} />
                  <Route path="/thank-you" element={<ThankYou />} />
                  <Route path="/ai-credits-payment" element={<AICreditPayment />} />
                  <Route path="/booking/cancel" element={<BookingCancel />} />

                  {/* Internal-only pages (investor deck, platform-UI mockups with
                      sample data). Admin-gated so Moti/Daniel can review them but
                      the public and crawlers cannot reach them. */}
                  <Route path="/email-marketing-preview" element={<AdminOnlyRoute><EmailMarketingPreview /></AdminOnlyRoute>} />
                  <Route path="/presentation" element={<AdminOnlyRoute><Presentation /></AdminOnlyRoute>} />
                  <Route path="/preview/payments" element={<AdminOnlyRoute><PreviewPayments /></AdminOnlyRoute>} />
                  <Route path="/preview/emails" element={<AdminOnlyRoute><PreviewEmails /></AdminOnlyRoute>} />
                  <Route path="/preview/publish" element={<AdminOnlyRoute><PublishCheckoutPreview /></AdminOnlyRoute>} />
                  <Route path="/preview/onboarding-v2" element={<AdminOnlyRoute><PreviewOnboardingV2 /></AdminOnlyRoute>} />
                  <Route path="/preview/home-v2" element={<AdminOnlyRoute><PreviewHomeV2 /></AdminOnlyRoute>} />
                  <Route path="/preview/redesign" element={<AdminOnlyRoute><RedesignHub /></AdminOnlyRoute>} />
                  <Route path="/preview/redesign/dashboard" element={<AdminOnlyRoute><RedesignDashboard /></AdminOnlyRoute>} />
                  <Route path="/preview/redesign/onboarding" element={<AdminOnlyRoute><RedesignOnboarding /></AdminOnlyRoute>} />
                  <Route path="/preview/redesign/login" element={<AdminOnlyRoute><RedesignLogin /></AdminOnlyRoute>} />
                  <Route path="/preview/redesign/admin" element={<AdminOnlyRoute><RedesignAdmin /></AdminOnlyRoute>} />
                  <Route path="/preview/redesign/services-dashboard" element={<AdminOnlyRoute><RedesignServicesDash /></AdminOnlyRoute>} />
                  <Route path="/preview/redesign/realestate-dashboard" element={<AdminOnlyRoute><RedesignRealEstateDash /></AdminOnlyRoute>} />
                  <Route path="/preview/redesign/project-dashboard" element={<AdminOnlyRoute><RedesignProjectDash /></AdminOnlyRoute>} />
                  <Route path="/preview/redesign/nonprofit-dashboard" element={<AdminOnlyRoute><RedesignNonprofitDash /></AdminOnlyRoute>} />
                  <Route path="/preview/redesign/campaign-dashboard" element={<AdminOnlyRoute><RedesignCampaignDash /></AdminOnlyRoute>} />
                  <Route path="/preview/redesign/vacation-dashboard" element={<AdminOnlyRoute><RedesignVacationDash /></AdminOnlyRoute>} />
                  <Route path="/preview/redesign/fitness-dashboard" element={<AdminOnlyRoute><RedesignFitnessDash /></AdminOnlyRoute>} />
                  <Route path="/preview/redesign/emails" element={<AdminOnlyRoute><RedesignEmails /></AdminOnlyRoute>} />
                  <Route path="/preview/redesign/templates" element={<AdminOnlyRoute><RedesignTemplates /></AdminOnlyRoute>} />
                  <Route path="/preview/whatsapp" element={<AdminOnlyRoute><PreviewWhatsApp /></AdminOnlyRoute>} />
                  <Route path="/preview/email" element={<AdminOnlyRoute><PreviewEmail /></AdminOnlyRoute>} />

                  {/* Public storefront-design template demos (linked from the homepage). */}
                  <Route path="/preview/redesign/home-multi" element={<RedesignHomeMulti />} />
                  <Route path="/preview/redesign/services" element={<RedesignServices />} />
                  <Route path="/preview/redesign/realestate" element={<RedesignRealEstate />} />
                  <Route path="/preview/redesign/project" element={<RedesignProject />} />
                  <Route path="/preview/redesign/nonprofit" element={<RedesignNonprofit />} />
                  <Route path="/preview/redesign/crowdfunding" element={<RedesignCrowdfunding />} />
                  <Route path="/preview/redesign/photographer" element={<RedesignPhotographer />} />
                  <Route path="/preview/redesign/home-pro" element={<RedesignHomePro />} />
                  <Route path="/preview/redesign/car-dealer" element={<RedesignCarDealer />} />
                  <Route path="/preview/redesign/vacation" element={<RedesignVacation />} />
                  <Route path="/preview/redesign/boutique" element={<RedesignBoutique />} />
                  <Route path="/preview/redesign/fitness" element={<RedesignFitness />} />
                  <Route path="/store" element={<StoreFront />} />
                  <Route path="/store/:slug" element={<StoreFront />} />
                  <Route path="/store/:slug/about" element={<StoreAboutPage />} />
                  <Route path="/store/:slug/terms" element={<StoreLegalPage docType="terms" />} />
                  <Route path="/store/:slug/privacy" element={<StoreLegalPage docType="privacy" />} />
                  <Route path="/store/:slug/unsubscribe" element={<StoreUnsubscribe />} />
                  <Route path="/store/:slug/my-orders" element={<MyOrders />} />
                  {/* Public synagogue site + member self-service, and the display screen. */}
                  <Route path="/shul/:slug" element={<SynagogueSite />} />
                  <Route path="/shul/:slug/screen" element={<SynagogueScreen />} />
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
