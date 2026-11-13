import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import FloatingInput from '../components/FloatingInput';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { authApi, extractErrorMessage } from '../services/api';
import { savePendingOtpSession } from '../utils/otpSession';

export default function LoginPage() {
  const { login } = useAuth();
  const { language, t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const searchError = new URLSearchParams(location.search).get('error');
  const from = location.state?.from || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login({ email: email.trim(), password, language });
      if (result?.requiresOtpVerification) {
        const pendingSession = savePendingOtpSession(result);
        toast.info(t('auth.otpVerifyRequiredToast'));
        navigate('/verify-otp', { replace: true, state: pendingSession });
        return;
      }
      toast.success(t('nav.dashboard'));
      navigate(from, { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-bold text-brand-600 hover:underline dark:text-brand-400">
            {t('auth.createOne')}
          </Link>
        </>
      }
    >
      {(error || searchError) && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/50 dark:text-rose-300">
          {error || searchError.replace(/_/g, ' ')}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <FloatingInput
          id="login-email"
          type="email"
          label={t('auth.emailLabel')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={Mail}
          required
          autoComplete="email"
        />

        <div className="space-y-1.5">
          <FloatingInput
            id="login-password"
            type="password"
            label={t('auth.passwordLabel')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={Lock}
            required
            autoComplete="current-password"
            showPasswordToggle
          />
          <div className="flex justify-end pt-1">
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              {t('auth.forgotLink')}
            </Link>
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
          <span>{submitting ? t('common.loading') : t('auth.signInBtn')}</span>
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        <span className="text-xs font-medium text-slate-400">{t('auth.orDivider')}</span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>

      <a href={authApi.getGoogleOAuthUrl('login', language)} className="btn-secondary w-full py-2.5">
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
          />
        </svg>
        <span>{t('auth.googleBtn')}</span>
      </a>
    </AuthShell>
  );
}
