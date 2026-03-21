import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { User, Bell, Key, Shield, CreditCard } from 'lucide-react';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'api', label: 'API Keys', icon: Key },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'billing', label: 'Billing', icon: CreditCard },
];

export default function SettingsPage() {
  const [tab, setTab] = useState('profile');

  // Profile state
  const [profile, setProfile] = useState({ name: 'Alex Kamau', email: 'alex@mevest.io', currency: 'USD', timezone: 'Africa/Nairobi' });
  const [savedProfile, setSavedProfile] = useState({ ...profile });

  // Notifications state
  const [notifs, setNotifs] = useState({
    priceAlerts: true, dividends: true, newsBreaking: true, portfolioDrift: false,
    bondMaturity: true, fxMovement: false, weeklyReport: true, monthlyReport: true,
    emailEnabled: true, pushEnabled: true, smsEnabled: false,
  });

  // API Keys state
  const [apiKeys, setApiKeys] = useState([
    { id: '1', name: 'Production Key', key: 'mv_live_***************8a2f', created: '2025-01-15', lastUsed: '2 hours ago', status: 'active' as const },
    { id: '2', name: 'Development Key', key: 'mv_test_***************c4d1', created: '2025-02-20', lastUsed: '3 days ago', status: 'active' as const },
  ]);

  // Security state
  const [security, setSecurity] = useState({ twoFA: true, sessionTimeout: '30', loginAlerts: true, ipWhitelist: false });
  const [sessions] = useState([
    { device: 'Chrome on macOS', ip: '102.89.xx.xx', location: 'Nairobi, KE', lastActive: 'Now', current: true },
    { device: 'Safari on iPhone', ip: '102.89.xx.xx', location: 'Nairobi, KE', lastActive: '2h ago', current: false },
    { device: 'Firefox on Windows', ip: '41.204.xx.xx', location: 'Mombasa, KE', lastActive: '5d ago', current: false },
  ]);

  const sources = [
    { name: 'Yahoo Finance', status: 'Connected' },
    { name: 'CoinGecko API', status: 'Connected' },
    { name: 'Alpha Vantage', status: 'Configure' },
    { name: 'NewsAPI', status: 'Connected' },
    { name: 'NSE Kenya Data', status: 'Connected' },
  ];

  const handleSaveProfile = () => {
    setSavedProfile({ ...profile });
    toast({ title: 'Settings saved', description: 'Your profile has been updated successfully.' });
  };

  const handleResetProfile = () => {
    setProfile({ ...savedProfile });
    toast({ title: 'Changes reset', description: 'Profile reverted to last saved state.' });
  };

  const handleGenerateKey = () => {
    const newKey = {
      id: String(Date.now()),
      name: `API Key ${apiKeys.length + 1}`,
      key: `mv_live_${Math.random().toString(36).slice(2, 18)}`,
      created: new Date().toISOString().split('T')[0],
      lastUsed: 'Never',
      status: 'active' as const,
    };
    setApiKeys(prev => [...prev, newKey]);
    toast({ title: 'API key generated', description: 'New key has been created. Store it securely.' });
  };

  const handleRevokeKey = (id: string) => {
    setApiKeys(prev => prev.filter(k => k.id !== id));
    toast({ title: 'API key revoked', description: 'The key has been permanently revoked.' });
  };

  const handleRevokeSession = (idx: number) => {
    toast({ title: 'Session revoked', description: `Session on ${sessions[idx].device} has been terminated.` });
  };

  const renderContent = () => {
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
              <input value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5">Base Currency</label>
              <select value={profile.currency} onChange={e => setProfile(p => ({ ...p, currency: e.target.value }))} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary">
                <option value="USD">USD — US Dollar</option><option value="KES">KES — Kenyan Shilling</option><option value="GBP">GBP — British Pound</option><option value="EUR">EUR — Euro</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5">Timezone</label>
              <select value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary">
                <option value="Africa/Nairobi">Africa/Nairobi (EAT, UTC+3)</option><option value="America/New_York">America/New_York (EST)</option><option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>
            <div className="flex gap-2 mt-3.5">
              <button onClick={handleSaveProfile} className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90">Save Changes</button>
              <button onClick={handleResetProfile} className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-card text-muted-foreground border border-border hover:text-foreground">Reset</button>
            </div>
            <div className="h-px bg-border my-3.5" />
            <div className="font-display text-[13px] font-bold mb-[11px]">Connected Data Sources</div>
            <div className="space-y-[7px]">
              {sources.map(s => (
                <div key={s.name} className="flex items-center justify-between px-[11px] py-[9px] bg-secondary rounded-lg border border-border text-xs">
                  <span className="font-semibold">{s.name}</span>
                  <span className={`font-mono text-[10px] font-semibold px-[7px] py-0.5 rounded ${s.status === 'Connected' ? 'text-primary bg-accent-dim' : 'text-muted-foreground bg-glass'}`}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
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
                  ['fxMovement', 'FX Movement', 'Significant currency pair movements (KES/USD, etc.)'],
                ] as const).map(([key, label, desc]) => (
                  <div key={key} className="flex items-center justify-between px-[11px] py-[9px] bg-secondary rounded-lg border border-border">
                    <div>
                      <div className="text-xs font-semibold">{label}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{desc}</div>
                    </div>
                    <button
                      onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))}
                      className={`w-9 h-5 rounded-full relative transition-colors ${notifs[key] ? 'bg-primary' : 'bg-muted'}`}
                    >
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
                    <button
                      onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))}
                      className={`w-9 h-5 rounded-full relative transition-colors ${notifs[key] ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${notifs[key] ? 'left-[19px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-border" />

            <div>
              <div className="font-display text-[13px] font-bold mb-3">Delivery Channels</div>
              <div className="space-y-[7px]">
                {([
                  ['emailEnabled', 'Email Notifications', 'alex@mevest.io'],
                  ['pushEnabled', 'Push Notifications', 'Browser & mobile'],
                  ['smsEnabled', 'SMS Notifications', '+254 7** *** ***'],
                ] as const).map(([key, label, sub]) => (
                  <div key={key} className="flex items-center justify-between px-[11px] py-[9px] bg-secondary rounded-lg border border-border">
                    <div>
                      <div className="text-xs font-semibold">{label}</div>
                      <div className="text-[10px] text-muted-foreground">{sub}</div>
                    </div>
                    <button
                      onClick={() => setNotifs(n => ({ ...n, [key]: !n[key] }))}
                      className={`w-9 h-5 rounded-full relative transition-colors ${notifs[key] ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${notifs[key] ? 'left-[19px]' : 'left-[3px]'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => toast({ title: 'Notification preferences saved', description: 'Your alert settings have been updated.' })}
              className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90"
            >
              Save Preferences
            </button>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-display text-[13px] font-bold">API Keys</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Manage keys for programmatic access to your MEVEST data</div>
              </div>
              <button onClick={handleGenerateKey} className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90">
                + Generate Key
              </button>
            </div>

            <div className="space-y-[7px]">
              {apiKeys.map(k => (
                <div key={k.id} className="px-[11px] py-[11px] bg-secondary rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{k.name}</span>
                      <span className="text-[10px] font-mono font-semibold px-[7px] py-0.5 rounded text-primary bg-accent-dim">ACTIVE</span>
                    </div>
                    <button onClick={() => handleRevokeKey(k.id)} className="text-[11px] px-2 py-1 rounded-md bg-card border border-border text-destructive hover:bg-destructive/10">
                      Revoke
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground bg-card px-2 py-1 rounded border border-border mb-1.5">{k.key}</div>
                  <div className="flex gap-3 text-[10px] text-muted-foreground">
                    <span>Created: {k.created}</span>
                    <span>Last used: {k.lastUsed}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="h-px bg-border" />

            <div>
              <div className="font-display text-[13px] font-bold mb-2">API Usage</div>
              <div className="grid grid-cols-3 gap-3">
                {[['Requests Today', '1,247 / 10,000'], ['Rate Limit', '100 req/min'], ['Data Points', '48,291']].map(([l, v]) => (
                  <div key={l} className="bg-secondary rounded-lg border border-border p-3">
                    <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.5px]">{l}</div>
                    <div className="font-mono text-[15px] font-medium text-foreground mt-1">{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-secondary rounded-lg border border-border text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">⚠ Security Notice:</strong> API keys grant access to your portfolio data. Never share keys publicly or commit them to version control. Rotate keys periodically.
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
                    <div className="text-[10px] text-muted-foreground mt-0.5">Add an extra layer of security to your account</div>
                  </div>
                  <button
                    onClick={() => {
                      setSecurity(s => ({ ...s, twoFA: !s.twoFA }));
                      toast({ title: security.twoFA ? '2FA disabled' : '2FA enabled', description: security.twoFA ? 'Two-factor authentication has been turned off.' : 'Your account is now more secure.' });
                    }}
                    className={`w-9 h-5 rounded-full relative transition-colors ${security.twoFA ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${security.twoFA ? 'left-[19px]' : 'left-[3px]'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between px-[11px] py-[11px] bg-secondary rounded-lg border border-border">
                  <div>
                    <div className="text-xs font-semibold">Login Alerts</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">Email notification on new device logins</div>
                  </div>
                  <button
                    onClick={() => setSecurity(s => ({ ...s, loginAlerts: !s.loginAlerts }))}
                    className={`w-9 h-5 rounded-full relative transition-colors ${security.loginAlerts ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${security.loginAlerts ? 'left-[19px]' : 'left-[3px]'}`} />
                  </button>
                </div>

                <div className="px-[11px] py-[11px] bg-secondary rounded-lg border border-border">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold">Session Timeout</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Auto-lock after inactivity</div>
                    </div>
                    <select
                      value={security.sessionTimeout}
                      onChange={e => setSecurity(s => ({ ...s, sessionTimeout: e.target.value }))}
                      className="bg-card border border-border rounded-md px-2 py-1 text-xs text-foreground outline-none"
                    >
                      <option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 hour</option><option value="never">Never</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div>
              <div className="font-display text-[13px] font-bold mb-3">Active Sessions</div>
              <div className="space-y-[7px]">
                {sessions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between px-[11px] py-[9px] bg-secondary rounded-lg border border-border">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${s.current ? 'bg-primary' : 'bg-muted-foreground'}`} />
                      <div>
                        <div className="text-xs font-semibold">{s.device} {s.current && <span className="text-primary text-[10px]">(Current)</span>}</div>
                        <div className="text-[10px] text-muted-foreground">{s.ip} • {s.location} • {s.lastActive}</div>
                      </div>
                    </div>
                    {!s.current && (
                      <button onClick={() => handleRevokeSession(i)} className="text-[11px] px-2 py-1 rounded-md bg-card border border-border text-destructive hover:bg-destructive/10">
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-border" />

            <div>
              <div className="font-display text-[13px] font-bold mb-2">Password</div>
              <button
                onClick={() => toast({ title: 'Password reset email sent', description: 'Check your inbox for a link to reset your password.' })}
                className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-card text-foreground border border-border hover:bg-secondary"
              >
                Change Password
              </button>
            </div>

            <button
              onClick={() => toast({ title: 'Security settings saved', description: 'Your security preferences have been updated.' })}
              className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90"
            >
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
                    <div className="text-[11px] text-muted-foreground mt-1">Unlimited portfolios • Advanced analytics • API access • Priority support</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xl font-medium">$29<span className="text-xs text-muted-foreground">/mo</span></div>
                    <div className="text-[10px] text-muted-foreground">Billed annually</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="font-display text-[13px] font-bold mb-3">Usage This Month</div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['API Calls', '1,247', '10,000', 12],
                  ['Data Points', '48,291', '100,000', 48],
                  ['Portfolios', '3', '∞', 0],
                ].map(([l, v, max, pct]) => (
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

            <div className="h-px bg-border" />

            <div>
              <div className="font-display text-[13px] font-bold mb-3">Payment Method</div>
              <div className="flex items-center justify-between px-[11px] py-[9px] bg-secondary rounded-lg border border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-5 bg-card rounded flex items-center justify-center text-[9px] font-bold text-primary border border-border">VISA</div>
                  <div>
                    <div className="text-xs font-semibold">•••• •••• •••• 4242</div>
                    <div className="text-[10px] text-muted-foreground">Expires 12/2027</div>
                  </div>
                </div>
                <button onClick={() => toast({ title: 'Update payment method', description: 'Payment update flow would open here.' })} className="text-[11px] px-2 py-1 rounded-md bg-card border border-border text-muted-foreground hover:text-foreground">
                  Update
                </button>
              </div>
            </div>

            <div className="h-px bg-border" />

            <div>
              <div className="font-display text-[13px] font-bold mb-3">Billing History</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {['Date', 'Description', 'Amount', 'Status'].map(h => (
                        <th key={h} className="text-left p-[9px] text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.7px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Mar 1, 2026', 'Pro Plan — Monthly', '$29.00', 'Paid'],
                      ['Feb 1, 2026', 'Pro Plan — Monthly', '$29.00', 'Paid'],
                      ['Jan 1, 2026', 'Pro Plan — Monthly', '$29.00', 'Paid'],
                      ['Dec 1, 2025', 'Pro Plan — Monthly', '$29.00', 'Paid'],
                    ].map(([date, desc, amt, status], i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-glass">
                        <td className="p-[9px] font-mono">{date}</td>
                        <td className="p-[9px]">{desc}</td>
                        <td className="p-[9px] font-mono font-semibold">{amt}</td>
                        <td className="p-[9px]"><span className="text-[10px] font-mono font-semibold px-[7px] py-0.5 rounded text-primary bg-accent-dim">{status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => toast({ title: 'Upgrade plan', description: 'Plan upgrade flow would open here.' })} className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90">
                Upgrade Plan
              </button>
              <button onClick={() => toast({ title: 'Download invoice', description: 'Invoice PDF would be generated here.' })} className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-card text-muted-foreground border border-border hover:text-foreground">
                Download Invoice
              </button>
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
    api: 'API Key Management',
    security: 'Security & Privacy',
    billing: 'Billing & Subscription',
  };

  return (
    <div className="space-y-3.5">
      <div className="font-display text-[19px] font-extrabold tracking-tight">Settings</div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: '180px 1fr' }}>
        <div className="bg-card border border-border rounded-xl h-fit">
          <div className="p-1.5 space-y-0.5">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`w-full text-left px-[10px] py-2 rounded-lg text-[13px] flex items-center gap-2 transition-colors ${tab === t.id ? 'bg-accent-dim text-primary' : 'text-muted-foreground hover:bg-glass hover:text-foreground'}`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">{tabTitles[tab]}</span></div>
          <div className="p-3.5">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
