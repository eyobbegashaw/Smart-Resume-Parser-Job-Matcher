import { Link } from 'react-router-dom';
import { Sparkles, Github } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-slate-200/80 bg-white/70 dark:border-slate-800/80 dark:bg-surface-dark/90">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-base font-extrabold text-slate-900 dark:text-white">
                {t('brandName')}
              </span>
            </Link>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {t('footer.desc')}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              <Github className="h-3.5 w-3.5 text-slate-700 dark:text-slate-300" />
              <span>{t('footer.developer')}:</span>
              <a
                href="https://github.com/eyobbegashaw"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand-600 transition-colors hover:text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
              >
                github.com/eyobbegashaw
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {t('footer.platform')}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/" className="hover:text-brand-600 dark:hover:text-brand-400">
                  {t('nav.home')}
                </Link>
              </li>
              <li>
                <Link to="/resumes" className="hover:text-brand-600 dark:hover:text-brand-400">
                  {t('nav.resumes')}
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-brand-600 dark:hover:text-brand-400">
                  {t('nav.dashboard')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {t('footer.resources')}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/settings" className="hover:text-brand-600 dark:hover:text-brand-400">
                  {t('nav.settings')}
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-brand-600 dark:hover:text-brand-400">
                  {t('nav.signIn')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-200/80 pt-6 text-xs text-slate-500 sm:flex-row dark:border-slate-800/80 dark:text-slate-400">
          <div>
            {t('footer.rights', { year: new Date().getFullYear() })}
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <span>{t('footer.developer')}:</span>
            <a
              href="https://github.com/eyobbegashaw"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-brand-600 transition-colors hover:text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
            >
              github.com/eyobbegashaw
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
