import { useEffect, useState, useCallback } from "react";
import { gtm } from "@/lib/gtm";
import SEOHead from "@/components/SEOHead";
import { useNavigate, useSearchParams, useLocation, Link } from "react-router-dom";
import { Loader2, CreditCard, ExternalLink, CheckCircle2, ArrowRight, RefreshCw, XCircle, ShieldCheck, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness } from "@/hooks/useBusiness";
import { toast } from "@/hooks/use-toast";
import type { OnboardingData } from "@/pages/Onboarding";
import {
  buildIcountCheckoutUrl,
  getIcountEmbedMode,
  getPublishFeeIls,
} from "@/lib/publishPaymentConfig";

const STORAGE_KEY = "siango_publish_onboarding";

const PublishPayment = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { data: myBusiness, isLoading: businessLoading } = useMyBusiness();

  const businessIdParam = searchParams.get("businessId");
  const sessionTokenParam = searchParams.get("session_token");
  const [resolvedBusinessId, setResolvedBusinessId] = useState<string | null>(null);
  const [sessionResolveFailed, setSessionResolveFailed] = useState(false);

  // Use business from URL param, or from session token, or from useMyBusiness.
  // On the payment return (?paid=1) iCount often drops our businessId param AND the
  // store may have JUST become published - so accept the published business too,
  // otherwise the page can't identify it and wrongly bounces to onboarding.
  const effectiveBusinessId = businessIdParam ?? resolvedBusinessId ??
    (myBusiness && (!myBusiness.is_published || searchParams.get("paid") === "1") ? myBusiness.id : null);

  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'completed' | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [approvalNum, setApprovalNum] = useState<string>("");
  // Two-stage flow: (1) a clear terms-of-charge confirmation, (2) the actual
  // payment iframe. The earlier "here's your store!" preview interstitial was
  // removed - it just delayed reaching the terms/coupon screen below, which
  // covers the same confirmation.
  const [confirmed, setConfirmed] = useState(false);
  // Self-managed billing (iCount token) - gated by the build flag OR a ?billing=token
  // URL override, so we can test the new flow in isolation before flipping it live.
  const selfManaged = import.meta.env.VITE_BILLING_SELF_MANAGED === "true" || searchParams.get("billing") === "token";
  const [couponCode, setCouponCode] = useState("");
  const [couponInfo, setCouponInfo] = useState<{ discount_type: string; discount_value: number; duration: string } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [startingCheckout, setStartingCheckout] = useState(false);
  // Cardcom hosted-page (LowProfile) URL, rendered inside our own iframe so the
  // customer stays on Siango instead of being redirected off-site.
  const [cardcomUrl, setCardcomUrl] = useState("");
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  // Surfaced when the first charge fails / the card couldn't be saved / no IPN
  // arrived - so the customer isn't left staring at an endless spinner.
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsScrolled, setTermsScrolled] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const fee = getPublishFeeIls();
  const basePaymentUrl = (import.meta.env.VITE_ICOUNT_PAYMENT_BASE_URL || "").trim();
  const embedMode = getIcountEmbedMode();

  useEffect(() => {
    const fromState = (location.state as { onboardingData?: OnboardingData } | null)?.onboardingData;
    if (fromState) {
      setOnboardingData(fromState);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromState));
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) setOnboardingData(JSON.parse(raw) as OnboardingData);
    } catch {
      /* ignore */
    }
  }, [location.state]);

  const goToComplete = useCallback(
    (data: OnboardingData | null) => {
      sessionStorage.removeItem(STORAGE_KEY);
      // Always route through the celebration screen - even with no onboarding
      // payload (e.g. renewing a lapsed subscription on an existing store), it
      // fetches the business name/slug from the DB itself (OnboardingComplete.tsx).
      navigate("/onboarding/complete?from_payment=true", { state: data ? { data } : undefined, replace: true });
    },
    [navigate]
  );

  const ensureSession = useCallback(async () => {
    if (!user || !effectiveBusinessId) return;

    // First check for existing paid or pending sessions (not completed)
    const { data: existingSessions, error: existErr } = await supabase
      .from("publish_checkout_sessions")
      .select("session_token, status")
      .eq("business_id", effectiveBusinessId)
      .eq("user_id", user.id)
      .in("status", ["pending", "paid"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (existErr) throw existErr;

    const existing = existingSessions?.[0];
    
    if (existing?.session_token) {
      setSessionToken(existing.session_token);
      setPaymentStatus(existing.status as 'pending' | 'paid');
      if (basePaymentUrl) {
        setCheckoutUrl(buildIcountCheckoutUrl(basePaymentUrl, existing.session_token, effectiveBusinessId));
      }
      return;
    }

    // No existing session - create new one
    const token = crypto.randomUUID();
    const { error: insErr } = await supabase.from("publish_checkout_sessions").insert({
      user_id: user.id,
      business_id: effectiveBusinessId,
      session_token: token,
      status: "pending",
      amount_ils: fee,
      provider: "icount",
      // Stored so the iCount IPN can match the payment back to this session by
      // the payer's email even if iCount doesn't echo our session_token.
      email: user.email ?? null,
    });

    if (insErr) throw insErr;

    setSessionToken(token);
    if (basePaymentUrl) {
      setCheckoutUrl(buildIcountCheckoutUrl(basePaymentUrl, token, effectiveBusinessId));
    }
  }, [user, effectiveBusinessId, fee, basePaymentUrl]);

  useEffect(() => {
    if (!user || authLoading) return;
    if (!businessIdParam && sessionTokenParam) {
      (async () => {
        const { data, error } = await supabase
          .from("publish_checkout_sessions")
          .select("business_id")
          .eq("session_token", sessionTokenParam)
          .eq("user_id", user.id)
          .maybeSingle();
        if (error || !data?.business_id) {
          setSessionResolveFailed(true);
          toast({
            title: "קישור לא תקין",
            description: "לא נמצא סשן תשלום תואם. נסו מהדשבורד או מהאונבורדינג.",
            variant: "destructive",
          });
          return;
        }
        setResolvedBusinessId(data.business_id);
      })();
    }
  }, [authLoading, user, businessIdParam, sessionTokenParam]);

  useEffect(() => {
    if (authLoading || businessLoading) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    // Allow if: has businessId param, has session token, an unpublished business,
    // OR we're on the payment return (?paid=1) - never bounce a paying customer to
    // onboarding just because iCount dropped the businessId and the store already
    // published. The paid-return effect below resolves the business + shows success.
    if (!businessIdParam && !sessionTokenParam && searchParams.get("paid") !== "1" && (!myBusiness || myBusiness.is_published)) {
      toast({ title: "חסר מזהה עסק", variant: "destructive" });
      navigate("/onboarding", { replace: true });
      return;
    }
    if (!businessIdParam && sessionTokenParam && !resolvedBusinessId && !sessionResolveFailed) {
      return;
    }
    if (sessionResolveFailed) {
      setLoading(false);
      navigate("/dashboard", { replace: true });
      return;
    }
    if (!effectiveBusinessId) return;

    (async () => {
      try {
        await ensureSession();
      } catch (e: unknown) {
        console.error(e);
        toast({
          title: "שגיאה",
          description: e instanceof Error ? e.message : "לא ניתן להכין תשלום",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [
    authLoading,
    businessLoading,
    user,
    myBusiness,
    businessIdParam,
    sessionTokenParam,
    resolvedBusinessId,
    sessionResolveFailed,
    effectiveBusinessId,
    navigate,
    ensureSession,
  ]);

  useEffect(() => {
    if (!effectiveBusinessId || !onboardingData || !sessionToken) return;

    const id = window.setInterval(async () => {
      // Check payment status
      const { data: session } = await supabase
        .from("publish_checkout_sessions")
        .select("status")
        .eq("session_token", sessionToken)
        .maybeSingle();

      if (session?.status) {
        setPaymentStatus(session.status as 'pending' | 'paid' | 'completed');
      }

      // Check if published
      const { data: b } = await supabase
        .from("businesses")
        .select("is_published")
        .eq("id", effectiveBusinessId)
        .maybeSingle();

      if (b?.is_published) {
        goToComplete(onboardingData);
      }
    }, 4000);

    return () => clearInterval(id);
  }, [effectiveBusinessId, onboardingData, sessionToken, goToComplete]);

  // Returning from the hosted payment lands here as ?paid=1. The self-managed IPN
  // publishes the store server-side a few seconds later, and it marks the session
  // "completed" - so ensureSession (which only looks for pending/paid) never sets
  // sessionToken, and the poll above never runs. Watch is_published directly here:
  // navigate to the success flow the moment the store goes live (also covers simply
  // revisiting the page for an already-published store).
  useEffect(() => {
    if (!effectiveBusinessId) return;
    // Payment failed/cancelled on iCount's own page -> it redirects back ?failed=1.
    if (searchParams.get("failed") === "1") { setPaymentError("failed"); return; }
    let done = false;
    let intervalId: number | undefined;
    const paidReturn = searchParams.get("paid") === "1";
    const finish = () => { done = true; if (intervalId !== undefined) clearInterval(intervalId); };
    const check = async () => {
      if (done) return;
      const { data: b } = await supabase
        .from("businesses").select("is_published").eq("id", effectiveBusinessId).maybeSingle();
      if (!done && b?.is_published) { finish(); goToComplete(onboardingData); return; }
      if (!paidReturn) return;
      // A declined first charge / a card that couldn't be saved leaves the session
      // in one of these states. Surface it instead of spinning forever + dying.
      const { data: s } = await supabase
        .from("publish_checkout_sessions").select("status")
        .eq("business_id", effectiveBusinessId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!done && (s?.status === "charge_failed" || s?.status === "no_token")) {
        finish(); setPaymentError(s!.status as string);
      }
    };
    check();
    if (!paidReturn) return () => { done = true; };
    intervalId = window.setInterval(check, 3000);
    // Still nothing after 90s: stop the spinner and tell them (IPN may be delayed by
    // a provider incident, or the charge quietly failed) - don't strand them.
    const stop = window.setTimeout(() => { if (!done) { finish(); setPaymentError("timeout"); } }, 90000);
    return () => { done = true; if (intervalId !== undefined) clearInterval(intervalId); clearTimeout(stop); };
  }, [effectiveBusinessId, searchParams, onboardingData, goToComplete]);

  const handlePublish = async () => {
    if (!sessionToken && !approvalNum.trim()) return;
    setPublishing(true);
    try {
      const { data, error } = await supabase.functions.invoke("finalize-publish", {
        body: { 
          sessionToken: sessionToken || undefined,
          approvalNum: approvalNum.trim() || undefined,
          businessId: effectiveBusinessId || undefined
        },
      });
      if (error) throw error;
      if (data?.ok) {
        gtm.sitePublished();
        const { data: biz } = await supabase
          .from("businesses")
          .select("slug")
          .eq("id", data.businessId || effectiveBusinessId)
          .maybeSingle();
        sessionStorage.removeItem(STORAGE_KEY);
        setPublishedSlug(biz?.slug ?? null);
        return;
      }
      if (data?.legalNotApproved) {
        toast({
          title: "צריך לאשר את המסמכים המשפטיים",
          description: "כנסו ל'מסמכים משפטיים' בדשבורד, אשרו את התקנון ומדיניות הפרטיות, ואז פרסמו.",
          variant: "destructive",
        });
        return;
      }
      if (data?.pendingPayment) {
        toast({
          title: "ממתינים לאישור תשלום",
          description: "אם כבר שילמת, רגע אחד - האישור יגיע מהסליקה.",
        });
      }
    } catch (e: unknown) {
      toast({
        title: "לא ניתן לפרסם כעת",
        description: e instanceof Error ? e.message : "נסו שוב בעוד רגע",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  // Validate a subscription coupon (self-managed billing) via the anti-enumeration
  // RPC. Shows the discount; the real amount is recomputed server-side at checkout.
  const applyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    const { data } = await supabase.rpc("validate_subscription_coupon" as any, { p_code: code, p_product: "publish" } as any);
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.valid) { setCouponInfo(row); setCouponMsg("הקופון הוחל ✓"); }
    else { setCouponInfo(null); setCouponMsg("קוד קופון לא תקין"); }
  };

  // Confirm -> payment. Self-managed: create the iCount token sale (server injects
  // the discounted amount) and load its sale_url into the payment iframe. Legacy:
  // just reveal the existing checkout iframe.
  const handleConfirm = async () => {
    if (!selfManaged) { setConfirmed(true); return; }
    setStartingCheckout(true);
    try {
      const { data, error } = await supabase.functions.invoke("billing-cardcom-checkout", {
        body: { businessId: effectiveBusinessId, couponCode: couponInfo ? couponCode.trim() : undefined },
      });
      if (error) throw error;
      // Cardcom returns a hosted LowProfile page URL. Render it inside our own
      // iframe (below) so the customer stays on Siango. Cardcom's post-payment
      // SuccessRedirectUrl (?paid=1) navigates the top window out of the frame
      // (sandbox allow-top-navigation; App.tsx also force-escapes app nesting).
      // If Cardcom refuses to be framed, the fallback link does the full redirect.
      if ((data as any)?.saleUrl) { setCardcomUrl((data as any).saleUrl); return; }
      else throw new Error((data as any)?.error || "לא ניתן להתחיל תשלום");
    } catch (e: unknown) {
      toast({ title: "לא ניתן להתחיל תשלום", description: e instanceof Error ? e.message : "נסו שוב", variant: "destructive" });
    } finally {
      setStartingCheckout(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  // Cardcom hosted payment page, embedded in our own iframe so the customer never
  // leaves Siango. The sandbox allows top-navigation so Cardcom's post-payment
  // redirect (?paid=1) escapes the frame back to the top window. The fallback link
  // does a full redirect in case Cardcom refuses to be framed (never blocks paying).
  if (cardcomUrl) {
    return (
      <>
        <SEOHead title="תשלום לפרסום האתר | סיאנגו" noindex={true} />
        <div className="min-h-screen bg-surface-1 flex flex-col">
          <div className="w-full px-4 py-6 flex flex-col gap-4 flex-1">
            <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
              <Button variant="ghost" onClick={() => setCardcomUrl("")} className="gap-2">
                <ArrowRight className="w-4 h-4" />
                חזרה
              </Button>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">תשלום מאובטח</h1>
              <div className="w-[90px]" />
            </div>
            <div className="w-full max-w-5xl mx-auto grow flex">
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg flex flex-col w-full">
                <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 text-sm font-medium text-foreground text-center flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  תשלום מאובטח דרך Cardcom - סיאנגו לא רואה את פרטי הכרטיס
                </div>
                <iframe
                  title="תשלום מאובטח Cardcom"
                  src={cardcomUrl}
                  className="w-full grow min-h-[min(80vh,820px)] border-0 bg-white"
                  allow="payment *"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-top-navigation-by-user-activation"
                />
                <div className="px-4 py-3 border-t border-border bg-muted/20 text-center">
                  <a
                    href={cardcomUrl}
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    התשלום לא נטען? המשיכו לעמוד הסליקה
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Payment did not complete: never leave the customer on a dead spinner ──
  if (paymentError) {
    const msg =
      paymentError === "charge_failed"
        ? "החיוב לא עבר - הכרטיס נדחה. לא בוצע חיוב. אפשר לנסות שוב או עם כרטיס אחר."
        : paymentError === "no_token"
        ? "לא הצלחנו לשמור את הכרטיס, ולכן לא בוצע חיוב. אפשר לנסות שוב."
        : paymentError === "failed"
        ? "התשלום בוטל או נכשל. לא בוצע חיוב."
        : "עדיין לא קיבלנו אישור תשלום. אם חויבתם - האתר יתפרסם אוטומטית תוך דקות ותקבלו מייל. אפשר לרענן או לנסות שוב.";
    return (
      <>
        <SEOHead title="התשלום לא הושלם | סיאנגו" noindex={true} />
        <div className="min-h-screen flex items-center justify-center bg-surface-1 p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 flex flex-col items-center gap-5 text-center shadow-xl">
            <div className="text-5xl">😕</div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">התשלום לא הושלם</h1>
              <p className="text-muted-foreground mt-2 text-sm">{msg}</p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Button
                variant="hero"
                onClick={() => { setPaymentError(null); window.location.href = `/publish-payment?businessId=${effectiveBusinessId}`; }}
              >
                לנסות שוב
              </Button>
              <Button asChild variant="ghost">
                <Link to="/dashboard">חזרה לדשבורד</Link>
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── After returning from the card page (?paid=1): show OUR honest "processing"
  // screen while the server charges the card (cc/bill) and publishes. This is what
  // makes the customer's confirmation truthful: they never rest on iCount's
  // premature "success" (which only means the card was saved). A real charge
  // navigates away to the success flow; a declined charge flips to the error
  // screen above; a 90s timeout also flips to that screen. So being here == still
  // working, honestly. ──
  if (searchParams.get("paid") === "1") {
    return (
      <>
        <SEOHead title="מעבד תשלום | סיאנגו" noindex={true} />
        <div className="min-h-screen flex items-center justify-center bg-surface-1 p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 flex flex-col items-center gap-5 text-center shadow-xl">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">מבצעים את התשלום...</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                מאמתים את הכרטיס, מחייבים ומפרסמים את האתר. רגע אחד - אל תסגרו את החלון.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Only require onboardingData if we don't have a businessId (i.e., coming from onboarding flow)
  if (!onboardingData && !effectiveBusinessId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-background">
        <p className="text-muted-foreground text-center">חסרים נתוני אונבורדינג. חזרו לשלב הפרסום.</p>
        <Button asChild variant="hero">
          <Link to="/onboarding">חזרה לאונבורדינג</Link>
        </Button>
      </div>
    );
  }

  // ── Success screen: shown after successful publish ──────────────────────
  if (publishedSlug !== null) {
    const storeUrl = `${window.location.origin}/store/${publishedSlug}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=000000&bgcolor=ffffff&data=${encodeURIComponent(storeUrl)}`;
    const waText = encodeURIComponent(`היי! בניתי אתר חנות חדש בכמה דקות 🛍️\nאפשר לראות ולהזמין מוצרים כאן:\n${storeUrl}\nמה דעתכם? 😊`);
    return (
      <>
        <SEOHead title="החנות שלך חיה! | סיאנגו" noindex={true} />
        <div className="min-h-screen flex items-center justify-center bg-surface-1 p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-8 flex flex-col items-center gap-6 text-center shadow-xl">
            <div className="text-5xl">🎉</div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">החנות שלך חיה!</h1>
              <p className="text-muted-foreground mt-1 text-sm">שתפו עם לקוחות או הדפיסו את הקוד לחנות הפיזית</p>
            </div>
            <img
              src={qrSrc}
              alt="QR code לחנות"
              width={180}
              height={180}
              className="rounded-xl border border-border"
            />
            <p className="text-xs text-muted-foreground font-mono break-all" dir="ltr">{storeUrl}</p>
            {/* Ready-to-paste share message */}
            <div className="w-full bg-muted/50 rounded-xl p-3 text-right text-sm text-foreground border border-border relative">
              <p className="leading-relaxed whitespace-pre-line">{`היי! בניתי אתר חנות חדש בכמה דקות 🛍️\nאפשר לראות ולהזמין מוצרים כאן:\n${storeUrl}\nמה דעתכם? 😊`}</p>
              <button
                onClick={() => navigator.clipboard.writeText(`היי! בניתי אתר חנות חדש בכמה דקות 🛍️\nאפשר לראות ולהזמין מוצרים כאן:\n${storeUrl}\nמה דעתכם? 😊`).then(() => window.alert("הועתק ✓"))}
                className="absolute top-2 left-2 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors"
                aria-label="העתק הודעה"
              >
                העתק
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <a
                href={`https://wa.me/?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25d366] text-white font-medium py-3 px-4 text-sm hover:opacity-90 transition-opacity"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.136.558 4.135 1.533 5.862L.057 23.43a.5.5 0 0 0 .612.612l5.568-1.476A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.65-.518-5.163-1.42l-.372-.22-3.302.875.876-3.302-.22-.372A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                שתפו בוואטסאפ
              </a>
              <a
                href={storeUrl}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-medium py-3 px-4 text-sm hover:opacity-90 transition-opacity"
              >
                כנסו לחנות שלכם
                <ArrowRight className="w-4 h-4 rotate-180" />
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Stage 1: crystal-clear terms of the recurring charge, before payment ──
  if (!confirmed) {
    // Discounted price when a coupon is applied (self-managed billing). Mirrors the
    // server-side computation; the server recomputes the real charge at checkout.
    const discNet = couponInfo
      ? (couponInfo.discount_type === "percent"
          ? Math.max(0, fee * (1 - Math.min(100, couponInfo.discount_value) / 100))
          : Math.max(0, fee - couponInfo.discount_value))
      : fee;
    const hasDiscount = !!couponInfo && discNet < fee;
    return (
      <>
        <SEOHead title="אישור תשלום | סיאנגו" noindex={true} />

        {/* Terms dialog - must scroll to bottom to enable checkbox */}
        <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-6 pb-3 border-b border-border shrink-0">
              <DialogTitle className="text-right">תנאי שימוש ומדיניות פרטיות</DialogTitle>
            </DialogHeader>

            {/* Scrollable body */}
            <div
              className="overflow-y-auto flex-1 px-6 py-4 text-sm text-foreground leading-relaxed space-y-4"
              onScroll={(e) => {
                const el = e.currentTarget;
                if (!termsScrolled && el.scrollTop + el.clientHeight >= el.scrollHeight - 20) {
                  setTermsScrolled(true);
                }
              }}
            >
              <p className="text-xs text-muted-foreground">עדכון אחרון: ינואר 2025</p>

              <h3 className="font-bold text-base">1. המנוי</h3>
              <p>על ידי לחיצה על "פרסום החנות" אתם מאשרים הצטרפות למנוי חודשי מתחדש של סיאנגו בסך <strong>₪{fee} לחודש</strong>. המנוי מאפשר פרסום ותפעול חנות דיגיטלית פעילה תחת הפלטפורמה.</p>

              <h3 className="font-bold text-base">2. חידוש אוטומטי וחיוב</h3>
              <p>החיוב מתבצע מדי חודש באמצעות כרטיס האשראי שתזינו. המנוי מתחדש אוטומטית כל עוד לא בוטל. סיאנגו תשלח הודעת מייל לפני כל חיוב.</p>

              <h3 className="font-bold text-base">3. ביטול</h3>
              <p>ניתן לבטל את המנוי בכל עת דרך "התוכנית שלי" בדשבורד. הביטול נכנס לתוקף בסוף תקופת החיוב הנוכחית - לא יהיה חיוב נוסף. לא מוחזר תשלום על חודש שכבר נגבה.</p>

              <h3 className="font-bold text-base">4. מחיקת חנות</h3>
              <p>מחיקת החנות מבטלת את המנוי אוטומטית. החנות ותכניה ייסגרו ולא יהיו נגישים ללקוחות.</p>

              <h3 className="font-bold text-base">5. שימוש בשירות</h3>
              <p>אתם מתחייבים לא לעשות שימוש בפלטפורמה למטרות בלתי חוקיות, למכירת מוצרים אסורים, או בדרך שמפרה זכויות צד שלישי. סיאנגו שומרת לעצמה את הזכות להשעות חנות שמפרה את התנאים.</p>

              <h3 className="font-bold text-base">6. אחריות</h3>
              <p>סיאנגו מספקת את הפלטפורמה "כפי שהיא" ואינה אחראית לנזקים עקיפים, אובדן רווחים, או תקלות שאינן בשליטתה. האחריות הכוללת של סיאנגו לא תעלה על סכום המנוי ששולם בחודשיים האחרונים.</p>

              <h3 className="font-bold text-base">7. מדיניות פרטיות</h3>
              <p>אנו אוספים מידע הנדרש לתפעול השירות - פרטי קשר, פרטי עסק, ונתוני הזמנות. המידע לא נמסר לצדדים שלישיים אלא לצורך מתן השירות (למשל: חברת הסליקה). לפרטים מלאים:{" "}
                <Link to="/privacy" target="_blank" className="text-primary underline">מדיניות פרטיות מלאה</Link>.
              </p>

              <h3 className="font-bold text-base">8. תנאים מלאים</h3>
              <p>תנאי שימוש המלאים זמינים בקישור:{" "}
                <Link to="/terms" target="_blank" className="text-primary underline">תקנון סיאנגו</Link>.
                בכל סתירה בין תמצית זו לתקנון המלא - התקנון המלא גובר.
              </p>

              <div className="h-4" />
            </div>

            {/* Footer - checkbox enabled only after scrolling */}
            <div className="px-6 py-4 border-t border-border bg-muted/30 shrink-0 space-y-3">
              {!termsScrolled && (
                <p className="text-xs text-muted-foreground text-center">גללו עד הסוף כדי לאשר</p>
              )}
              <label className={`flex items-start gap-3 cursor-pointer select-none ${!termsScrolled ? "opacity-40 pointer-events-none" : ""}`}>
                <Checkbox
                  checked={termsAccepted}
                  onCheckedChange={(v) => {
                    setTermsAccepted(v === true);
                    if (v === true) setTermsOpen(false);
                  }}
                  className="mt-0.5"
                />
                <span className="text-sm text-foreground leading-snug">
                  קראתי ומסכים/ה לתנאי השימוש ולמדיניות הפרטיות של סיאנגו
                </span>
              </label>
            </div>
          </DialogContent>
        </Dialog>

        <div className="min-h-screen bg-surface-1 flex flex-col">
          <div className="w-full max-w-md mx-auto px-4 py-10 flex flex-col gap-6 flex-1">

            {/* Header */}
            <div className="text-center space-y-1">
              <div className="text-4xl mb-2">🎉</div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">מוכנים לפרסם!</h1>
              <p className="text-muted-foreground text-sm">החנות שלכם מוכנה - פעולה אחת ואתם חיים</p>
            </div>

            {/* Price card */}
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5 text-center">
              <p className="text-4xl font-extrabold text-foreground">
                {hasDiscount && <span className="text-xl font-semibold text-muted-foreground line-through ml-2">₪{fee}</span>}
                ₪{discNet} <span className="text-lg font-semibold text-muted-foreground">ש"ח לחודש</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {hasDiscount
                  ? `${couponInfo!.discount_type === "percent" ? `${couponInfo!.discount_value}% הנחה` : `₪${couponInfo!.discount_value} הנחה`}${couponInfo!.duration === "first_month" ? ` לחודש הראשון · אחר כך ₪${fee} ש"ח לחודש` : " · תמידית"}`
                  : "ביטול בכל עת · ללא התחייבות"}
              </p>
            </div>

            {/* Coupon */}
            {selfManaged && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground"><Ticket className="w-4 h-4 text-primary" /> יש לכם קוד קופון?</div>
                <div className="flex gap-2">
                  <Input value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponMsg(""); }} placeholder="קוד קופון" dir="ltr" className="flex-1" />
                  <Button type="button" variant="outline" onClick={applyCoupon} disabled={!couponCode.trim()}>החל</Button>
                </div>
                {couponMsg && <p className={`text-xs mt-1.5 ${couponInfo ? "text-green-600" : "text-destructive"}`}>{couponMsg}</p>}
              </div>
            )}

            {/* 3 key points */}
            <div className="space-y-2">
              {[
                { icon: RefreshCw,   text: `מנוי חודשי מתחדש של ₪${fee} ש"ח - מתחדש אוטומטית כל חודש` },
                { icon: XCircle,     text: 'ביטול בכל עת דרך "התוכנית שלי" - לא יהיה חיוב נוסף, אין קנס' },
                { icon: ShieldCheck, text: "תשלום מאובטח דרך Cardcom - סיאנגו לא רואה את פרטי הכרטיס" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Icon className="w-4 h-4 shrink-0 text-primary/60" />
                  <span>{text}</span>
                </div>
              ))}
            </div>

            {/* Terms acceptance row */}
            <div
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer"
              onClick={() => { if (!termsAccepted) { setTermsScrolled(false); setTermsOpen(true); } }}
            >
              <Checkbox
                checked={termsAccepted}
                onCheckedChange={(v) => {
                  if (v === true) { setTermsScrolled(false); setTermsOpen(true); }
                  else setTermsAccepted(false);
                }}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="text-sm text-foreground leading-snug">
                {termsAccepted
                  ? <span className="text-green-600 font-medium">אישרתי תנאי שימוש ומדיניות פרטיות ✓</span>
                  : <>קראתי ומסכים/ה ל<button type="button" className="text-primary underline" onClick={(e) => { e.stopPropagation(); setTermsScrolled(false); setTermsOpen(true); }}>תנאי שימוש ומדיניות פרטיות</button></>
                }
              </span>
            </div>

            {/* CTA */}
            <Button
              size="lg"
              variant="hero"
              disabled={!termsAccepted || startingCheckout}
              onClick={handleConfirm}
              className="gap-2 text-base"
            >
              {startingCheckout ? <><Loader2 className="w-5 h-5 animate-spin" /> מכינים תשלום...</> : <>פרסום החנות - המשך לתשלום <ArrowRight className="w-5 h-5 rotate-180" /></>}
            </Button>

            <p className="text-center text-xs text-muted-foreground -mt-3">
              תועברו לעמוד הסליקה המאובטח של Cardcom
            </p>

            <div className="text-center pt-1">
              <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4">
                חזרה לדשבורד
              </Link>
            </div>

          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead title="פרסום אתר | סיאנגו" noindex={true} />
    <div className="min-h-screen bg-surface-1 flex flex-col">
      <div className="w-full px-4 py-8 flex flex-col gap-6 flex-1">
        <div className="w-full max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" onClick={() => setConfirmed(false)} className="gap-2">
              <ArrowRight className="w-4 h-4" />
              חזרה
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">תשלום לפרסום האתר</h1>
            <div className="w-[120px]"></div>
          </div>
        </div>

        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <CreditCard className="w-7 h-7 text-primary" />
          </div>
          
        </div>

        {/* Centered wider iframe */}
        <div className="w-full max-w-7xl mx-auto">
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg min-h-[320px] flex flex-col">
            {!basePaymentUrl && (
              <div className="p-6 text-right text-sm">
                <p className="font-medium text-foreground mb-2">חסר קישור לעמוד סליקה</p>
                <p className="text-muted-foreground">
                  הגדירו ב־<code className="text-xs bg-muted px-1 rounded">.env</code> את{" "}
                  <code className="text-xs bg-muted px-1 rounded">VITE_ICOUNT_PAYMENT_BASE_URL</code> - כתובת עמוד
                  הסליקה מ-iCount (כולל מצב embed / onsite אם קיים אצלכם).
                </p>
              </div>
            )}
            {basePaymentUrl && checkoutUrl && (
              <>
                <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-accent/10 text-sm font-medium text-foreground text-center flex items-center justify-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  תשלום מאובטח - Cardcom
                </div>
                <iframe
                  title="תשלום מאובטח Cardcom"
                  src={checkoutUrl}
                  className="w-full grow min-h-[min(80vh,800px)] border-0 bg-background"
                  allow="payment *"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-top-navigation-by-user-activation"
                />
                <div className="px-4 py-3 border-t border-border bg-muted/20 text-center">
                  <a
                    href={checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    לא נטען כאן? פתחו תשלום בחלון חדש
                  </a>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
    </>
  );
};

export default PublishPayment;
