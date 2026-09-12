import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash.includes('type=recovery') || search.includes('type=recovery') || hash.includes('access_token=')) {
      setReady(true);
    }
  }, []);

  const passwordStrength = (() => {
    if (password.length < 12) return { label: 'Too short (min 12)', color: 'text-destructive' };
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNum = /\d/.test(password);
    const hasSym = /[^A-Za-z0-9]/.test(password);
    const score = [hasUpper, hasLower, hasNum, hasSym].filter(Boolean).length;
    if (score <= 2) return { label: 'Weak — add upper, lower, number, symbol', color: 'text-amber-600' };
    if (score === 3) return { label: 'Good', color: 'text-primary' };
    return { label: 'Strong', color: 'text-primary' };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 12) {
      toast({ title: 'Password too short', description: 'Use at least 12 characters.', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', description: 'Please ensure both fields are identical.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Password updated', description: 'You can now sign in with your new password.' });
      window.location.href = '/';
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-foreground mb-2">Invalid Reset Link</h1>
          <p className="text-muted-foreground text-sm">This link is invalid or has expired.</p>
          <a href="/" className="text-primary text-sm hover:underline mt-4 inline-block">Back to login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-card border border-border rounded-2xl p-6">
        <h1 className="font-display font-bold text-xl text-foreground mb-1">Set New Password</h1>
        <p className="text-muted-foreground text-sm mb-6">Enter your new password below.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={12}
            placeholder="New password (min 12 chars)"
            className="w-full bg-secondary border border-border rounded-lg px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          />
          {password && <div className={`text-[11px] ${passwordStrength.color}`}>{passwordStrength.label}</div>}
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            minLength={12}
            placeholder="Confirm new password"
            className="w-full bg-secondary border border-border rounded-lg px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          />
          <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50">
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
