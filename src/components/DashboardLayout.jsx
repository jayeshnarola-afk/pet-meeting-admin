import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navLinks = [
  { path: '/dashboard/overview', label: 'Overview' },
  { path: '/dashboard/users', label: 'Users' },
  { path: '/dashboard/pets', label: 'Pets' },
  { path: '/dashboard/admin', label: 'Images' },
];

export default function DashboardLayout() {
  const { logout, userEmail } = useAuth();
  const location = useLocation();

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-dot" />
          Dash Board
        </div>
        <nav className="nav-links">
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `nav-link ${isActive || location.pathname.startsWith(link.path) ? 'active' : ''}`.trim()
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="content-area">
        {location.pathname === '/dashboard/overview' && (
          <header className="app-bar">
            <div>
              <p className="muted">Logged in as</p>
              <strong>{userEmail || 'admin@gmail.com'}</strong>
            </div>
            <button type="button" className="outline" onClick={logout}>
              Logout
            </button>
          </header>
        )}
        <div className="content-card">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

