import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import AuthShell from '../components/AuthShell';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { authApi, extractErrorMessage } from '../services/api';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const { language, t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const redirectTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError(t('auth.passwordWeak'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.resetPassword(token, {
        password,
        confirmPassword: confirm,
        language
      });
      toast.success(res.data?.message || t('auth.resetSuccessToast'));
      setResetSuccess(true);
      redirectTimerRef.current = setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={t('auth.resetTitle')}
      subtitle={t('auth.resetSubtitle')}
      footer={
        <Link to="/login" className="font-bold text-brand-600 hover:underline dark:text-brand-400">
          {t('auth.backToLogin')}
        </Link>
      }
    >
      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>{error}</p>
            <Link
              to="/forgot-password"
              className="mt-1.5 inline-block text-xs font-bold text-rose-800 underline hover:opacity-80 dark:text-rose-200"
            >
              {t('auth.resetExpiredAction')}
            </Link>
          </div>
        </div>
      )}

      {resetSuccess ? (
        <div className="flex flex-col items-center gap-3 py-5 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {t('auth.resetSuccessTitle')}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('auth.resetSuccessDesc')}
          </p>
          <Link to="/login" className="btn-primary mt-2 w-full">
            {t('auth.backToLogin')}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              {t('auth.newPasswordLabel')}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                className="input-field pl-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              {t('auth.confirmPasswordLabel')}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="input-field pl-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? t('common.loading') : t('auth.resetBtn')}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
