import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from './Spinner.jsx';

/** Gates child routes behind login (and optionally a role). */
export default function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Spinner full />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  // Wrong role: hosts-only pages send guests to the "become a host" page; admin pages go home
  if (role && user.role !== role) return <Navigate to={role === 'host' ? '/host' : '/'} replace />;
  return <Outlet />;
}
