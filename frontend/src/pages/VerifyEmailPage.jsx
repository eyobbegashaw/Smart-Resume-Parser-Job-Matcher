import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { useLanguage } from '../contexts/LanguageContext';
import { authApi, extractErrorMessage } from '../services/api';

export default function VerifyEmailPage() {
  const { token } = useParams();
  const { t } = useLanguage();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    authApi
      .verifyEmail(token)
      .then((res) => {
        if (!active) return;
        setStatus('success');
        setMessage(res.data?.message || t('auth.verifiedSuccess'));
      })
      .catch((err) => {
        if (!active) return;
        setStatus('error');
        setMessage(extractErrorMessage(err, t('auth.verifiedError')));
      });
    return () => {
      active = false;
    };
  }, [token, t]);

  return (
    <AuthShell title={t('auth.verifyTitle')}>
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        {status === 'loading' && (
          <>
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('auth.verifying')}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="h-11 w-11 text-emerald-500" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{message}</p>
            <Link to="/dashboard" className="btn-primary mt-2">
              {t('nav.dashboard')}
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="h-11 w-11 text-rose-500" />
            <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{message}</p>
            <Link to="/login" className="btn-secondary mt-2">
              {t('auth.backToLogin')}
            </Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}
