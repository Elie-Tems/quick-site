import { useState, useRef, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Helmet } from 'react-helmet-async';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import FormConsentNotice from "@/components/FormConsentNotice";
import FormErrorSummary from "@/components/FormErrorSummary";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, Gift, Zap, Check, Lock, Mail, User, Building2, Eye, EyeOff } from "lucide-react";

interface FormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  businessName?: string;
}

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');
  const { t, dir } = useLanguage();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const isHebrew = dir === 'rtl';
  
  const { signUp, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    businessName: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Honeypot field for anti-spam
  const honeypotRef = useRef<HTMLInputElement>(null);
  
  // Rate limiting
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/onboarding');
    }
  }, [user, navigate]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = t('register.fullNameRequired');
    } else if (formData.fullName.length < 2) {
      newErrors.fullName = t('register.fullNameTooShort');
    }
    
    if (!formData.email.trim()) {
      newErrors.email = t('register.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('register.emailInvalid');
    }
    
    if (!formData.password) {
      newErrors.password = t('register.passwordRequired');
    } else if (formData.password.length < 6) {
      newErrors.password = t('register.passwordTooShort');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    
    // Honeypot check - if filled, it's a bot
    if (honeypotRef.current?.value) {
      console.log("Bot detected");
      return;
    }
    
    // Rate limiting - prevent submitting more than once every 3 seconds
    const now = Date.now();
    if (now - lastSubmitTime < 3000) {
      setSubmitError(t('register.pleaseWait'));
      return;
    }
    setLastSubmitTime(now);
    
    if (!validate()) {
      // Focus on first error field
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const element = document.getElementById(firstErrorKey);
        element?.focus();
      }
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Store business name for onboarding
      localStorage.setItem("onboarding_business", formData.businessName);
      
      const { error } = await signUp(formData.email, formData.password, {
        full_name: formData.fullName,
        business_name: formData.businessName,
        referred_by: referralCode || undefined,
        signup_method: "email_password",
      });
      
      if (error) {
        if (error.message.includes('already registered')) {
          setSubmitError(t('register.emailExists'));
        } else {
          setSubmitError(error.message);
        }
      } else {
        navigate("/onboarding");
      }
    } catch (err) {
      setSubmitError(t('register.genericError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    // Terms acceptance is required for every signup path, including OAuth.
    if (!acceptedTerms) {
      setSubmitError(t('register.acceptRequired'));
      return;
    }
    // Google provides the user's name; business details are collected later in
    // onboarding - so don't block the OAuth CTA on the manual fields.
    // Store whatever was already filled for onboarding prefill (optional).
    if (formData.businessName.trim()) {
      localStorage.setItem("onboarding_business", formData.businessName);
    }
    if (formData.email) {
      localStorage.setItem("onboarding_email", formData.email);
    }

    setIsGoogleLoading(true);
    setSubmitError("");
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // שדה data לא מוגדר בטייפים של Supabase אבל קיים ב-API בפועל
          data: {
            signup_method: "google_oauth",
            full_name: formData.fullName.trim() || undefined,
            business_name: formData.businessName.trim() || undefined,
            referred_by: referralCode || undefined,
          },
        } as any,
      });
      
      if (error) {
        setSubmitError(t('register.googleError'));
        console.error("Google sign up error:", error);
      }
    } catch (err) {
      setSubmitError(t('register.googleError'));
      console.error("Google sign up error:", err);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error on change
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const isValid = formData.fullName && formData.email && formData.password && acceptedTerms;

  const benefits = [
    { icon: Zap, text: t('register.setupIn5') },
    { icon: Check, text: t('register.noCode') },
    { icon: Sparkles, text: t('register.justStart') }
  ];

  return (
    <>
      <Helmet>
        <title>{t('register.pageTitle')}</title>
        <meta name="description" content={t('register.pageDescription')} />
      </Helmet>

      <div className="register-page theme-refined" dir={dir}>
        
        {/* Background effects */}
        <div className="register-bg-noise" />
        <motion.div 
          className="register-bg-orb register-bg-orb-1"
          animate={{ 
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="register-bg-orb register-bg-orb-2"
          animate={{ 
            x: [0, -40, 0],
            y: [0, 40, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 5 }}
        />
        
        {/* Floating particles */}
        <div className="register-particles">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="register-particle"
              initial={{ 
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
                opacity: 0
              }}
              animate={{ 
                y: [null, Math.random() * -150, Math.random() * 150],
                opacity: [0, 0.5, 0]
              }}
              transition={{ 
                duration: 2 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeOut"
              }}
            />
          ))}
        </div>

        <div className="register-container" style={{ fontFamily: isHebrew ? 'Heebo, sans-serif' : undefined }}>
          
          {/* Left side - Form */}
          <motion.div 
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="register-form-side"
          >
            <div className="register-form-wrapper">
              
              {/* Referral Banner */}
              <AnimatePresence>
                {referralCode && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="register-referral-banner"
                  >
                    <div className="register-referral-icon">
                      <Gift className="w-5 h-5" />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="register-referral-pulse"
                      />
                    </div>
                    <div className="register-referral-content">
                      <p className="register-referral-title">{t('register.referralBanner')}</p>
                      <p className="register-referral-subtitle">{t('register.referralBenefit')}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Header */}
              <motion.header 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="register-header"
              >
                <div className="register-title">
                  <img 
                    src="/logo-dark-bg.png" 
                    alt="Logo" 
                    className="register-logo"
                    style={{ maxWidth: '200px', height: 'auto' }}
                  />
                </div>
                <p className="register-subtitle">
                  {t('register.subtitle')}
                </p>
              </motion.header>

              {/* Error Summary */}
              <AnimatePresence>
                {Object.keys(errors).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <FormErrorSummary errors={errors as Record<string, string>} />
                  </motion.div>
                )}
              </AnimatePresence>
              
              <AnimatePresence>
                {submitError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    role="alert" 
                    className="register-error-alert"
                  >
                    <p className="register-error-text">{submitError}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Form */}
              <motion.form 
                onSubmit={handleSubmit} 
                className="register-form" 
                noValidate
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                
                {/* Google Sign Up */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="xl"
                    className="register-google-btn"
                    onClick={handleGoogleSignUp}
                    disabled={isGoogleLoading}
                  >
                    {isGoogleLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    {t('register.googleSignUp')}
                    <div className="register-google-glow" />
                  </Button>
                </motion.div>

                <div className="register-divider">
                  <div className="register-divider-line" />
                  <span className="register-divider-text">{t('common.or')}</span>
                  <div className="register-divider-line" />
                </div>

                {/* Honeypot field - hidden from users */}
                <div className="absolute -left-[9999px]" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input
                    type="text"
                    id="website"
                    name="website"
                    ref={honeypotRef}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                {/* Full Name */}
                <div className="register-field-wrapper">
                  <Label htmlFor="fullName" className="register-label">
                    {t('register.fullName')}
                  </Label>
                  <div className="register-input-container">
                    <User className={`register-input-icon ${focusedField === 'fullName' ? 'register-input-icon-active' : ''}`} />
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      autoComplete="name"
                      placeholder={dir === 'rtl' ? 'ישראל ישראלי' : 'John Doe'}
                      value={formData.fullName}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('fullName')}
                      onBlur={() => setFocusedField(null)}
                      className={`register-input ${errors.fullName ? 'register-input-error' : ''}`}
                      aria-invalid={!!errors.fullName}
                      aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                      required
                    />
                    {focusedField === 'fullName' && (
                      <motion.div
                        layoutId="input-focus"
                        className="register-input-focus-ring"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </div>
                  <AnimatePresence>
                    {errors.fullName && (
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        id="fullName-error" 
                        className="register-field-error" 
                        role="alert"
                      >
                        {errors.fullName}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Email */}
                <div className="register-field-wrapper">
                  <Label htmlFor="email" className="register-label">
                    {t('register.email')}
                  </Label>
                  <div className="register-input-container">
                    <Mail className={`register-input-icon ${focusedField === 'email' ? 'register-input-icon-active' : ''}`} />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="example@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      className={`register-input ${errors.email ? 'register-input-error' : ''}`}
                      dir="ltr"
                      aria-invalid={!!errors.email}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      required
                    />
                    {focusedField === 'email' && (
                      <motion.div
                        layoutId="input-focus"
                        className="register-input-focus-ring"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </div>
                  <AnimatePresence>
                    {errors.email && (
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        id="email-error" 
                        className="register-field-error" 
                        role="alert"
                      >
                        {errors.email}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Password */}
                <div className="register-field-wrapper">
                  <Label htmlFor="password" className="register-label">
                    {t('register.password')}
                  </Label>
                  <div className="register-input-container">
                    <Lock className={`register-input-icon ${focusedField === 'password' ? 'register-input-icon-active' : ''}`} />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      className={`register-input ps-10 ${errors.password ? 'register-input-error' : ''}`}
                      dir="ltr"
                      aria-invalid={!!errors.password}
                      aria-describedby="password-hint password-error"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute start-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={showPassword ? t('register.hidePassword') : t('register.showPassword')}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    {focusedField === 'password' && (
                      <motion.div
                        layoutId="input-focus"
                        className="register-input-focus-ring"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </div>
                  <p id="password-hint" className="register-field-hint">
                    {t('register.passwordHint')}
                  </p>
                  <AnimatePresence>
                    {errors.password && (
                      <motion.p 
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        id="password-error" 
                        className="register-field-error" 
                        role="alert"
                      >
                        {errors.password}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Consent notice */}
                <FormConsentNotice />

                {/* Terms & Privacy acceptance - required for all signup paths */}
                <div className="register-field-wrapper">
                  <label className="flex items-start gap-2 cursor-pointer text-sm text-muted-foreground leading-relaxed">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 shrink-0 accent-primary"
                      aria-describedby="terms-acceptance-text"
                    />
                    <span id="terms-acceptance-text">
                      {t('register.acceptPrefix')}{' '}
                      <Link to="/terms" target="_blank" rel="noopener noreferrer" className="register-footer-link">
                        {t('footer.terms')}
                      </Link>{' '}
                      {t('register.acceptAnd')}
                      <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="register-footer-link">
                        {t('footer.privacy')}
                      </Link>
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <motion.div
                  whileHover={{ scale: isValid && !isLoading ? 1.02 : 1 }}
                  whileTap={{ scale: isValid && !isLoading ? 0.98 : 1 }}
                >
                  <Button 
                    type="submit" 
                    variant="hero" 
                    size="xl" 
                    className="register-submit-btn"
                    disabled={!isValid || isLoading}
                    aria-busy={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t('register.submitting')}
                      </>
                    ) : (
                      <>
                        {t('register.submit')}
                        <Arrow className="w-5 h-5 register-submit-arrow" />
                      </>
                    )}
                    <div className="register-submit-glow" />
                  </Button>
                </motion.div>
              </motion.form>

              {/* Footer */}
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="register-footer"
              >
                {t('register.hasAccount')}{" "}
                <Link to="/login" className="register-footer-link">
                  {t('register.login')}
                </Link>
              </motion.p>
            </div>
          </motion.div>

          {/* Right side - Visual */}
          <motion.div 
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="register-visual-side"
          >
            
            {/* Grid pattern */}
            <div className="register-visual-grid" />
            
            {/* Gradient orbs */}
            <motion.div 
              className="register-visual-orb register-visual-orb-1"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.3, 0.2]
              }}
              transition={{ duration: 8, repeat: Infinity }}
            />
            <motion.div 
              className="register-visual-orb register-visual-orb-2"
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.15, 0.25, 0.15]
              }}
              transition={{ duration: 10, repeat: Infinity, delay: 2 }}
            />
            
            <div className="register-visual-content">
              
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="register-visual-badge"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t('register.setupIn5')}</span>
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="register-visual-badge-pulse"
                />
              </motion.div>
              
              {/* Main text */}
              <motion.h2 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="register-visual-title"
                style={{ fontFamily: isHebrew ? 'Heebo, sans-serif' : undefined }}
              >
                {t('register.siteReady')}
                <br />
                <span className="register-visual-title-gradient">
                  {t('register.readyToGo')}
                </span>
              </motion.h2>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="register-visual-subtitle"
              >
                {t('register.noCode')}
                <br />
                {t('register.justStart')}
              </motion.p>
              
              {/* Benefits list */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
                className="register-visual-benefits"
              >
                {benefits.map((benefit, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + i * 0.1 }}
                    className="register-visual-benefit"
                  >
                    <div className="register-visual-benefit-icon">
                      <benefit.icon className="w-5 h-5" />
                    </div>
                    <span>{benefit.text}</span>
                  </motion.div>
                ))}
              </motion.div>
              
              {/* Decorative elements */}
              <motion.div
                animate={{ 
                  rotate: 360,
                }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                className="register-visual-deco register-visual-deco-1"
              />
              <motion.div
                animate={{ 
                  rotate: -360,
                }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="register-visual-deco register-visual-deco-2"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`
        /* Register Page Base - uses theme background */
        .register-page {
          position: relative;
          min-height: 100vh;
          background: linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--card)) 50%, hsl(var(--background)) 100%);
          overflow: hidden;
        }
        
        /* Background Effects */
        .register-bg-noise {
          position: fixed;
          inset: 0;
          opacity: 0.035;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          z-index: 1;
        }
        
        .register-bg-orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(140px);
          pointer-events: none;
          z-index: 0;
        }
        
        .register-bg-orb-1 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 70%);
          top: -200px;
          right: -100px;
        }
        
        .register-bg-orb-2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%);
          bottom: -150px;
          left: -100px;
        }
        
        .register-particles {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1;
        }
        
        .register-particle {
          position: absolute;
          width: 3px;
          height: 3px;
          background: hsl(var(--primary));
          border-radius: 50%;
          box-shadow: 0 0 10px hsl(var(--primary));
        }
        
        /* Main Container */
        .register-container {
          position: relative;
          z-index: 10;
          display: flex;
          min-height: 100vh;
        }
        
        /* Form Side */
        .register-form-side {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.5rem;
        }
        
        .register-form-wrapper {
          width: 100%;
          max-width: 480px;
        }
        
        /* Logo */
        .register-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 3rem;
          text-decoration: none;
        }
        
        .register-logo-icon {
          position: relative;
          width: 3rem;
          height: 3rem;
          background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(160 100% 50%) 100%);
          border-radius: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 24px hsl(var(--primary) / 0.3);
        }
        
        .register-logo-text {
          font-size: 1.25rem;
          font-weight: 800;
          color: black;
          position: relative;
          z-index: 2;
        }
        
        .register-logo-glow {
          position: absolute;
          inset: -50%;
          background: radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%);
          filter: blur(20px);
          animation: logo-pulse 3s ease-in-out infinite;
        }
        
        @keyframes logo-pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        
        .register-logo-name {
          font-size: 1.5rem;
          font-weight: 700;
          font-family: 'Syne', sans-serif;
          color: hsl(var(--foreground));
        }
        
        /* Referral Banner */
        .register-referral-banner {
          position: relative;
          background: linear-gradient(135deg, hsl(var(--primary) / 0.1) 0%, hsl(160 100% 50% / 0.05) 100%);
          border: 1px solid hsl(var(--primary) / 0.2);
          border-radius: 1rem;
          padding: 1.25rem;
          margin-bottom: 2rem;
          display: flex;
          gap: 1rem;
          overflow: hidden;
        }
        
        .register-referral-icon {
          position: relative;
          width: 3rem;
          height: 3rem;
          border-radius: 50%;
          background: hsl(var(--primary) / 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: hsl(var(--primary));
          flex-shrink: 0;
        }
        
        .register-referral-pulse {
          position: absolute;
          inset: -100%;
          background: radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%);
        }
        
        .register-referral-content {
          flex: 1;
        }
        
        .register-referral-title {
          font-weight: 700;
          color: hsl(var(--foreground));
          margin-bottom: 0.25rem;
        }
        
        .register-referral-subtitle {
          font-size: 0.875rem;
          color: hsl(var(--foreground) / 0.7);
        }
        
        /* Header */
        .register-header {
          margin-bottom: 2rem;
        }
        
        .register-title {
          position: relative;
          font-size: 2.25rem;
          font-weight: 800;
          font-family: 'Syne', sans-serif;
          color: hsl(var(--foreground));
          margin-bottom: 0.75rem;
          display: inline-block;
        }
        
        .register-title-dot {
          display: inline-block;
          width: 0.5rem;
          height: 0.5rem;
          background: hsl(var(--primary));
          border-radius: 50%;
          margin-left: 0.25rem;
          box-shadow: 0 0 12px hsl(var(--primary));
        }
        
        .register-subtitle {
          font-size: 1.125rem;
          color: hsl(var(--foreground) / 0.7);
        }
        
        /* Error Alert */
        .register-error-alert {
          background: hsl(var(--destructive) / 0.1);
          border: 1px solid hsl(var(--destructive) / 0.3);
          border-radius: 0.75rem;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }
        
        .register-error-text {
          font-size: 0.875rem;
          color: hsl(var(--destructive));
        }
        
        /* Form */
        .register-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        /* Google Button */
        .register-google-btn {
          position: relative;
          width: 100%;
          height: 3.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          font-weight: 600;
          border: 2px solid hsl(var(--border));
          background: hsl(var(--background));
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          overflow: hidden;
        }
        
        .register-google-btn:hover {
          border-color: hsl(var(--primary) / 0.5);
          box-shadow: 0 8px 24px hsl(var(--primary) / 0.1);
        }
        
        .register-google-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, hsl(var(--primary) / 0.1) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s;
        }
        
        .register-google-btn:hover .register-google-glow {
          opacity: 1;
        }
        
        /* Divider */
        .register-divider {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 0.5rem 0;
        }
        
        .register-divider-line {
          flex: 1;
          height: 1px;
          background: hsl(var(--border));
        }
        
        .register-divider-text {
          font-size: 0.75rem;
          text-transform: uppercase;
          color: hsl(var(--foreground) / 0.5);
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        
        /* Form Fields */
        .register-field-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .register-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: hsl(var(--foreground));
        }
        
        .register-input-container {
          position: relative;
        }
        
        .register-input-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          width: 1.25rem;
          height: 1.25rem;
          color: hsl(var(--foreground) / 0.4);
          transition: all 0.3s;
          z-index: 2;
        }
        
        .register-input-icon-active {
          color: hsl(var(--primary));
        }
        
        .register-input {
          height: 3.5rem;
          padding-left: 3rem;
          background: hsl(var(--background));
          border: 2px solid hsl(var(--border));
          border-radius: 0.75rem;
          font-size: 1rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .register-input:focus {
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.1);
          outline: none;
        }
        
        .register-input-error {
          border-color: hsl(var(--destructive));
        }
        
        .register-input-error:focus {
          border-color: hsl(var(--destructive));
          box-shadow: 0 0 0 3px hsl(var(--destructive) / 0.1);
        }
        
        .register-input-focus-ring {
          position: absolute;
          inset: -4px;
          border: 2px solid hsl(var(--primary) / 0.4);
          border-radius: 0.875rem;
          pointer-events: none;
        }
        
        .register-field-hint {
          font-size: 0.75rem;
          color: hsl(var(--foreground) / 0.6);
        }
        
        .register-field-error {
          font-size: 0.875rem;
          color: hsl(var(--destructive));
          font-weight: 500;
        }
        
        /* Submit Button */
        .register-submit-btn {
          position: relative;
          width: 100%;
          height: 3.5rem;
          background: hsl(var(--primary));
          color: black;
          font-weight: 700;
          font-size: 1.125rem;
          border: none;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          margin-top: 0.5rem;
        }
        
        .register-submit-btn:hover:not(:disabled) {
          box-shadow: 
            0 20px 40px hsl(var(--primary) / 0.3),
            0 0 60px hsl(var(--primary) / 0.2);
        }
        
        .register-submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .register-submit-arrow {
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .register-submit-btn:hover:not(:disabled) .register-submit-arrow {
          transform: translateX(4px);
        }
        
        .register-submit-glow {
          position: absolute;
          inset: -100%;
          background: radial-gradient(circle, white 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.3s;
        }
        
        .register-submit-btn:hover:not(:disabled) .register-submit-glow {
          opacity: 0.2;
        }
        
        /* Footer */
        .register-footer {
          text-align: center;
          font-size: 0.875rem;
          color: hsl(var(--foreground) / 0.7);
          margin-top: 2rem;
        }
        
        .register-footer-link {
          color: hsl(var(--primary));
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s;
        }
        
        .register-footer-link:hover {
          text-decoration: underline;
        }
        
        /* Visual Side */
        .register-visual-side {
          display: none;
          position: relative;
          flex: 1;
          background: linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0f0f0f 100%);
          overflow: hidden;
        }
        
        @media (min-width: 1024px) {
          .register-visual-side {
            display: flex;
            align-items: center;
            justify-content: center;
          }
        }
        
        .register-visual-grid {
          position: absolute;
          inset: 0;
          opacity: 0.04;
          background-image: 
            linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px);
          background-size: 80px 80px;
        }
        
        .register-visual-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
        }
        
        .register-visual-orb-1 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%);
          top: 25%;
          left: 25%;
        }
        
        .register-visual-orb-2 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, hsl(160 100% 50%) 0%, transparent 70%);
          bottom: 25%;
          right: 25%;
        }
        
        .register-visual-content {
          position: relative;
          z-index: 10;
          text-align: center;
          padding: 0 3rem;
          max-width: 600px;
        }
        
        /* Visual Badge */
        .register-visual-badge {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: hsl(var(--background) / 0.1);
          backdrop-filter: blur(20px);
          border: 1px solid hsl(var(--primary) / 0.3);
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 600;
          color: hsl(var(--primary));
          margin-bottom: 2rem;
          overflow: hidden;
        }
        
        .register-visual-badge-pulse {
          position: absolute;
          inset: -100%;
          background: radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%);
        }
        
        /* Visual Title */
        .register-visual-title {
          font-size: 3rem;
          font-weight: 800;
          font-family: 'Syne', sans-serif;
          color: white;
          margin-bottom: 1.5rem;
          line-height: 1.2;
        }
        
        .register-visual-title-gradient {
          background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(160 100% 50%) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .register-visual-subtitle {
          font-size: 1.25rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 3rem;
          line-height: 1.6;
        }
        
        /* Benefits List */
        .register-visual-benefits {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          align-items: flex-start;
          max-width: 400px;
          margin: 0 auto;
        }
        
        .register-visual-benefit {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 1rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
        }
        
        .register-visual-benefit-icon {
          width: 2.5rem;
          height: 2.5rem;
          background: hsl(var(--primary) / 0.2);
          border: 1px solid hsl(var(--primary) / 0.3);
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: hsl(var(--primary));
          flex-shrink: 0;
        }
        
        /* Decorative Elements */
        .register-visual-deco {
          position: absolute;
          border: 1px solid hsl(var(--primary) / 0.2);
          border-radius: 50%;
          pointer-events: none;
        }
        
        .register-visual-deco-1 {
          width: 400px;
          height: 400px;
          top: 10%;
          right: -100px;
        }
        
        .register-visual-deco-2 {
          width: 300px;
          height: 300px;
          bottom: 10%;
          left: -80px;
          border-color: hsl(var(--primary) / 0.15);
        }
        
        /* Responsive */
        @media (max-width: 1023px) {
          .register-form-wrapper {
            max-width: 420px;
          }
        }
        
        @media (max-width: 640px) {
          .register-form-side {
            padding: 2rem 1rem;
          }
          
          .register-title {
            font-size: 1.875rem;
          }
        }
      `}</style>
    </>
  );
};

export default Register;