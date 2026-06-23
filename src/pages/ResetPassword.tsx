import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from 'react-helmet-async';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Check if we have a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check URL for recovery token
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      if (type === 'recovery' && accessToken) {
        setIsValidSession(true);
      } else if (session) {
        setIsValidSession(true);
      }
      
      setCheckingSession(false);
    };

    checkSession();

    // Listen for auth state changes (recovery link clicked)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
        setCheckingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) {
      return 'הסיסמה חייבת להכיל לפחות 8 תווים';
    }
    if (!/[A-Z]/.test(pass)) {
      return 'הסיסמה חייבת להכיל לפחות אות גדולה באנגלית';
    }
    if (!/[a-z]/.test(pass)) {
      return 'הסיסמה חייבת להכיל לפחות אות קטנה באנגלית';
    }
    if (!/[0-9]/.test(pass)) {
      return 'הסיסמה חייבת להכיל לפחות ספרה אחת';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("הסיסמאות לא תואמות");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err) {
      setError('אירעה שגיאה. נסו שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <>
        <Helmet>
          <title>איפוס סיסמה | סיאנגו</title>
        </Helmet>
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">קישור לא תקין</h1>
            <p className="text-muted-foreground mb-8">
              הקישור לאיפוס הסיסמה פג תוקף או לא תקין. בקשו קישור חדש.
            </p>
            <Button asChild>
              <Link to="/login">
                חזרה להתחברות
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (success) {
    return (
      <>
        <Helmet>
          <title>הסיסמה עודכנה | סיאנגו</title>
        </Helmet>
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">הסיסמה עודכנה בהצלחה!</h1>
            <p className="text-muted-foreground mb-8">
              מעבירים אתכם ללוח הבקרה...
            </p>
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>איפוס סיסמה | סיאנגו</title>
        <meta name="description" content="הזינו סיסמה חדשה לחשבון שלכם" />
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-12 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(280_60%_50%)] flex items-center justify-center shadow-soft">
              <span className="text-lg font-bold text-white">ק</span>
            </div>
            <span className="font-semibold text-xl text-foreground">סיאנגו</span>
          </Link>

          {/* Header */}
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              איפוס סיסמה
            </h1>
            <p className="text-muted-foreground">
              הזינו סיסמה חדשה לחשבון שלכם
            </p>
          </header>

          {error && (
            <div role="alert" className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה חדשה</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 ps-10"
                  dir="ltr"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute start-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                לפחות 8 תווים, אות גדולה, אות קטנה וספרה
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">אישור סיסמה</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 ps-10"
                  dir="ltr"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute start-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showConfirmPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              size="lg" 
              className="w-full btn-premium"
              disabled={!password || !confirmPassword || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  מעדכן...
                </>
              ) : (
                <>
                  עדכן סיסמה
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
