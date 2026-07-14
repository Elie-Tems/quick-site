import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getStoredUtm } from '@/lib/utmCapture';
import { setActiveBusinessId } from '@/lib/activeBusiness';
import { gtm } from '@/lib/gtm';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    metadata?: {
      full_name?: string;
      business_name?: string;
      referred_by?: string;
      signup_method?: string;
      preferred_language?: string;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_content?: string;
    }
  ) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        // Backfill signup attribution into user_metadata once (covers email +
        // Google + pre-existing users): the language for localized emails, and
        // the first-touch UTM for Siango's acquisition tracking. One write, and
        // the guards prevent a loop on the resulting USER_UPDATED.
        if (session?.user) {
          try {
            const meta = session.user.user_metadata || {};
            const patch: Record<string, string> = {};
            if (!meta.preferred_language) patch.preferred_language = localStorage.getItem("Siango-language") || "he";
            if (!meta.utm_source) {
              const utm = getStoredUtm();
              if (utm.utm_source) {
                patch.utm_source = utm.utm_source;
                if (utm.utm_medium) patch.utm_medium = utm.utm_medium;
                if (utm.utm_campaign) patch.utm_campaign = utm.utm_campaign;
                if (utm.utm_content) patch.utm_content = utm.utm_content;
              }
            }
            if (Object.keys(patch).length) void supabase.auth.updateUser({ data: patch });
          } catch { /* non-fatal */ }
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (
    email: string, 
    password: string, 
    metadata?: {
      full_name?: string;
      business_name?: string;
      referred_by?: string;
      signup_method?: string;
      preferred_language?: string;
      utm_source?: string;
      utm_medium?: string;
      utm_campaign?: string;
      utm_content?: string;
    }
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: metadata,
      },
    });
    if (!error) gtm.signUp(metadata?.signup_method ?? "email");
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // Clean slate so the NEXT login doesn't inherit stale data: drop every cached query
    // (profile/business/etc.) and forget the active-site selection. Without this, leftover
    // state leaked across sessions in the same tab (and could bounce a returning user to
    // onboarding). Fresh queries run for the newly signed-in user.
    setActiveBusinessId(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
