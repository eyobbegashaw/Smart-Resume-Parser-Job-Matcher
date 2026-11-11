import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (adminOnly && !isAdmin) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="surface-card rounded-2xl p-8">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('common.error')}</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{t('admin.accessDenied')}</p>
        </div>
      </div>
    );
  }

  return children;
}
