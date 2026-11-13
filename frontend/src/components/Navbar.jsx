import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  Sparkles,
  Sun,
  User,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function Navbar() {
  const { user, isAuthenticated, logout, syncPreferences } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleThemeToggle = () => {
    const nextDark = !isDark;
    toggleTheme();
    syncPreferences({ darkMode: nextDark });
  };

  const handleLanguageChange = (nextLang) => {
    setLanguage(nextLang);
    syncPreferences({ language: nextLang });
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    setMobileOpen(false);
    await logout();
    navigate('/');
  };

  const navItems = [
    { to: '/', label: t('nav.home'), icon: Sparkles, end: true },
    ...(isAuthenticated
      ? [
          { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
          { to: '/resumes', label: t('nav.resumes'), icon: FileText }
        ]
      : [])
  ];

  const navLinkClass = ({ isActive }) =>
    `inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white'
    }`;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-surface-dark/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm shadow-brand-600/30 transition-transform group-hover:scale-105">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <span className="block text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
              {t('brandName')}
            </span>
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {t('brandTagline')}
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={navLinkClass}>
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Bilingual Switcher */}
          <div
            className="inline-flex rounded-xl border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-700/80 dark:bg-slate-900"
            role="group"
            aria-label="Language switcher"
          >
            {['en', 'am'].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => handleLanguageChange(code)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  code === 'am' ? 'font-ethiopic' : ''
                } ${
                  language === code
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-brand-300'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {t(`lang.${code}`)}
              </button>
            ))}
          </div>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={handleThemeToggle}
            aria-label={t('theme.toggleLabel')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            {isDark ? <Sun className="h-4 w-4 text-gold-400" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Auth Actions / User Dropdown */}
          {isAuthenticated ? (
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 pl-1.5 pr-3 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-7 w-7 rounded-lg object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white">
                    {(user?.name || 'U').charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="max-w-[120px] truncate">{user?.name}</span>
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="glass-card absolute right-0 z-20 mt-2 w-56 rounded-2xl p-1.5">
                    <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{user?.name}</p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{user?.email}</p>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Settings className="h-4 w-4" />
                      <span>{t('nav.settings')}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>{t('nav.signOut')}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link
                to="/login"
                className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t('nav.signIn')}
              </Link>
              <Link to="/register" className="btn-primary py-2">
                {t('nav.getStarted')}
              </Link>
            </div>
          )}

          {/* Mobile Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 lg:hidden dark:border-slate-700 dark:text-slate-200"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden dark:border-slate-800 dark:bg-surface-dark">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={navLinkClass}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}

            {isAuthenticated ? (
              <>
                <NavLink
                  to="/settings"
                  onClick={() => setMobileOpen(false)}
                  className={navLinkClass}
                >
                  <User className="h-4 w-4" />
                  <span>{t('nav.settings')}</span>
                </NavLink>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  <LogOut className="h-4 w-4" />
                  <span>{t('nav.signOut')}</span>
                </button>
              </>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="btn-secondary w-full"
                >
                  {t('nav.signIn')}
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="btn-primary w-full"
                >
                  {t('nav.getStarted')}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
