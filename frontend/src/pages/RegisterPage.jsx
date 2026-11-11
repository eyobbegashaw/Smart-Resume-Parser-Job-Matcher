import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, ArrowRight } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { authApi, extractErrorMessage } from '../services/api';
import { savePendingOtpSession } from '../utils/otpSession';

export default function RegisterPage() {
  const { register } = useAuth();
  const { language, t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError(t('auth.passwordWeak'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await register({ name: name.trim(), email: email.trim(), password, language });
      if (result?.requiresOtpVerification) {
        const pendingSession = savePendingOtpSession(result);
        toast.success(t('auth.otpSentToast'));
        navigate('/verify-otp', { replace: true, state: pendingSession });
        return;
      }
      toast.success(t('nav.dashboard'));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      footer={
        <>
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="font-bold text-brand-600 hover:underline dark:text-brand-400">
            {t('auth.signInHere')}
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/50 dark:text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            {t('auth.nameLabel')}
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              required
              minLength={2}
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('auth.namePlaceholder')}
              className="input-field pl-11"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            {t('auth.emailLabel')}
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('auth.emailPlaceholder')}
              className="input-field pl-11"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            {t('auth.passwordLabel')}
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('auth.passwordPlaceholder')}
              className="input-field pl-11 pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label="Toggle password visibility"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{t('auth.rememberHint')}</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            {t('auth.confirmPasswordLabel')}
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field pl-11"
            />
          </div>
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
          <span>{submitting ? t('common.loading') : t('auth.signUpBtn')}</span>
          {!submitting && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        <span className="text-xs font-medium text-slate-400">{t('auth.orDivider')}</span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>

      <a href={authApi.getGoogleOAuthUrl('register', language)} className="btn-secondary w-full py-2.5">
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
