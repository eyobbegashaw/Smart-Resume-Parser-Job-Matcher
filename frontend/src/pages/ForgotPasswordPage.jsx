import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Clock,
  ExternalLink,
  KeyRound,
  Lock,
  Mail,
  MailCheck,
  RefreshCw
} from 'lucide-react';
import AuthShell from '../components/AuthShell';
import FloatingInput from '../components/FloatingInput';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { authApi, extractErrorMessage } from '../services/api';

const OTP_LENGTH = 6;

export default function ForgotPasswordPage() {
  const { language, t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialEmail = (searchParams.get('email') || '').trim().toLowerCase();
  const initialStep = searchParams.get('step') === 'verify' && initialEmail ? 'verify' : 'request';

  const [step, setStep] = useState(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [prefilledFromEmail, setPrefilledFromEmail] = useState(false);
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const [resetMeta, setResetMeta] = useState(() => ({
    email: initialEmail,
    previewUrl: '',
    deliveryMode: '',
    resendAvailableAt: initialStep === 'verify' ? Date.now() + 60 * 1000 : 0
  }));
  const [nowMs, setNowMs] = useState(() => Date.now());

  const activeEmail = (resetMeta.email || email || '').trim().toLowerCase();
  const resendSecondsLeft = Math.max(0, Math.ceil(((resetMeta.resendAvailableAt || 0) - nowMs) / 1000));
  const isGmailTarget = /@(gmail|googlemail)\.com$/i.test(activeEmail);

  // Tick every second while resend cooldown is active
  useEffect(() => {
    if (step !== 'verify' || resendSecondsLeft <= 0) return undefined;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [step, resendSecondsLeft]);

  // Support clicking "Copy Reset Code" CTA from inbox email (#code=123456&action=copy)
  useEffect(() => {
    const rawHash = window.location.hash ? window.location.hash.replace(/^#/, '') : '';
    if (!rawHash) return;

    const hashParams = new URLSearchParams(rawHash);
    const fragmentCode = (hashParams.get('code') || '').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (fragmentCode.length !== OTP_LENGTH) return;

    setOtp(fragmentCode);
    setPrefilledFromEmail(true);
    if (initialEmail) {
      setStep('verify');
    }

    if (hashParams.get('action') === 'copy' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(fragmentCode).catch(() => {});
    }

    toast.success(t('auth.forgotCodePrefilled'));
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }, [initialEmail, t, toast]);

  const sendResetCode = useCallback(
    async (targetEmail, isResend = false) => {
      const cleanEmail = (targetEmail || '').trim().toLowerCase();
      if (!cleanEmail) return;

      setError('');
      setAttemptsRemaining(null);
      if (isResend) {
        setResending(true);
      } else {
        setSubmitting(true);
      }

      try {
        const res = await authApi.forgotPassword(cleanEmail, language);
        const data = res.data?.data || {};
        const resolvedEmail = (data.email || cleanEmail).trim().toLowerCase();
        const cooldownSec = Number(data.resendCooldown) || 60;

        setEmail(resolvedEmail);
        setResetMeta({
          email: resolvedEmail,
          previewUrl: data.previewUrl || '',
          deliveryMode: data.deliveryMode || '',
          resendAvailableAt: Date.now() + cooldownSec * 1000
        });
        setNowMs(Date.now());
        setStep('verify');
        toast.success(res.data?.message || t('auth.forgotSentTitle'));
      } catch (err) {
        setError(extractErrorMessage(err));
      } finally {
        setSubmitting(false);
        setResending(false);
      }
    },
    [language, t, toast]
  );

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    await sendResetCode(email, false);
  };

  const handlePasteCode = async () => {
    setError('');
    if (!navigator.clipboard?.readText) {
      toast.error(t('auth.otpClipboardDenied'));
      return;
    }

    try {
      const clipText = await navigator.clipboard.readText();
      const cleaned = (clipText || '').replace(/\D/g, '').slice(0, OTP_LENGTH);
      if (!cleaned) {
        toast.error(t('auth.otpClipboardEmpty'));
        return;
      }
      setOtp(cleaned);
    } catch {
      toast.error(t('auth.otpClipboardDenied'));
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setAttemptsRemaining(null);

    const cleanOtp = otp.replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (cleanOtp.length !== OTP_LENGTH) {
      setError(t('auth.forgotIncompleteCode'));
      return;
    }
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
      const res = await authApi.resetPasswordWithOtp({
        email: activeEmail,
        otp: cleanOtp,
        password,
        confirmPassword: confirm,
        language
      });
      toast.success(res.data?.message || t('auth.resetSuccessToast'));
      navigate('/login', { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
      const remaining = err?.response?.data?.attemptsRemaining;
      if (typeof remaining === 'number') {
        setAttemptsRemaining(remaining);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeEmail = () => {
    setStep('request');
    setOtp('');
    setPassword('');
    setConfirm('');
    setError('');
    setAttemptsRemaining(null);
    setPrefilledFromEmail(false);
  };

  return (
    <AuthShell
      title={t('auth.forgotTitle')}
      subtitle={t('auth.forgotSubtitle')}
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
            {typeof attemptsRemaining === 'number' && attemptsRemaining > 0 && (
              <p className="mt-1 text-xs font-semibold">
                {t('auth.otpAttemptsLeft', { count: attemptsRemaining })}
              </p>
            )}
          </div>
        </div>
      )}

      {step === 'verify' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-800/70 dark:bg-emerald-950/30">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <MailCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {t('auth.forgotSentTitle')}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {t('auth.forgotSentDesc')}
                </p>
                {activeEmail && (
                  <p className="mt-1.5 inline-block max-w-full truncate rounded-lg bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-800 ring-1 ring-slate-200 dark:bg-slate-900/70 dark:text-slate-100 dark:ring-slate-700">
                    {activeEmail}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {isGmailTarget && (
                <a
                  href="https://mail.google.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('auth.otpOpenGmail')}
                </a>
              )}

              {resetMeta.previewUrl && (
                <a
                  href={resetMeta.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600/10 px-2.5 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-600/20 dark:text-brand-300"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('auth.otpPreviewLink')}
                </a>
              )}

              {resendSecondsLeft > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  {t('auth.forgotResendCooldown', { seconds: resendSecondsLeft })}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => sendResetCode(activeEmail, true)}
                  disabled={resending}
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline disabled:opacity-50 dark:text-brand-400"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                  {t('auth.forgotResendBtn')}
                </button>
              )}

              <button
                type="button"
                onClick={handleChangeEmail}
                className="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {t('auth.forgotChangeEmail')}
              </button>
            </div>
          </div>

          <form onSubmit={handleResetSubmit} className="space-y-4 pt-1">
            <div>
              <FloatingInput
                id="forgot-code"
                type="text"
                inputMode="numeric"
                label={t('auth.forgotCodeLabel')}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData?.getData('text') || '';
                  const clean = pasted.replace(/\D/g, '').slice(0, OTP_LENGTH);
                  if (clean) setOtp(clean);
                }}
                icon={KeyRound}
                required
                autoComplete="one-time-code"
                maxLength={OTP_LENGTH}
                inputClassName="font-mono font-semibold tracking-[0.25em]"
                rightElement={
                  <button
                    type="button"
                    onClick={handlePasteCode}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 hover:underline dark:text-brand-400 dark:hover:bg-brand-950/40"
                    title={t('auth.otpPasteBtn')}
                  >
                    <ClipboardPaste className="h-3.5 w-3.5" />
                    <span>{t('auth.otpPasteBtn')}</span>
                  </button>
                }
              />
              {prefilledFromEmail && (
                <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('auth.forgotCodePrefilled')}
                </p>
              )}
            </div>

            <FloatingInput
              id="forgot-new-password"
              type="password"
              label={t('auth.newPasswordLabel')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={Lock}
              required
              minLength={6}
              autoComplete="new-password"
              showPasswordToggle
            />

            <FloatingInput
              id="forgot-confirm-password"
              type="password"
              label={t('auth.confirmPasswordLabel')}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              icon={Lock}
              required
              minLength={6}
              autoComplete="new-password"
              showPasswordToggle
            />

            <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
              {submitting ? t('common.loading') : t('auth.resetBtn')}
            </button>
          </form>
        </div>
      ) : (
        <form onSubmit={handleRequestSubmit} className="space-y-4 pt-1">
          <FloatingInput
            id="forgot-email"
            type="email"
            label={t('auth.emailLabel')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={Mail}
            required
            autoComplete="email"
          />
          <button type="submit" disabled={submitting} className="btn-primary w-full py-2.5">
            {submitting ? t('common.loading') : t('auth.sendResetBtn')}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
