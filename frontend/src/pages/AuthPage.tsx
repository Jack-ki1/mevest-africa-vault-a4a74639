import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Eye, EyeOff, TrendingUp } from 'lucide-react';

export default function AuthPage() {
  const { signIn, signUp, resendConfirmation, resetPassword } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authHint, setAuthHint] = useState<'verify' | 'reset' | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthHint(null);

    if (mode === 'forgot') {
      const { error } = await resetPassword(email);
      setLoading(false);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Check your email', description: 'Password reset link has been sent.' });
        setMode('login');
      }
      return;
    }

    if (mode === 'signup') {
      const { error } = await signUp(email, password, fullName);
      setLoading(false);
      if (error) {
        toast({ title: 'Sign up failed', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Check your email', description: 'Please verify your email address to continue.' });
      }
    } else {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) {
        const message = error.message || 'Please check your email and password.';
        if (/confirm|verify|verified|email/i.test(message)) setAuthHint('verify');
        if (/invalid login credentials|credentials/i.test(message)) setAuthHint('reset');
        toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
      }
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast({ title: 'Email required', description: 'Enter your email address first.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await resendConfirmation(email);
    setLoading(false);
    if (error) {
      toast({ title: 'Could not resend email', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Check your email', description: 'A fresh verification link has been sent.' });
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        toast({ title: 'Google sign-in failed', description: error.message, variant: 'destructive' });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'Google sign-in failed', description: msg || 'Something went wrong', variant: 'destructive' });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-emerald-400 rounded-xl flex items-center justify-center font-display font-extrabold text-xl text-white shadow-lg shadow-primary/30">
              M
            </div>
            <span className="font-display font-bold text-3xl tracking-tight text-foreground">
              Me<span className="text-primary">vest</span>
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            {mode === 'login' ? 'Welcome back to your wealth platform' : mode === 'signup' ? 'Create your investment account' : 'Reset your password'}
          </p>
        </div>

        {/* Form card */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xl">
          {!isSupabaseConfigured() && (
            <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-foreground">
              Supabase is not configured yet. Copy <code className="font-mono">.env.example</code> to{' '}
              <code className="font-mono">.env</code> and set <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>, then restart the dev server.
            </div>
          )}

          {/* Google Sign In */}
          {mode !== 'forgot' && (
            <>
              <button
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg border border-border bg-secondary text-foreground font-medium text-sm hover:bg-muted transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {googleLoading ? 'Signing in...' : 'Continue with Google'}
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Full Name</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
                  className="w-full bg-secondary border border-border rounded-lg px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors" placeholder="John Doe" />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full bg-secondary border border-border rounded-lg px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary transition-colors" placeholder="you@example.com" />
            </div>

            {mode !== 'forgot' && (
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                    className="w-full bg-secondary border border-border rounded-lg px-3.5 py-2.5 pr-10 text-sm text-foreground outline-none focus:border-primary transition-colors" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={() => setMode('forgot')} className="text-xs text-primary hover:underline">
                  Forgot password?
                </button>
                <button type="button" onClick={handleResendConfirmation} disabled={loading} className="text-xs text-primary hover:underline disabled:opacity-50">
                  Resend verification email
                </button>
              </div>
            )}

            {mode === 'login' && authHint && (
              <div className="rounded-lg border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground">
                {authHint === 'verify'
                  ? 'Your email may still need verification. Resend the verification email, then sign in again.'
                  : 'If your account exists but the password is not working, reset it using the link above.'}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm shadow-primary/20">
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>Don't have an account? <button onClick={() => setMode('signup')} className="text-primary font-semibold hover:underline">Sign up</button></>
            ) : (
              <>Already have an account? <button onClick={() => setMode('login')} className="text-primary font-semibold hover:underline">Sign in</button></>
            )}
          </div>
        </div>

        {/* Market ticker */}
        <div className="mt-6 flex items-center justify-center gap-4 text-[10px] text-muted-foreground font-mono">
          <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-primary" /> AAPL +1.2%</span>
          <span>BTC +3.4%</span>
          <span>NSE20 -0.8%</span>
          <span>NVDA +2.1%</span>
        </div>
      </div>
    </div>
  );
}
