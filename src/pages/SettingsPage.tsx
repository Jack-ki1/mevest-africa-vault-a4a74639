export default function SettingsPage() {
  const sources = [
    { name: 'Yahoo Finance', status: 'Connected' },
    { name: 'CoinGecko API', status: 'Connected' },
    { name: 'Alpha Vantage', status: 'Configure' },
    { name: 'NewsAPI', status: 'Connected' },
    { name: 'NSE Kenya Data', status: 'Connected' },
  ];

  return (
    <div className="space-y-3.5">
      <div className="font-display text-[19px] font-extrabold tracking-tight">Settings</div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: '180px 1fr' }}>
        <div className="bg-card border border-border rounded-xl h-fit">
          <div className="p-1.5 space-y-0.5">
            {['Profile', 'Notifications', 'API Keys', 'Security', 'Billing'].map((t, i) => (
              <button key={t} className={`w-full text-left px-[10px] py-2 rounded-lg text-[13px] ${i === 0 ? 'bg-accent-dim text-primary' : 'text-muted-foreground hover:bg-glass hover:text-foreground'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Account Settings</span></div>
          <div className="p-3.5 space-y-3.5">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5">Display Name</label>
              <input defaultValue="Alex Kamau" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5">Email</label>
              <input defaultValue="alex@mevest.io" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5">Base Currency</label>
              <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary">
                <option>USD — US Dollar</option><option>KES — Kenyan Shilling</option><option>GBP — British Pound</option><option>EUR — Euro</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px] mb-1.5">Timezone</label>
              <select className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-[13px] text-foreground outline-none focus:border-primary">
                <option>Africa/Nairobi (EAT, UTC+3)</option><option>America/New_York (EST)</option><option>Europe/London (GMT)</option>
              </select>
            </div>

            <div className="flex gap-2 mt-3.5">
              <button className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90">Save Changes</button>
              <button className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-card text-muted-foreground border border-border hover:text-foreground">Reset</button>
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
        </div>
      </div>
    </div>
  );
}
