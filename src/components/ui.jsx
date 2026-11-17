// Small presentational building blocks.

export function Button({ variant = 'primary', size, className = '', type = 'button', loading, children, ...props }) {
  const cls = ['btn', `btn-${variant}`, size && `btn-${size}`, className].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} disabled={loading || props.disabled} {...props}>
      {loading && <span className="spinner spinner-sm" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Alert({ tone = 'danger', children }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function Card({ title, actions, children, className = '', flush }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-header">
          {title && <h2 className="card-title">{title}</h2>}
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      <div className={flush ? 'card-body-flush' : 'card-body'}>{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, tone }) {
  return (
    <div className={`stat-card ${tone ? `stat-${tone}` : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Spinner({ label = 'Loading…', full }) {
  return (
    <div className={full ? 'loading-full' : 'loading-inline'}>
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          className={`tab ${value === t.value ? 'tab-active' : ''}`}
          onClick={() => onChange(t.value)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
