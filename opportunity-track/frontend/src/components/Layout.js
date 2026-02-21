import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import Logo from '@/components/ui/Logo';
import {
  User, Newspaper, Search, Bookmark,
  LogOut, Menu, Moon, Sun
} from 'lucide-react';

const navItems = [
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/feed', label: 'Feed', icon: Newspaper },
  { to: '/internships', label: 'Listings', icon: Search },
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
];

/* ── Sidebar icon button with hover label ──────────────────────────── */
function SidebarIcon({ to, label, icon: Icon, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `sidebar-icon-nav ${isActive ? 'active' : ''}`
      }
      data-testid={`nav-${label.toLowerCase()}`}
    >
      <Icon className="sidebar-icon" />
      <span className="sidebar-hover-label">{label}</span>
    </NavLink>
  );
}

/* ── Desktop sidebar (icon-only, 56px) ─────────────────────────────── */
function DesktopSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside
      className="hidden lg:flex lg:flex-col lg:w-14 items-center py-4 gap-1 shrink-0"
      style={{
        background: 'linear-gradient(180deg, #1b1f23 0%, #2d3136 100%)',
      }}
      data-testid="sidebar"
    >
      {/* Logo */}
      <div className="mb-4 flex justify-center">
        <Logo size="sm" className="text-white" />
      </div>

      {/* Nav */}
      <nav className="flex flex-col items-center gap-1 flex-1" data-testid="sidebar-nav">
        {navItems.map(item => (
          <SidebarIcon key={item.to} {...item} />
        ))}
      </nav>

      {/* User + Logout */}
      <div className="flex flex-col items-center gap-2 mt-auto">
        <div
          className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white text-xs font-semibold cursor-pointer"
          title={user?.name || 'User'}
          onClick={() => navigate('/profile')}
        >
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <button
          onClick={() => { logout(); navigate('/auth'); }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200"
          title="Sign out"
          data-testid="logout-btn"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}

/* ── Mobile sidebar (full labels) ──────────────────────────────────── */
function MobileSidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div
      className="flex flex-col h-full py-5"
      style={{ background: 'linear-gradient(180deg, #1b1f23, #2d3136)' }}
    >
      <div className="flex items-center gap-2.5 px-5 mb-6">
        <Logo size="md" className="text-white" />
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                ? 'bg-white/15 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-4 pt-3 border-t border-white/10">
        <div className="flex items-center gap-2.5 mb-3 px-1">
          <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-white font-semibold text-xs">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name}</p>
            <p className="text-[10px] text-white/50 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate('/auth'); onNavigate?.(); }}
          className="flex items-center gap-2 px-3 py-2 w-full rounded-lg text-xs text-white/50 hover:text-red-400 hover:bg-white/5 transition-all"
          data-testid="logout-btn-mobile"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}

/* ── Layout wrapper ────────────────────────────────────────────────── */
export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop icon sidebar */}
      <DesktopSidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b flex items-center justify-between px-4 lg:px-6 bg-card">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" data-testid="mobile-menu-btn">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0 border-0">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <MobileSidebarContent onNavigate={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
            <span className="lg:hidden"><Logo size="md" /></span>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="theme-toggle-btn">
            {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
          </Button>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
