import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { friendlyError } from '../utils/errors';
import { Alert, Button, Spinner } from './ui';

/** Requires a signed-in user with a loaded profile. */
export function ProtectedRoute({ children }) {
  const { user, profile, loading, error, logOut } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner full label="Loading your account…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (error || !profile) {
    return (
      <div className="center-screen">
        <div className="card narrow">
          <div className="card-body stack">
            <Alert>{error ? friendlyError(error) : 'Your user profile could not be loaded.'}</Alert>
            <Button variant="ghost" onClick={logOut}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return children;
}

/** Route guard: renders an access-denied view unless the user has `role`. */
export function RequireRole({ role, children }) {
  const { role: current } = useAuth();
  if (current !== role) {
    return (
      <div className="empty-state">
        <h2>Access restricted</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }
  return children;
}

/** Inline guard: renders children only for the given role(s). */
export function IfRole({ role, children, fallback = null }) {
  const { role: current } = useAuth();
  const allowed = Array.isArray(role) ? role.includes(current) : current === role;
  return allowed ? children : fallback;
}
