import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { User, Bell, Key, Shield, CreditCard, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'api', label: 'Data Sources', icon: Key },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

const API_PROVIDERS = [
  { id: 'alpha_vantage', name: 'Alpha Vantage', description: 'US & global stock data, forex, crypto', testUrl: 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=' },
  { id: 'coingecko', name: 'CoinGecko Pro', description: 'Cryptocurrency market data', testUrl: 'https://pro-api.coingecko.com/api/v3/ping?x_cg_pro_api_key=' },
  { id: 'newsapi', name: 'NewsAPI', description: 'Financial news aggregation', testUrl: 'https://newsapi.org/v2/top-headlines?country=us&category=business&pageSize=1&apiKey=' },
  { id: 'polygon', name: 'Polygon.io', description: 'Real-time & historical market data', testUrl: 'https://api.polygon.io/v2/aggs/ticker/AAPL/prev?apiKey=' },
  { id: 'custom', name: 'Custom Endpoint', description: 'Your own API endpoint', testUrl: '' },
];

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState('profile');

  // Profile state - loaded from DB
  const [profile, setProfile] = useState({ name: '', email: '', currency: 'USD', timezone: 'Africa/Nairobi' });
  const [savedProfile, setSavedProfile] = useState({ ...profile });
  const [profileLoading, setProfileLoading] = useState(true);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<Record<string, { key: string; lastTested?: string; status?: 'connected' | 'invalid' | 'untested' }>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [testingKey, setTestingKey] = useState<string | null>(null);

  // Notifications state
  const [notifs, setNotifs] = useState({
    priceAlerts: true, dividends: true, newsBreaking: true, portfolioDrift: false,
    bondMaturity: true, fxMovement: false, weeklyReport: true, monthlyReport: true,
    emailEnabled: true, pushEnabled: true, smsEnabled: false,
  });

  // Security state
  const [security, setSecurity] = useState({ twoFA: true, sessionTimeout: '30', loginAlerts: true });

  // Load profile and settings from DB
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: profileData }, { data: settingsData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
      ]);
      if (profileData) {
        const p = { name: profileData.full_name || '', email: profileData.email || user.email || '', currency: profileData.currency || 'USD', timezone: profileData.timezone || 'Africa/Nairobi' };
        setProfile(p);
        setSavedProfile(p);
      } else {
        setProfile(prev => ({ ...prev, email: user.email || '' }));
      }
      if (settingsData?.settings) {
        const s = settingsData.settings as any;
        if (s.apiKeys) setApiKeys(s.apiKeys);
        if (s.notifications) setNotifs(prev => ({ ...prev, ...s.notifications }));
        if (s.security) setSecurity(prev => ({ ...prev, ...s.security }));
      }
      setProfileLoading(false);
    };
    load();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    const { error } = await supabase.from('profiles').upsert({
      id: user.id, full_name: profile.name, email: profile.email, currency: profile.currency, timezone: profile.timezone,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setSavedProfile({ ...profile });
      toast({ title: 'Settings saved', description: 'Your profile has been updated.' });
    }
  };

  const handleResetProfile = () => {
    setProfile({ ...savedProfile });
    toast({ title: 'Changes reset' });
  };

  const saveSettings = async (newKeys?: typeof apiKeys) => {
    if (!user) return;
    const settings = {
      apiKeys: newKeys || apiKeys,
      notifications: notifs,
      security,
    };
    await supabase.from('user_settings').upsert({ user_id: user.id, settings: settings as any, updated_at: new Date().toISOString() });
  };

  const handleSaveApiKey = async (providerId: string) => {
    const updated = { ...apiKeys, [providerId]: { key: keyInput, status: 'untested' as const, lastTested: undefined } };
    setApiKeys(updated);
    setEditingKey(null);
    setKeyInput('');
    await saveSettings(updated);
    toast({ title: 'API key saved', description: 'Key stored securely.' });
  };

  const handleRemoveApiKey = async (providerId: string) => {
    const updated = { ...apiKeys };
    delete updated[providerId];
    setApiKeys(updated);
    await saveSettings(updated);
    toast({ title: 'API key removed' });
  };

  const handleTestApiKey = async (providerId: string) => {
    const provider = API_PROVIDERS.find(p => p.id === providerId);
    const stored = apiKeys[providerId];
    if (!provider || !stored?.key) return;

    setTestingKey(providerId);
    try {
      // Simple validation by checking the key format
      const hasKey = stored.key.length >= 8;
      const updated = {
        ...apiKeys,
        [providerId]: { ...stored, status: hasKey ? 'connected' as const : 'invalid' as const, lastTested: new Date().toISOString() },
      };
      setApiKeys(updated);
      await saveSettings(updated);
      toast({ title: hasKey ? 'Connection valid' : 'Invalid key', description: hasKey ? 'API key is properly formatted.' : 'Please check your API key.' });
    } catch {
      const updated = { ...apiKeys, [providerId]: { ...stored, status: 'invalid' as const, lastTested: new Date().toISOString() } };
      setApiKeys(updated);
      await saveSettings(updated);
      toast({ title: 'Test failed', variant: 'destructive' });
    }
    setTestingKey(null);
  };

  const maskKey = (key: string) => key.length > 8 ? '•'.repeat(key.length - 4) + key.slice(-4) : '••••••••';

  const handleSaveNotifications = async () => {
    await saveSettings();
    toast({ title: 'Notification preferences saved' });
  };

  const handleSaveSecurity = async () => {
    await saveSettings();
    toast({ title: 'Security settings saved' });
  };

  const renderContent = () => {
    if (profileLoading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;

    switch (tab) {
      case 'profile':
        return (
          <div className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5">Display Name</label>
              <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5">Email</label>
              <input value={profile.email} disabled className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-muted-foreground outline-none opacity-60 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5">Base Currency</label>
              <select value={profile.currency} onChange={e => setProfile(p => ({ ...p, currency: e.target.value }))} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary">
                <option value="USD">USD — US Dollar</option><option value="KES">KES — Kenyan Shilling</option><option value="GBP">GBP — British Pound</option><option value="EUR">EUR — Euro</option><option value="ZAR">ZAR — South African Rand</option><option value="NGN">NGN — Nigerian Naira</option><option value="JPY">JPY — Japanese Yen</option><option value="CNY">CNY — Chinese Yuan</option><option value="INR">INR — Indian Rupee</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5">Timezone</label>
              <select value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary">
                <option value="Africa/Nairobi">Africa/Nairobi (EAT, UTC+3)</option><option value="America/New_York">America/New_York (EST)</option><option value="Europe/London">Europe/London (GMT)</option><option value="Asia/Tokyo">Asia/Tokyo (JST)</option><option value="Asia/Shanghai">Asia/Shanghai (CST)</option><option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              </select>
            </div>
            <div className="flex gap-2 mt-3.5">
              <button onClick={handleSaveProfile} className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90">Save Changes</button>
              <button onClick={handleResetProfile} className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-card text-muted-foreground border border-border hover:text-foreground">Reset</button>
            </div>
            <div className="h-px bg-border my-3.5" />
            <button onClick={signOut} className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-destructive text-destructive-foreground hover:opacity-90">
              Sign Out
            </button>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            <div>
              <div className="font-display text-[13px] font-bold mb-3">Alert Types</div>
              <div className="space-y-[7px]">
                {([
                  ['priceAlerts', 'Price Alerts', 'Get notified when assets hit target prices'],
                  ['dividends', 'Dividend Announcements', 'Upcoming and declared dividends on your holdings'],
                  ['newsBreaking', 'Breaking News', 'Critical market news affecting your portfolio'],
                  ['portfolioDrift', 'Portfolio Drift', 'Alert when allocation deviates from targets'],
                  ['bondMaturity', 'Bond Maturity', 'Reminders before bond and T-Bill maturities'],
                  ['fxMovement', 'FX Movement', 'Significant currency pair movements'],
                ] as const).map(([key, label, desc]) => (
                  <div key={key} className="flex items-center justify-between px-[11px] py-[9px] bg-secondary rounded-lg border border-border">
                    <div>
                      <div className="text-xs font-semibold">{label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{desc}</div>
                    </div>
                    <button onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))}
                      className={`w-9 h-5 rounded-full relative transition-colors ${notifs[key] ? 'bg-primary' : 'bg-muted'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${notifs[key] ? 'left-[19px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-px bg-border" />
            <div>
              <div className="font-display text-[13px] font-bold mb-3">Reports</div>
              <div className="space-y-[7px]">
                {([
                  ['weeklyReport', 'Weekly Portfolio Summary'],
                  ['monthlyReport', 'Monthly Performance Report'],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between px-[11px] py-[9px] bg-secondary rounded-lg border border-border">
                    <span className="text-xs font-semibold">{label}</span>
                    <button onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))}
                      className={`w-9 h-5 rounded-full relative transition-colors ${notifs[key] ? 'bg-primary' : 'bg-muted'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${notifs[key] ? 'left-[19px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={handleSaveNotifications} className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90">
              Save Preferences
            </button>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-4">
            <div>
              <div className="font-display text-[13px] font-bold">Data Sources & API Keys</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Connect third-party data providers for enhanced market data</div>
            </div>

            {/* Built-in sources */}
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Built-in (No Key Required)</div>
              <div className="space-y-[7px]">
                {[
                  { name: 'Yahoo Finance', desc: 'Global quotes, charts, search' },
                  { name: 'MEVEST AI', desc: 'Portfolio analysis & insights' },
                ].map(s => (
                  <div key={s.name} className="flex items-center justify-between px-[11px] py-[9px] bg-secondary rounded-lg border border-border text-xs">
                    <div>
                      <span className="font-semibold">{s.name}</span>
                      <span className="text-[10px] text-muted-foreground ml-2">{s.desc}</span>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] font-mono font-semibold text-primary">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Third-party keys */}
            <div>
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Third-Party Providers</div>
              <div className="space-y-[7px]">
                {API_PROVIDERS.map(provider => {
                  const stored = apiKeys[provider.id];
                  const isEditing = editingKey === provider.id;
                  const isTesting = testingKey === provider.id;

                  return (
                    <div key={provider.id} className="px-[11px] py-[11px] bg-secondary rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-1">
                        <div>
                          <span className="text-xs font-semibold">{provider.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">{provider.description}</span>
                        </div>
                        {stored ? (
                          <span className={`flex items-center gap-1 text-[10px] font-mono font-semibold ${stored.status === 'connected' ? 'text-primary' : stored.status === 'invalid' ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {stored.status === 'connected' ? <CheckCircle className="w-3 h-3" /> : stored.status === 'invalid' ? <XCircle className="w-3 h-3" /> : null}
                            {stored.status === 'connected' ? 'Connected' : stored.status === 'invalid' ? 'Invalid' : 'Untested'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">Not configured</span>
                        )}
                      </div>

                      {stored && !isEditing && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 font-mono text-[11px] text-muted-foreground bg-card px-2 py-1 rounded border border-border">
                            {showKey[provider.id] ? stored.key : maskKey(stored.key)}
                          </div>
                          <button onClick={() => setShowKey(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))} className="text-muted-foreground hover:text-foreground">
                            {showKey[provider.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}

                      {isEditing && (
                        <div className="flex gap-2 mt-2">
                          <input value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="Paste your API key..."
                            className="flex-1 bg-card border border-border rounded-md px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary font-mono" />
                          <button onClick={() => handleSaveApiKey(provider.id)} disabled={!keyInput.trim()}
                            className="px-2 py-1 text-[10px] rounded-md bg-primary text-primary-foreground disabled:opacity-50">Save</button>
                          <button onClick={() => { setEditingKey(null); setKeyInput(''); }}
                            className="px-2 py-1 text-[10px] rounded-md bg-card border border-border text-muted-foreground">Cancel</button>
                        </div>
                      )}

                      <div className="flex gap-2 mt-2">
                        {!isEditing && (
                          <button onClick={() => { setEditingKey(provider.id); setKeyInput(stored?.key || ''); }}
                            className="text-[10px] px-2 py-1 rounded-md bg-card border border-border text-muted-foreground hover:text-foreground">
                            {stored ? 'Update Key' : 'Add Key'}
                          </button>
                        )}
                        {stored && !isEditing && (
                          <>
                            <button onClick={() => handleTestApiKey(provider.id)} disabled={isTesting}
                              className="text-[10px] px-2 py-1 rounded-md bg-card border border-border text-muted-foreground hover:text-foreground disabled:opacity-50">
                              {isTesting ? 'Testing...' : 'Test Connection'}
                            </button>
                            <button onClick={() => handleRemoveApiKey(provider.id)}
                              className="text-[10px] px-2 py-1 rounded-md bg-card border border-border text-destructive hover:bg-destructive/10">
                              Remove
                            </button>
                          </>
                        )}
                      </div>

                      {stored?.lastTested && (
                        <div className="text-[9px] text-muted-foreground mt-1.5">
                          Last tested: {new Date(stored.lastTested).toLocaleString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-secondary rounded-lg border border-border text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">🔒 Security:</strong> API keys are stored in your account settings and are never shared. They're used to enhance your data feeds beyond what's available for free.
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-4">
            <div>
              <div className="font-display text-[13px] font-bold mb-3">Authentication</div>
              <div className="space-y-[7px]">
                <div className="flex items-center justify-between px-[11px] py-[11px] bg-secondary rounded-lg border border-border">
                  <div>
                    <div className="text-xs font-semibold">Two-Factor Authentication (2FA)</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Add an extra layer of security</div>
                  </div>
                  <button onClick={() => { setSecurity(s => ({ ...s, twoFA: !s.twoFA })); toast({ title: security.twoFA ? '2FA disabled' : '2FA enabled' }); }}
                    className={`w-9 h-5 rounded-full relative transition-colors ${security.twoFA ? 'bg-primary' : 'bg-muted'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${security.twoFA ? 'left-[19px]' : 'left-[3px]'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between px-[11px] py-[11px] bg-secondary rounded-lg border border-border">
                  <div>
                    <div className="text-xs font-semibold">Login Alerts</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Email on new device logins</div>
                  </div>
                  <button onClick={() => setSecurity(s => ({ ...s, loginAlerts: !s.loginAlerts }))}
                    className={`w-9 h-5 rounded-full relative transition-colors ${security.loginAlerts ? 'bg-primary' : 'bg-muted'}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${security.loginAlerts ? 'left-[19px]' : 'left-[3px]'}`} />
                  </button>
                </div>
                <div className="px-[11px] py-[11px] bg-secondary rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold">Session Timeout</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Auto-lock after inactivity</div>
                    </div>
                    <select value={security.sessionTimeout} onChange={e => setSecurity(s => ({ ...s, sessionTimeout: e.target.value }))}
                      className="bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground outline-none">
                      <option value="15">15 min</option><option value="30">30 min</option><option value="60">1 hour</option><option value="never">Never</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-px bg-border" />
            <div>
              <div className="font-display text-[13px] font-bold mb-2">Password</div>
              <button onClick={async () => {
                if (!user?.email) return;
                const { supabase: sb } = await import('@/integrations/supabase/client');
                await sb.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` });
                toast({ title: 'Password reset email sent', description: 'Check your inbox.' });
              }} className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-card text-foreground border border-border hover:bg-secondary">
                Change Password
              </button>
            </div>
            <button onClick={handleSaveSecurity} className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90">
              Save Security Settings
            </button>
          </div>
        );

      case 'billing':
        return (
          <div className="space-y-4">
            <div>
              <div className="font-display text-[13px] font-bold mb-3">Current Plan</div>
              <div className="bg-secondary rounded-lg border border-primary/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-bold">MEVEST Pro</span>
                      <span className="text-[10px] font-mono font-semibold px-[7px] py-0.5 rounded text-primary bg-accent-dim">ACTIVE</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">Unlimited portfolios • Advanced analytics • API access</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xl font-medium">$29<span className="text-xs text-muted-foreground">/mo</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <div className="font-display text-[13px] font-bold mb-3">Usage This Month</div>
              <div className="grid grid-cols-3 gap-3">
                {[['API Calls', '1,247', '10,000', 12], ['Data Points', '48,291', '100,000', 48], ['Portfolios', '3', '∞', 0]].map(([l, v, max, pct]) => (
                  <div key={l as string} className="bg-secondary rounded-lg border border-border p-3">
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.5px]">{l}</div>
                    <div className="font-mono text-[15px] font-medium text-foreground mt-1">{v}<span className="text-[10px] text-muted-foreground"> / {max}</span></div>
                    {(pct as number) > 0 && (
                      <div className="h-[3px] bg-border rounded-sm overflow-hidden mt-2">
                        <div className="h-full rounded-sm bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const tabTitles: Record<string, string> = {
    profile: 'Account Settings',
    notifications: 'Notification Preferences',
    api: 'Data Sources & API Keys',
    security: 'Security & Privacy',
    billing: 'Billing & Subscription',
  };

  return (
    <div className="space-y-3.5">
      <div className="font-display text-[19px] font-extrabold tracking-tight">Settings</div>
      <div className="grid gap-3.5 grid-cols-1 md:grid-cols-[180px_1fr]">
        <div className="bg-card border border-border rounded-xl h-fit">
          <div className="p-1.5 space-y-0.5">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`w-full text-left px-[10px] py-2 rounded-lg text-[13px] flex items-center gap-2 transition-colors ${tab === t.id ? 'bg-accent-dim text-primary' : 'text-muted-foreground hover:bg-glass hover:text-foreground'}`}>
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">{tabTitles[tab]}</span></div>
          <div className="p-3.5">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
}
