export function IconSprite() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
      <symbol id="i-sun" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
      </symbol>
      <symbol id="i-upload-cloud" viewBox="0 0 24 24">
        <path d="M7.2 17.5a4 4 0 0 1-.4-7.98A5.5 5.5 0 0 1 17.3 9a4 4 0 0 1-.3 8H7.2Z" />
        <path d="M12 20v-7M9.3 15.7 12 13l2.7 2.7" />
      </symbol>
      <symbol id="i-face-scan" viewBox="0 0 24 24">
        <path d="M4 8V5.8A1.8 1.8 0 0 1 5.8 4H8" />
        <path d="M16 4h2.2A1.8 1.8 0 0 1 20 5.8V8" />
        <path d="M4 16v2.2A1.8 1.8 0 0 0 5.8 20H8" />
        <path d="M20 16v2.2a1.8 1.8 0 0 1-1.8 1.8H16" />
        <circle cx="12" cy="10.3" r="2.3" />
        <path d="M8.2 17c.9-2 2.6-3 3.8-3s2.9 1 3.8 3" />
      </symbol>
      <symbol id="i-shield-check" viewBox="0 0 24 24">
        <path d="M12 3.2 19 6v6c0 4.6-3 7.6-7 8.8-4-1.2-7-4.2-7-8.8V6l7-2.8Z" />
        <path d="M8.7 12.3 11 14.6l4.3-4.6" />
      </symbol>
      <symbol id="i-download" viewBox="0 0 24 24">
        <path d="M12 3.5v11M8 10.5l4 4 4-4" />
        <path d="M5 18.5h14" />
      </symbol>
      <symbol id="i-trash" viewBox="0 0 24 24">
        <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      </symbol>
      <symbol id="i-lock" viewBox="0 0 24 24">
        <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
        <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      </symbol>
    </svg>
  );
}

export function Logo({ href = '#' }: { href?: string }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <div className="logo-badge">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <use href="#i-sun" />
          </svg>
        </div>
        <div>
          <div className="display" style={{ fontSize: 17, color: '#12688C' }}>Nascer do Sol</div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', color: 'oklch(45% 0.02 250)' }}>COPACABANA</div>
        </div>
      </div>
    </header>
  );
}
