import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import AccessibilityWidget from "@/components/accessibility/AccessibilityWidget";
import FloatingHelpButton from "@/components/FloatingHelpButton";
import CookieConsent from "@/components/CookieConsent";
import Index from "./pages/Index";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/AuthCallback";
import Onboarding from "./pages/Onboarding";
import StoreFront from "./pages/StoreFront";
import StoreFrontV2 from "./pages/StoreFrontV2";
import StoreAboutPage from "./pages/StoreAboutPage";
import StoreAboutPageV2 from "./pages/StoreAboutPageV2";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Accessibility from "./pages/Accessibility";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import HelpCenter from "./pages/HelpCenter";
import AllTemplates from "./pages/AllTemplates";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import PublishPayment from "./pages/PublishPaymentOld";
import AICreditPayment from "./pages/AICreditPayment";
import PreviewPayments from "./pages/PreviewPayments";
import PreviewEmails from "./pages/PreviewEmails";
import PublishCheckoutPreview from "./pages/PublishCheckoutPreview";
import PreviewOnboardingV2 from "./pages/PreviewOnboardingV2";
import OnboardingCompleteGate from "./pages/OnboardingCompleteGate";
import ThankYou from "./pages/ThankYou";
import { getTenantSlug } from "@/lib/subdomain";
import ShabbatGate from "@/components/ShabbatGate";
import StoreLegalPage from "./pages/StoreLegalPage";
import StoreUnsubscribe from "./pages/StoreUnsubscribe";

const queryClient = new QueryClient();

const App = () => {
  // When served from a tenant subdomain (e.g. aurora.siango.app) the whole
  // app IS that one store: paths map to the store's home/about, and platform
  // marketing/auth routes are not exposed. On the apex it's the full platform.
  const tenantSlug = getTenantSlug();

  return (
  <HelmetProvider>
    <LanguageProvider>
      <AccessibilityProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              {tenantSlug ? (
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
                  <Route path="/store" element={<StoreFront />} />
                  <Route path="/store/:slug" element={<StoreFront />} />
                  <Route path="/store/:slug/v2" element={<StoreFrontV2 />} />
                  <Route path="/store/:slug/v2/about" element={<StoreAboutPageV2 />} />
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
              <AccessibilityWidget />
              {/* Platform support button only on the platform itself, not on stores. */}
              {!tenantSlug && <FloatingHelpButton />}
              <CookieConsent />
            </BrowserRouter>
            </TooltipProvider>
          </AuthProvider>
        </QueryClientProvider>
      </AccessibilityProvider>
    </LanguageProvider>
  </HelmetProvider>
  );
};

export default App;
