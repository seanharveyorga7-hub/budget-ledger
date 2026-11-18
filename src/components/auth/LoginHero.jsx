// Decorative left panel on the login page: headline, a mock indicator card and
// ledger sheet, and floating feature chips. Pure HTML/CSS/SVG; hidden on small screens.

const icons = {
  indicator: (
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  ),
  ledger: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9 10h7M9 14h7M9 18h4" />
    </>
  ),
  realign: (
    <>
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </>
  ),
  audit: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" />
      <path d="M8.5 12l2.5 2.5 4.5-5" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
};

function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}

function Chip({ icon, tone, className, children }) {
  return (
    <div className={`hero-chip ${className}`}>
      <span className={`hero-chip-icon tone-${tone}`}>
        <Icon name={icon} size={16} />
      </span>
      {children}
    </div>
  );
}

// Planned vs. used, Jan–Dec (illustrative only).
const MONTH_BARS = [62, 70, 55, 80, 68, 74, 50, 66, 72, 58, 64, 90];
const USED_UNTIL = 8;

export default function LoginHero() {
  return (
    <section className="login-hero" aria-hidden="true">
      <div className="hero-eyebrow">Budget Indicator &amp; Obligation Ledger</div>
      <h2 className="hero-title">
        Every peso, <span className="hero-accent">planned and accounted for.</span>
      </h2>

      <div className="hero-art">
        {/* Back: ledger sheet */}
        <div className="hero-sheet">
          <div className="hero-sheet-title">Obligation Ledger</div>
          {[
            ['Office supplies', '₱48,500.00'],
            ['Laptop units (5)', '₱325,000.00'],
            ['Training venue', '₱90,000.00'],
            ['Internet service', '₱36,000.00'],
          ].map(([what, amt]) => (
            <div className="hero-sheet-row" key={what}>
              <span>{what}</span>
              <strong>{amt}</strong>
            </div>
          ))}
        </div>

        {/* Front: indicator card */}
        <div className="hero-card">
          <div className="hero-card-head">
            <div>
              <div className="hero-code">ICT-2026</div>
              <div className="hero-card-sub">ICT Equipment &amp; Services</div>
            </div>
            <span className="hero-pill">MOOE</span>
          </div>
          <div className="hero-label">Available balance</div>
          <div className="hero-amount">₱1,250,000.00</div>
          <div className="hero-progress">
            <span style={{ width: '58%' }} />
          </div>
          <div className="hero-progress-meta">
            <span>58% used</span>
            <span>of ₱3,000,000.00</span>
          </div>
          <div className="hero-bars">
            {MONTH_BARS.map((h, i) => (
              <span key={i} className={i < USED_UNTIL ? 'used' : ''} style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        <div className="hero-badge">
          <Icon name="check" size={30} />
        </div>

        <Chip icon="indicator" tone="amber" className="chip-tl">Budget indicators</Chip>
        <Chip icon="ledger" tone="slate" className="chip-tr">Obligation ledger</Chip>
        <Chip icon="realign" tone="green" className="chip-bl">Realignments</Chip>
        <Chip icon="audit" tone="blue" className="chip-br">Audit trail</Chip>
      </div>
    </section>
  );
}
