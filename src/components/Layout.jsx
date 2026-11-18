import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTutorial } from '../contexts/TutorialContext';
import { ROLE_LABELS, ROLES } from '../utils/constants';
import { Badge } from './ui';
import ThemeToggle from './ThemeToggle';

const ICONS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  indicators: <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />,
  ledger: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9 10h7M9 14h7M9 18h4" />
    </>
  ),
  deleted: (
    <>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  signout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </>
  ),
  panel: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </>
  ),
};

function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/indicators', label: 'Budget Indicators', icon: 'indicators' },
  { to: '/ledger', label: 'Obligation Ledger', icon: 'ledger' },
  { to: '/deleted', label: 'Deleted Records', icon: 'deleted', role: ROLES.SYS_ADMIN },
  { to: '/settings', label: 'Settings', icon: 'settings', role: ROLES.SYS_ADMIN },
];

const STORAGE_KEY = 'sidebarCollapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function Layout() {
  const { profile, role, logOut } = useAuth();
  const { start, active } = useTutorial();
  const { pathname } = useLocation();
  const section = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))?.label ?? '';
  const [collapsed, setCollapsed] = useState(readCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      /* storage unavailable: the choice just won't be remembered */
    }
  }, [collapsed]);

  // Show the full sidebar while the guided tour runs, so the highlighted parts make sense.
  const isCollapsed = collapsed && !active;
  const tip = (text) => (isCollapsed ? text : undefined);

  return (
    <div className={`app-shell ${isCollapsed ? 'is-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">B</div>
          <div className="brand-text">
            <div className="brand-name">Budget Ledger</div>
            <div className="brand-sub">Indicators &amp; Obligations</div>
          </div>
        </div>
        <nav className="nav" data-tour="nav">
          {NAV.filter((n) => !n.role || n.role === role).map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              title={tip(n.label)}
              aria-label={isCollapsed ? n.label : undefined}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon name={n.icon} />
              <span className="nav-label">{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer" data-tour="sidebar-user">
          <div className="user-chip" title={tip(`${profile.displayName} · ${ROLE_LABELS[role] || role}`)}>
            <div className="avatar">{(profile.displayName || '?').charAt(0).toUpperCase()}</div>
            <div className="user-meta">
              <div className="user-name" title={profile.email}>
                {profile.displayName}
              </div>
              <Badge tone={role === ROLES.SYS_ADMIN ? 'accent' : 'neutral'}>{ROLE_LABELS[role] || role}</Badge>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm signout-btn" onClick={logOut} title={tip('Sign out')} aria-label="Sign out">
            <Icon name="signout" size={16} />
            <span className="nav-label">Sign out</span>
          </button>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="sidebar-toggle"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!isCollapsed}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <Icon name="panel" size={20} />
            </button>
            <div className="topbar-section">{section}</div>
          </div>
          <div className="topbar-right">
            <ThemeToggle />
            <button
              type="button"
              className="help-btn"
              onClick={start}
              disabled={active}
              data-tour="tour-button"
              title="Replay the guided tour"
              aria-label="Replay the guided tour"
            >
              ?
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
