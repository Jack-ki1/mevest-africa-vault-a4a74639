import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  resendConfirmation: (email: string) => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── Admin bypass — always-login credentials for development / starters ──
// Env overrides allowed, else defaults. Password comparison is case-sensitive,
// email is lower-cased. Stored in localStorage so it survives reloads and
// works even when Supabase is down or email confirmation blocks real users.
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'admin@mevest.africa').toLowerCase();
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'MevestAdmin@2026';
const ADMIN_ID = '00000000-0000-0000-0000-admin00000001';
const ADMIN_STORAGE_KEY = 'mevest_admin_session';

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
  try {
    const raw = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.user?.id === ADMIN_ID && parsed?.session) return parsed;
  } catch {}
  return null;
}

function saveAdminSession(user: User, session: Session) {
  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify({ user, session }));
}

function clearAdminSession() {
  localStorage.removeItem(ADMIN_STORAGE_KEY);
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
    // Block admin email from real signup — it is reserved for mock login
    if (email.trim().toLowerCase() === ADMIN_EMAIL) {
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

    // ── Admin bypass: check before hitting Supabase ──
    if (cleanEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
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
    if (email.trim().toLowerCase() === ADMIN_EMAIL) {
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

// Exported for AuthPage hint / testing
export const ADMIN_CREDENTIALS = { email: ADMIN_EMAIL, hint: 'MevestAdmin@2026 (change via VITE_ADMIN_PASSWORD)' };
