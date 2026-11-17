import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTutorial } from '../contexts/TutorialContext';
import { ROLE_LABELS, ROLES } from '../utils/constants';
import { Badge, Button } from './ui';

const NAV = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/indicators', label: 'Budget Indicators' },
  { to: '/ledger', label: 'Obligation Ledger' },
  { to: '/deleted', label: 'Deleted Records', role: ROLES.SYS_ADMIN },
  { to: '/settings', label: 'Settings', role: ROLES.SYS_ADMIN },
];

export default function Layout() {
  const { profile, role, logOut } = useAuth();
  const { start, active } = useTutorial();
  const { pathname } = useLocation();
  const section = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))?.label ?? '';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">B</div>
          <div>
            <div className="brand-name">Budget Ledger</div>
            <div className="brand-sub">Indicators &amp; Obligations</div>
          </div>
        </div>
        <nav className="nav" data-tour="nav">
          {NAV.filter((n) => !n.role || n.role === role).map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer" data-tour="sidebar-user">
          <div className="user-chip">
            <div className="avatar">{(profile.displayName || '?').charAt(0).toUpperCase()}</div>
            <div className="user-meta">
              <div className="user-name" title={profile.email}>
                {profile.displayName}
              </div>
              <Badge tone={role === ROLES.SYS_ADMIN ? 'accent' : 'neutral'}>{ROLE_LABELS[role] || role}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logOut}>
            Sign out
          </Button>
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="topbar-section">{section}</div>
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
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
