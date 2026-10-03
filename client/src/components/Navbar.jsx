import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import Avatar from './Avatar.jsx';
import SearchBar from './SearchBar.jsx';
import { MenuIcon, MoonIcon, SearchIcon, SunIcon } from './Icons.jsx';
import { formatDate, plural } from '../utils/format.js';

const SEARCH_KEYS = ['location', 'checkIn', 'checkOut', 'guests'];
const HERO_SCROLL_THRESHOLD = 360;

export default function Navbar() {
  const { user, isHost, isAdmin, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const onHome = location.pathname === '/';
  const isLanding = onHome && !SEARCH_KEYS.some((k) => params.get(k));

  // On the landing page the big hero search is visible, so the compact pill
  // only appears once the user scrolls past it ("sticky search header").
  useEffect(() => {
    if (!isLanding) return undefined;
    const onScroll = () => setScrolledPastHero(window.scrollY > HERO_SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isLanding]);

  const showPill = !isLanding || scrolledPastHero;

  // Close menus on navigation / outside click / Esc
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const current = useMemo(
    () => Object.fromEntries(SEARCH_KEYS.map((k) => [k, (onHome && params.get(k)) || ''])),
    [params, onHome]
  );

  const summary = {
    where: current.location || 'Anywhere',
    when:
      current.checkIn && current.checkOut
        ? `${formatDate(current.checkIn, { day: 'numeric', month: 'short' })} – ${formatDate(current.checkOut, { day: 'numeric', month: 'short' })}`
        : 'Any week',
    who: current.guests ? plural(Number(current.guests), 'guest') : 'Add guests',
  };

  const runSearch = (values) => {
    // Keep existing filters (type, price…) when searching from the home page
    const next = new URLSearchParams(onHome ? location.search : '');
    SEARCH_KEYS.forEach((k) => (values[k] ? next.set(k, values[k]) : next.delete(k)));
    next.delete('page');
    next.delete('bounds');
    navigate({ pathname: '/', search: next.toString() });
    setSearchOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <header className={`navbar${searchOpen ? ' search-open' : ''}`}>
        <div className="container navbar-inner">
          <Link to="/" className="logo" aria-label="Staybnb home">
            <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden="true">
              <rect width="32" height="32" rx="9" fill="currentColor" />
              <path d="M16 7 6.5 15H9v9h5.5v-5.5h3V24H23v-9h2.5L16 7Z" fill="#fff" />
            </svg>
            <span className="logo-text">staybnb</span>
          </Link>

          <div className={`nav-center${showPill && !searchOpen ? ' visible' : ''}`}>
            <button type="button" className="search-pill" onClick={() => setSearchOpen(true)} aria-label="Open search">
              <span className="pill-part strong">{summary.where}</span>
              <span className="pill-sep hide-sm" aria-hidden="true" />
              <span className="pill-part hide-sm">{summary.when}</span>
              <span className="pill-sep hide-sm" aria-hidden="true" />
              <span className="pill-part muted hide-sm">{summary.who}</span>
              <span className="pill-icon"><SearchIcon width={14} height={14} strokeWidth={3} /></span>
            </button>
          </div>

          <nav className="nav-right" aria-label="Account">
            {isAdmin ? (
              <NavLink to="/admin" className="nav-link hide-md">Admin console</NavLink>
            ) : (
              <NavLink to="/host" className="nav-link hide-md">
                {isHost ? 'Host dashboard' : 'Switch to hosting'}
              </NavLink>
            )}
            <button
              type="button"
              className="icon-btn"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>

            <div className="user-menu" ref={menuRef}>
              <button
                type="button"
                className="user-menu-btn"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <MenuIcon width={16} height={16} />
                {user ? <Avatar user={user} size={30} /> : <span className="avatar avatar-guest" aria-hidden="true">👤</span>}
              </button>

              {menuOpen && (
                <div className="dropdown" role="menu">
                  {user ? (
                    <>
                      <div className="dropdown-header">
                        <strong>{user.name}</strong>
                        <span className="muted small">{user.email}</span>
                      </div>
                      <Link role="menuitem" to="/trips">Trips</Link>
                      <Link role="menuitem" to="/wishlist">Wishlist</Link>
                      <Link role="menuitem" to="/profile">Profile</Link>
                      <hr />
                      {isAdmin ? (
                        <Link role="menuitem" to="/admin">Admin console</Link>
                      ) : (
                        <Link role="menuitem" to="/host">{isHost ? 'Host dashboard' : 'Switch to hosting'}</Link>
                      )}
                      {isHost && <Link role="menuitem" to="/host/listings/new">Create a listing</Link>}
                      <hr />
                      <button role="menuitem" type="button" onClick={handleLogout}>Log out</button>
                    </>
                  ) : (
                    <>
                      <Link role="menuitem" to="/login" state={{ from: location }}><strong>Log in</strong></Link>
                      <Link role="menuitem" to="/register">Sign up</Link>
                      <hr />
                      <Link role="menuitem" to="/host">Host your home</Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </nav>
        </div>

        {searchOpen && (
          <div className="nav-search-panel">
            <div className="container">
              <SearchBar initial={current} onSearch={runSearch} autoFocus />
            </div>
          </div>
        )}
      </header>
      {searchOpen && <div className="nav-search-backdrop" onClick={() => setSearchOpen(false)} aria-hidden="true" />}
    </>
  );
}
