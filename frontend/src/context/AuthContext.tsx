import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: unknown }>;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  resendConfirmation: (email: string) => Promise<{ error: unknown }>;
  resetPassword: (email: string) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Admin bypass — disabled by default. Enabled ONLY when both env vars are explicitly set.
// Fail-closed: no hardcoded fallback password is baked into the bundle.
// Disable globally with VITE_DISABLE_ADMIN_BYPASS=true. In production builds the
// presence of the bypass is flagged in the console as a warning.
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim().toLowerCase() ?? '';
const ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined) ?? '';
const ADMIN_ID = '00000000-0000-0000-0000-admin00000001';
const ADMIN_STORAGE_KEY = 'mevest_admin_session';

export const isAdminBypassEnabled = (() => {
  if (import.meta.env.VITE_DISABLE_ADMIN_BYPASS === 'true') return false;
  return Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);
})();

if (isAdminBypassEnabled && import.meta.env.PROD) {
  console.warn('[Auth] Admin bypass is ENABLED in a production build — ensure credentials are not public and disable via VITE_DISABLE_ADMIN_BYPASS=true if not needed.');
}

function createMockAdminUser(): User {
  const now = new Date().toISOString();
  return {
    id: ADMIN_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: ADMIN_EMAIL,
    email_confirmed_at: now,
    phone: '',
    confirmed_at: now,
    last_sign_in_at: now,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { full_name: 'Mevest Admin', role: 'admin' },
    identities: [],
    created_at: now,
    updated_at: now,
  } as unknown as User;
}

function createMockAdminSession(): Session {
  const user = createMockAdminUser();
  return {
    access_token: 'mock-admin-access-token',
    refresh_token: 'mock-admin-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user,
  } as unknown as Session;
}

function loadAdminSession(): { user: User; session: Session } | null {
  if (!isAdminBypassEnabled) return null;
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { user?: { id?: string }; session?: Session };
    if (parsed?.user?.id === ADMIN_ID && parsed?.session) return parsed as { user: User; session: Session };
  } catch (err) {
    console.warn('[Auth] Failed to load admin session', err);
  }
  return null;
}

function saveAdminSession(user: User, session: Session) {
  if (!isAdminBypassEnabled) return;
  try {
    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify({ user, session }));
  } catch (err) {
    console.warn('[Auth] Failed to save admin session', err);
  }
}

function clearAdminSession() {
  try {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
  } catch (err) {
    console.warn('[Auth] Failed to clear admin session', err);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Check for persisted admin session first — instant login
    const admin = loadAdminSession();
    if (admin) {
      setUser(admin.user);
      setSession(admin.session);
      setLoading(false);
      return;
    }

    // 2. Otherwise follow normal Supabase auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      // Don't overwrite admin session with null from Supabase
      if (loadAdminSession()) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      if (loadAdminSession()) return;
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    // Block admin email from real signup when bypass is enabled
    if (isAdminBypassEnabled && email.trim().toLowerCase() === ADMIN_EMAIL) {
      return { error: { message: 'This email is reserved for admin access. Use Sign In with the admin password.' } };
    }
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();

    // Admin bypass: only when explicitly enabled via env
    if (isAdminBypassEnabled && cleanEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const mockUser = createMockAdminUser();
      const mockSession = createMockAdminSession();
      saveAdminSession(mockUser, mockSession);
      setUser(mockUser);
      setSession(mockSession);
      return { error: null };
    }

    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    return { error };
  };

  const resendConfirmation = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin },
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    // Admin uses mock auth — no reset via Supabase
    if (isAdminBypassEnabled && email.trim().toLowerCase() === ADMIN_EMAIL) {
      return { error: { message: 'Admin password is set via VITE_ADMIN_PASSWORD in .env. Change it there and restart the dev server.' } };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const signOut = async () => {
    if (loadAdminSession()) {
      clearAdminSession();
      setUser(null);
      setSession(null);
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, resendConfirmation, resetPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Exported for testing / optional hint — does not contain password.
export const ADMIN_CREDENTIALS = { email: ADMIN_EMAIL, enabled: isAdminBypassEnabled };
