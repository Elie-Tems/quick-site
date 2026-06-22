import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from 'react-helmet-async';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, Eye, EyeOff } from "lucide-react";

interface FormErrors {
  email?: string;
  password?: string;
}

const Login = () => {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const { t, dir } = useLanguage();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const isHebrew = dir === 'rtl';
  
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Honeypot field for anti-spam
  const honeypotRef = useRef<HTMLInputElement>(null);
  
  // Rate limiting
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = t('login.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('login.emailInvalid');
    }
    
    if (!formData.password) {
      newErrors.password = t('login.passwordRequired');
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
    
    // Rate limiting - prevent too many attempts
    if (loginAttempts >= 5) {
      setSubmitError(t('login.tooManyAttempts'));
      return;
    }
    
    // Rate limiting - prevent submitting more than once every 2 seconds
    const now = Date.now();
    if (now - lastSubmitTime < 2000) {
      return;
    }
    setLastSubmitTime(now);
    
    if (!validate()) {
      return;
    }
    
    setIsLoading(true);
    setLoginAttempts(prev => prev + 1);
    
    try {
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setSubmitError(t('login.invalidCredentials'));
        } else {
          setSubmitError(error.message);
        }
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setSubmitError(t('login.genericError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitError("");
    setIsGoogleLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        if (error.message.includes('popup')) {
          setSubmitError(t('login.popupBlocked') || 'אנא אפשר חלונות קופצים בדפדפן');
        } else {
          setSubmitError(t('login.googleError'));
        }
        console.error("Google sign in error:", error);
      }
    } catch (err) {
      setSubmitError(t('login.googleError'));
      console.error("Google sign in error:", err);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotPasswordEmail)) {
      return;
    }
    
    setForgotPasswordLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        console.error('Reset password error:', error);
      }
      
      // Always show success to prevent email enumeration
      setForgotPasswordSuccess(true);
    } catch (err) {
      console.error('Reset password error:', err);
      setForgotPasswordSuccess(true);
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const isValid = formData.email && formData.password;

  return (
    <>
      <Helmet>
        <title>{t('login.pageTitle')}</title>
        <meta name="description" content={t('login.pageDescription')} />
      </Helmet>

      <div className="theme-refined min-h-screen bg-background flex flex-col lg:flex-row" dir={dir} style={{ fontFamily: isHebrew ? 'Heebo, sans-serif' : undefined }}>
        {/* Left side - Form */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12">
          <div className="w-full max-w-md">
            {/* Header */}
            <header className="mb-6 sm:mb-8">
              <div className="mb-2">
                <img 
                  src="/logo-dark-bg.png" 
                  alt="Logo" 
                  className="login-logo"
                  style={{ maxWidth: '200px', height: 'auto' }}
                />
              </div>
              <p className="text-muted-foreground">
                {t('login.welcome')}
              </p>
            </header>

            {/* Forgot Password Modal */}
            {showForgotPassword && (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-xl">
                  {forgotPasswordSuccess ? (
                    <div className="text-center">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-2">{t('login.checkYourEmail')}</h3>
                      <p className="text-muted-foreground mb-6">
                        {t('login.resetEmailSent')}
                      </p>
                      <Button
                        onClick={() => {
                          setShowForgotPassword(false);
                          setForgotPasswordSuccess(false);
                          setForgotPasswordEmail("");
                        }}
                        className="w-full"
                      >
                        {t('login.backToLogin')}
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold text-foreground mb-2">{t('login.forgotPasswordTitle')}</h3>
                      <p className="text-muted-foreground mb-6">
                        {t('login.forgotPasswordDescription')}
                      </p>
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="forgot-email">{t('login.email')}</Label>
                          <Input
                            id="forgot-email"
                            type="email"
                            placeholder="example@email.com"
                            value={forgotPasswordEmail}
                            onChange={(e) => setForgotPasswordEmail(e.target.value)}
                            className="h-12"
                            dir="ltr"
                            required
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowForgotPassword(false);
                              setForgotPasswordEmail("");
                            }}
                            className="flex-1"
                          >
                            {t('common.cancel')}
                          </Button>
                          <Button
                            type="submit"
                            disabled={forgotPasswordLoading || !forgotPasswordEmail.trim()}
                            className="flex-1"
                          >
                            {forgotPasswordLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              t('login.sendResetLink')
                            )}
                          </Button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            )}

            {submitError && (
              <div role="alert" className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-destructive">{submitError}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5" noValidate>
              {/* Google Sign In */}
              <Button
                type="button"
                variant="outline"
                size="xl"
                className="w-full gap-3"
                onClick={handleGoogleSignIn}
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
                {t('login.googleSignIn')}
              </Button>

              <div className="relative my-4 sm:my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">{t('common.or')}</span>
                </div>
              </div>
              {/* Honeypot field - hidden from users, without affecting layout */}
              <div className="sr-only" aria-hidden="true">
                <label htmlFor="company">Company</label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  ref={honeypotRef}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('login.email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="example@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  className={`h-12 ${errors.email ? 'border-destructive' : ''}`}
                  dir="ltr"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  required
                />
                {errors.email && (
                  <p id="email-error" className="text-sm text-destructive" role="alert">
                    {errors.email}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('login.password')}</Label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    {t('login.forgotPassword')}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className={`h-12 ps-10 ${errors.password ? 'border-destructive' : ''}`}
                    dir="ltr"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute start-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="text-sm text-destructive" role="alert">
                    {errors.password}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                variant="hero" 
                size="xl" 
                className="w-full mt-4 sm:mt-6"
                disabled={!isValid || isLoading}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('login.submitting')}
                  </>
                ) : (
                  <>
                    {t('login.submit')}
                    <Arrow className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Footer */}
            <p className="text-center text-sm text-muted-foreground mt-6 sm:mt-8">
              {t('login.noAccount')}{" "}
              <Link to="/register" className="text-primary hover:underline font-medium">
                {t('login.registerNow')}
              </Link>
            </p>
          </div>
        </div>

        {/* Right side - Visual */}
        <div className="hidden lg:flex flex-1 items-center justify-center bg-gradient-to-br from-[hsl(240_20%_8%)] via-[hsl(252_30%_12%)] to-[hsl(280_25%_10%)] relative overflow-hidden">
          <div className="absolute inset-0 pattern-grid opacity-10" aria-hidden="true" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px]" aria-hidden="true" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[hsl(280_60%_50%_/_0.15)] rounded-full blur-[100px]" aria-hidden="true" />
          
          <div className="relative text-center px-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm mb-8">
              <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium text-white/80">{t('login.welcomeBack')}</span>
            </div>
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: isHebrew ? 'Heebo, sans-serif' : undefined }}>
              {t('login.manageYourBusiness')}
              <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-[hsl(280_60%_60%)]">
                {t('login.inOnePlace')}
              </span>
            </h2>
            <p className="text-white/60 text-lg max-w-md mx-auto">
              {t('login.dashboardDescription')}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;
