import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export default function AuthShell({ title, subtitle, children, footer }) {
  const { t } = useLanguage();

  return (
    <section className="hero-mesh bg-grid-slate relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <Link
            to="/"
            className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/25"
          >
            <Sparkles className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div className="glass-card rounded-3xl p-6 sm:p-8">{children}</div>

        {footer && (
          <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">{footer}</div>
        )}

        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          {t('brandName')} • {t('brandTagline')}
        </p>
      </div>
    </section>
  );
}
