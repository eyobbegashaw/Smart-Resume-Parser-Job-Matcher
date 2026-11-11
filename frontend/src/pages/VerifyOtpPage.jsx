import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import gsap from 'gsap';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Clock,
  Copy,
  Edit3,
  ExternalLink,
  Mail,
  MailCheck,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { authApi, extractErrorMessage } from '../services/api';
import {
  clearPendingOtpSession,
  loadPendingOtpSession,
  savePendingOtpSession
} from '../utils/otpSession';

const OTP_LENGTH = 6;
const EMPTY_DIGITS = Array(OTP_LENGTH).fill('');

function formatCountdown(totalSeconds) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = String(Math.floor(safe / 60)).padStart(2, '0');
  const secs = String(safe % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

export default function VerifyOtpPage() {
  const { verifyOtp } = useAuth();
  const { language, t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const initialSession = (() => {
    const stored = location.state?.email ? location.state : loadPendingOtpSession();
    const queryEmail = searchParams.get('email') || '';
    if (stored && (!queryEmail || stored.email === queryEmail.trim().toLowerCase())) {
      return stored;
    }
    return {
      email: queryEmail.trim().toLowerCase(),
      name: '',
      authProvider: 'local',
      emailSent: true,
      verificationToken: '',
      previewUrl: '',
      otpExpiresAt: Date.now() + 600 * 1000,
      resendAvailableAt: Date.now() + 60 * 1000
    };
  })();

  const [sessionInfo, setSessionInfo] = useState(initialSession);
  const [emailInput, setEmailInput] = useState(initialSession.email || '');
  const [editingEmail, setEditingEmail] = useState(!initialSession.email);
  const [digits, setDigits] = useState(EMPTY_DIGITS);
  const [prefilledFromEmail, setPrefilledFromEmail] = useState(false);
  const [copiedLocal, setCopiedLocal] = useState(false);

  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  const [nowMs, setNowMs] = useState(() => Date.now());

  const rootRef = useRef(null);
  const slotsContainerRef = useRef(null);
  const successCardRef = useRef(null);
  const inputRefs = useRef([]);
  const verifyBtnRef = useRef(null);
  const verifyingLockRef = useRef(false);
  const redirectTimerRef = useRef(null);

  const activeEmail = (emailInput || '').trim().toLowerCase();
  const otpString = digits.join('');
  const expiresSecondsLeft = Math.max(0, Math.ceil(((sessionInfo.otpExpiresAt || 0) - nowMs) / 1000));
  const resendSecondsLeft = Math.max(0, Math.ceil(((sessionInfo.resendAvailableAt || 0) - nowMs) / 1000));
  const totalWindowSec = 600;
  const expiryProgressPct = Math.max(0, Math.min(100, (expiresSecondsLeft / totalWindowSec) * 100));
  const isGmailTarget = /@(gmail|googlemail)\.com$/i.test(activeEmail);

  // Clean up redirect timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  // Live 1s timer tick for expiry and resend cooldown
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // GSAP entrance animations
  useLayoutEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.otp-stagger', {
        y: 18,
        opacity: 0,
        duration: 0.5,
        stagger: 0.06,
        ease: 'power2.out',
        clearProps: 'transform,opacity'
      });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  // Support clicking the Copy & Verify button from inbox (#code=123456&action=copy)
  useEffect(() => {
    const rawHash = window.location.hash ? window.location.hash.replace(/^#/, '') : '';
    if (!rawHash) return;

    const hashParams = new URLSearchParams(rawHash);
    const fragmentCode = (hashParams.get('code') || '').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (fragmentCode.length !== OTP_LENGTH) return;

    setDigits(fragmentCode.split(''));
    setPrefilledFromEmail(true);

    if (hashParams.get('action') === 'copy' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(fragmentCode).catch(() => {});
    }

    toast.success(t('auth.otpPrefilledToast'));
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    requestAnimationFrame(() => verifyBtnRef.current?.focus());
  }, [t, toast]);

  // Focus first box automatically when email is ready & no prefilled digits
  useEffect(() => {
    if (!editingEmail && !prefilledFromEmail) {
      inputRefs.current[0]?.focus();
    }
  }, [editingEmail, prefilledFromEmail]);

  const triggerErrorShake = useCallback(() => {
    if (!slotsContainerRef.current) return;
    gsap.fromTo(
      slotsContainerRef.current,
      { x: -7 },
      { x: 7, duration: 0.055, repeat: 5, yoyo: true, ease: 'power1.inOut', clearProps: 'x' }
    );
  }, []);

  const submitOtp = useCallback(
    async (codeOverride) => {
      if (verifyingLockRef.current || verifiedSuccess) return;

      const candidateCode = (typeof codeOverride === 'string' ? codeOverride : digits.join('')).trim();
      if (!activeEmail) {
        setError(t('auth.otpEmailMissingError'));
        setEditingEmail(true);
        return;
      }
      if (!/^\d{6}$/.test(candidateCode)) {
        setError(t('auth.otpIncompleteError'));
        triggerErrorShake();
        return;
      }

      verifyingLockRef.current = true;
      setSubmitting(true);
      setError('');

      try {
        await verifyOtp({
          email: activeEmail,
          otp: candidateCode,
          verificationToken: sessionInfo.verificationToken || undefined
        });

        clearPendingOtpSession();
        setVerifiedSuccess(true);
        toast.success(t('auth.otpVerifiedTitle'));

        requestAnimationFrame(() => {
          if (successCardRef.current) {
            gsap.fromTo(
              successCardRef.current,
              { scale: 0.92, opacity: 0 },
              { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' }
            );
          }
        });

        redirectTimerRef.current = setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 900);
      } catch (err) {
        const msg = extractErrorMessage(err, t('auth.verifiedError'));
        const remaining = err?.response?.data?.attemptsRemaining;
        setAttemptsRemaining(typeof remaining === 'number' ? remaining : null);
        setError(msg);
        triggerErrorShake();
      } finally {
        verifyingLockRef.current = false;
        setSubmitting(false);
      }
    },
    [
      activeEmail,
      digits,
      navigate,
      sessionInfo.verificationToken,
      t,
      toast,
      triggerErrorShake,
      verifiedSuccess,
      verifyOtp
    ]
  );

  const handleDigitChange = (index, rawValue) => {
    const clean = rawValue.replace(/\D/g, '');
    setError('');
    setPrefilledFromEmail(false);

    if (!clean) {
      const next = [...digits];
      next[index] = '';
      setDigits(next);
      return;
    }

    // Handle multi-digit insertion (SMS/email autofill or predictive paste)
    if (clean.length > 1) {
      const next = [...digits];
      const chars = clean.slice(0, OTP_LENGTH - index).split('');
      chars.forEach((ch, offset) => {
        next[index + offset] = ch;
      });
      setDigits(next);

      const nextFocus = Math.min(OTP_LENGTH - 1, index + chars.length);
      inputRefs.current[nextFocus]?.focus();

      const full = next.join('');
      if (full.length === OTP_LENGTH && /^\d{6}$/.test(full)) {
        submitOtp(full);
      }
      return;
    }

    const next = [...digits];
    next[index] = clean;
    setDigits(next);

    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const full = next.join('');
    if (full.length === OTP_LENGTH && /^\d{6}$/.test(full)) {
      submitOtp(full);
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
        setError('');
      } else if (index > 0) {
        e.preventDefault();
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      inputRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      inputRefs.current[OTP_LENGTH - 1]?.focus();
    } else if (e.key === 'Enter' && otpString.length === OTP_LENGTH) {
      e.preventDefault();
      submitOtp(otpString);
    }
  };

  const applyCodeText = (text) => {
    const extracted = String(text || '').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (extracted.length === 0) return false;

    const next = EMPTY_DIGITS.map((_, idx) => extracted[idx] || '');
    setDigits(next);
    setError('');
    setPrefilledFromEmail(false);

    const targetIndex = Math.min(OTP_LENGTH - 1, extracted.length);
    inputRefs.current[targetIndex]?.focus();

    if (slotsContainerRef.current) {
      gsap.fromTo(
        '.otp-digit-slot',
        { scale: 0.94 },
        { scale: 1, duration: 0.25, stagger: 0.03, ease: 'back.out(1.6)', clearProps: 'transform' }
      );
    }

    if (extracted.length === OTP_LENGTH) {
      submitOtp(extracted);
    }
    return true;
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData?.getData('text') || '';
    if (!applyCodeText(pasted)) {
      toast.info(t('auth.otpClipboardEmpty'));
    }
  };

  const handlePasteButton = async () => {
    if (!navigator.clipboard?.readText) {
      toast.info(t('auth.otpClipboardDenied'));
      return;
    }
    try {
      const clipText = await navigator.clipboard.readText();
      if (!applyCodeText(clipText)) {
        toast.info(t('auth.otpClipboardEmpty'));
      }
    } catch {
      toast.info(t('auth.otpClipboardDenied'));
    }
  };

  const handleCopyEnteredOtp = async () => {
    if (!otpString) return;
    try {
      await navigator.clipboard.writeText(otpString);
      setCopiedLocal(true);
      toast.success(t('auth.otpCopiedToast'));
      setTimeout(() => setCopiedLocal(false), 1800);
    } catch {
      toast.info(t('auth.otpClipboardDenied'));
    }
  };

  const handleClearDigits = () => {
    setDigits(EMPTY_DIGITS);
    setError('');
    setPrefilledFromEmail(false);
    inputRefs.current[0]?.focus();
  };

  const handleResendOtp = async () => {
    if (resending || resendSecondsLeft > 0) return;
    if (!activeEmail) {
      setError(t('auth.otpEmailMissingError'));
      setEditingEmail(true);
      return;
    }

    setResending(true);
    setError('');
    try {
      const res = await authApi.resendOtp({
        email: activeEmail,
        verificationToken: sessionInfo.verificationToken || undefined,
        language
      });

      const nextSession = savePendingOtpSession({
        ...sessionInfo,
        ...(res.data?.data || {}),
        email: activeEmail
      });
      setSessionInfo(nextSession);
      setAttemptsRemaining(null);
      setDigits(EMPTY_DIGITS);
      setPrefilledFromEmail(false);
      setEditingEmail(false);
      setNowMs(Date.now());
      toast.success(t('auth.otpResentToast'));
      requestAnimationFrame(() => inputRefs.current[0]?.focus());
    } catch (err) {
      const retryAfter = err?.response?.data?.retryAfter;
      if (typeof retryAfter === 'number' && retryAfter > 0) {
        const syncedSession = savePendingOtpSession({
          ...sessionInfo,
          resendCooldown: retryAfter,
          resendAvailableAt: Date.now() + retryAfter * 1000
        });
        setSessionInfo(syncedSession);
        setNowMs(Date.now());
      }
      setError(extractErrorMessage(err));
      triggerErrorShake();
    } finally {
      setResending(false);
    }
  };

  const steps = [
    { key: 'account', label: t('auth.otpStepAccount'), done: true, active: false },
    { key: 'verify', label: t('auth.otpStepVerify'), done: verifiedSuccess, active: !verifiedSuccess },
    { key: 'workspace', label: t('auth.otpStepWorkspace'), done: verifiedSuccess, active: verifiedSuccess }
  ];

  return (
    <section
      ref={rootRef}
      className="hero-mesh bg-grid-slate relative flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 sm:px-6"
    >
      <div className="w-full max-w-lg">
        {/* 3-Step Flow Stepper */}
        <div className="otp-stagger mb-6 flex items-center justify-center gap-2 sm:gap-3">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold transition-colors ${
                    step.done
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                      : step.active
                        ? 'bg-brand-600 text-white ring-4 ring-brand-500/20'
                        : 'border border-slate-300 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  {step.done ? <Check className="h-3.5 w-3.5" /> : `0${index + 1}`}
                </span>
                <span
                  className={`text-xs font-bold ${
                    step.done || step.active
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 w-6 rounded-full sm:w-10 ${
                    step.done ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Main Card */}
        <div className="otp-stagger glass-card relative overflow-hidden rounded-3xl p-6 sm:p-8">
          {/* Expiry Progress Top Bar */}
          {!verifiedSuccess && (
            <div className="absolute inset-x-0 top-0 h-1 bg-slate-200/70 dark:bg-slate-800">
              <div
                className={`h-full transition-all duration-1000 ${
                  expiresSecondsLeft === 0
                    ? 'bg-rose-500'
                    : expiresSecondsLeft < 120
                      ? 'bg-amber-500'
                      : 'bg-gradient-to-r from-brand-500 to-emerald-400'
                }`}
                style={{ width: `${expiryProgressPct}%` }}
              />
            </div>
          )}

          {verifiedSuccess ? (
            <div ref={successCardRef} className="flex flex-col items-center py-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 shadow-lg shadow-emerald-500/20 dark:bg-emerald-950/80 dark:text-emerald-400">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {t('auth.otpVerifiedTitle')}
              </h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {t('auth.otpVerifiedDesc')}
              </p>
              <div className="mt-6 h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Security Header */}
              <div className="otp-stagger text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-700 text-white shadow-lg shadow-brand-600/25">
                  <MailCheck className="h-7 w-7" />
                </div>

                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50/90 px-3 py-1 text-xs font-bold text-brand-700 dark:border-brand-800/80 dark:bg-brand-950/60 dark:text-brand-300">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>
                    {sessionInfo.authProvider === 'google'
                      ? t('auth.otpProviderGoogle')
                      : t('auth.otpProviderEmail')}
                  </span>
                </div>

                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {t('auth.otpTitle')}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {t('auth.otpSubtitle')}
                </p>
              </div>

              {/* Target Email Context Strip */}
              <div className="otp-stagger mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3.5 dark:border-slate-800 dark:bg-slate-900/70">
                {editingEmail ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('auth.emailLabel')}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder={t('auth.emailPlaceholder')}
                          className="input-field py-2 pl-10 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!activeEmail) return;
                          const updated = savePendingOtpSession({ ...sessionInfo, email: activeEmail });
                          setSessionInfo(updated);
                          setEditingEmail(false);
                        }}
                        className="btn-secondary shrink-0 px-3 py-2 text-xs"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm dark:bg-slate-800 dark:text-brand-400">
                        <Mail className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {t('auth.otpSentTo')}
                        </p>
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {activeEmail}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isGmailTarget && (
                        <a
                          href="https://mail.google.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:text-brand-400"
                        >
                          <span>{t('auth.otpOpenGmail')}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingEmail(true)}
                        title={t('auth.otpChangeEmail')}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{t('auth.otpChangeEmail')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery Warning / Dev Ethereal Link */}
              {!sessionInfo.emailSent && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t('auth.otpDeliveryWarn')}</span>
                </div>
              )}

              {sessionInfo.previewUrl && (
                <a
                  href={sessionInfo.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-100 dark:border-sky-800/70 dark:bg-sky-950/40 dark:text-sky-300"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{t('auth.otpPreviewLink')}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              {prefilledFromEmail && !error && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t('auth.otpPrefilledBanner')}</span>
                </div>
              )}

              {/* Error Banner */}
              {error && (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 dark:border-rose-800/70 dark:bg-rose-950/50 dark:text-rose-300">
                  <p>{error}</p>
                  {typeof attemptsRemaining === 'number' && attemptsRemaining > 0 && (
                    <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {t('auth.otpAttemptsLeft', { count: attemptsRemaining })}
                    </p>
                  )}
                </div>
              )}

              {/* 6-Digit OTP Input Matrix */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitOtp();
                }}
                className="otp-stagger mt-6"
              >
                <div
                  ref={slotsContainerRef}
                  onPaste={handlePaste}
                  className="flex items-center justify-center gap-2 sm:gap-2.5"
                >
                  {digits.map((digit, index) => (
                    <div key={index} className="flex items-center gap-2 sm:gap-2.5">
                      <input
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        aria-label={`OTP digit ${index + 1}`}
                        maxLength={OTP_LENGTH}
                        disabled={submitting}
                        value={digit}
                        onChange={(e) => handleDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(index, e)}
                        onFocus={(e) => e.target.select()}
                        className={`otp-digit-slot h-12 w-10 rounded-2xl border-2 bg-white text-center font-mono text-xl font-extrabold tabular-nums transition-all focus:outline-none sm:h-14 sm:w-12 sm:text-3xl dark:bg-slate-900 ${
                          error
                            ? 'border-rose-400 text-rose-600 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15 dark:border-rose-700 dark:text-rose-400'
                            : digit
                              ? 'border-brand-500 bg-brand-50/40 text-slate-900 shadow-sm shadow-brand-500/10 focus:ring-4 focus:ring-brand-500/20 dark:border-brand-500 dark:bg-brand-950/30 dark:text-white'
                              : 'border-slate-200 text-slate-900 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 dark:border-slate-700 dark:text-white dark:focus:border-brand-400'
                        }`}
                      />
                      {index === 2 && (
                        <span className="select-none text-lg font-bold text-slate-300 dark:text-slate-600">
                          —
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Quick Clipboard & Clear Actions */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={handlePasteButton}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-brand-300 hover:bg-brand-50/60 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:border-brand-700 dark:hover:text-brand-300"
                  >
                    <ClipboardPaste className="h-3.5 w-3.5" />
                    <span>{t('auth.otpPasteBtn')}</span>
                  </button>

                  {otpString.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleCopyEnteredOtp}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
                      >
                        {copiedLocal ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        <span>{t('auth.otpCopyBtn')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClearDigits}
                        className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>{t('auth.otpClearBtn')}</span>
                      </button>
                    </>
                  )}
                </div>

                {/* Live Timer + Resend Row */}
                <div className="mt-5 flex flex-col items-center justify-between gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-xs sm:flex-row dark:border-slate-800 dark:bg-slate-900/50">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <Clock
                      className={`h-4 w-4 ${
                        expiresSecondsLeft === 0
                          ? 'text-rose-500'
                          : expiresSecondsLeft < 120
                            ? 'text-amber-500'
                            : 'text-brand-600 dark:text-brand-400'
                      }`}
                    />
                    <span
                      className={
                        expiresSecondsLeft === 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'font-mono tabular-nums text-slate-600 dark:text-slate-300'
                      }
                    >
                      {expiresSecondsLeft > 0
                        ? t('auth.otpExpiresIn', { time: formatCountdown(expiresSecondsLeft) })
                        : t('auth.otpExpired')}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={resending || resendSecondsLeft > 0}
                    onClick={handleResendOtp}
                    className={`inline-flex items-center gap-1.5 font-bold transition ${
                      resendSecondsLeft > 0 || resending
                        ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
                        : 'text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400'
                    }`}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                    <span>
                      {resendSecondsLeft > 0
                        ? t('auth.otpResendIn', { seconds: resendSecondsLeft })
                        : t('auth.otpResendBtn')}
                    </span>
                  </button>
                </div>

                {/* Primary Submit CTA */}
                <button
                  ref={verifyBtnRef}
                  type="submit"
                  disabled={submitting || otpString.length !== OTP_LENGTH}
                  className="btn-primary mt-5 w-full py-3"
                >
                  <span>{submitting ? t('auth.otpVerifyingBtn') : t('auth.otpVerifyBtn')}</span>
                  {!submitting && <ArrowRight className="h-4 w-4" />}
                </button>
              </form>

              <p className="mt-4 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {t('auth.otpCheckSpamTip')}
              </p>
            </>
          )}
        </div>

        {/* Minimal Navigation Back Link */}
        {!verifiedSuccess && (
          <div className="otp-stagger mt-5 flex items-center justify-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link
              to="/register"
              className="inline-flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t('auth.otpBackToRegister')}</span>
            </Link>
            <span>&bull;</span>
            <Link to="/login" className="hover:text-brand-600 dark:hover:text-brand-400">
              {t('auth.backToLogin')}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
