import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import {
  Award,
  FileText,
  MailWarning,
  Sparkles,
  TrendingUp,
  UploadCloud,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Target
} from 'lucide-react';
import { authApi, extractErrorMessage, resumeApi, userApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { formatDate, getScoreTone } from '../utils/formatters';
import { generateCareerDiagnostics } from '../utils/careerDiagnostics';

export default function DashboardPage() {
  const { user } = useAuth();
  const { language, t, tEnum } = useLanguage();
  const toast = useToast();
  const rootRef = useRef(null);

  const [stats, setStats] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [dailyQuota, setDailyQuota] = useState({ limit: 5, used: 0, remaining: 5, resetsAt: null });
  const [loading, setLoading] = useState(true);
  const [sendingVerify, setSendingVerify] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.allSettled([
      userApi.getStats(),
      resumeApi.getResumes(),
      resumeApi.getDailyQuota()
    ])
      .then(([statsRes, resumesRes, quotaRes]) => {
        if (!active) return;
        if (statsRes.status === 'fulfilled') {
          const statsData = statsRes.value.data?.data || null;
          setStats(statsData);
          if (statsData?.dailyQuota) setDailyQuota(statsData.dailyQuota);
        }
        if (resumesRes.status === 'fulfilled') {
          setResumes(resumesRes.value.data?.data || []);
        }
        if (quotaRes.status === 'fulfilled' && quotaRes.value.data?.data) {
          setDailyQuota(quotaRes.value.data.data);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading || !rootRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      gsap.from('.dash-animate', {
        y: 20,
        opacity: 0,
        duration: 0.55,
        stagger: 0.06,
        ease: 'power2.out'
      });
    }, rootRef);

    return () => ctx.revert();
  }, [loading]);

  const handleResendVerification = async () => {
    setSendingVerify(true);
    try {
      const res = await authApi.resendVerification();
      toast.success(res.data?.message || 'Verification email sent');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSendingVerify(false);
    }
  };

  const resumeSummary = stats?.resumes || {};
  const avgScore = Math.round(Number(resumeSummary.averageScore) || 0);
  const highScore = Math.round(Number(resumeSummary.highestScore) || 0);
  const totalResumes = Number(resumeSummary.totalResumes) || resumes.length || 0;
  const topSkills = stats?.topSkills || [];
  const maxSkillCount = Math.max(1, ...topSkills.map((s) => Number(s.count) || 1));

  const latestResume = resumes[0] || null;
  const diagnostics = generateCareerDiagnostics(latestResume?.parsedData, latestResume?.analysis);

  const kpiCards = [
    {
      label: t('dashboard.kpis.totalResumes'),
      value: totalResumes,
      icon: FileText,
      accent: 'text-brand-600 bg-brand-50 dark:text-brand-400 dark:bg-brand-950/60'
    },
    {
      label: t('dashboard.kpis.avgScore'),
      value: `${avgScore}%`,
      icon: TrendingUp,
      accent: 'text-sky-600 bg-sky-50 dark:text-sky-400 dark:bg-sky-950/60'
    },
    {
      label: t('dashboard.kpis.highScore'),
      value: `${highScore}%`,
      icon: Award,
      accent: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/60'
    },
    {
      label: t('dashboard.kpis.dailyQuota'),
      value: `${dailyQuota.used} / ${dailyQuota.limit}`,
      icon: Sparkles,
      accent: 'text-violet-600 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/60'
    }
  ];

  return (
    <div ref={rootRef} className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {t('dashboard.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {user?.name ? `${user.name} — ` : ''}
            {t('dashboard.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Link to="/resumes" className="btn-primary">
            <UploadCloud className="h-4 w-4" />
            <span>{t('dashboard.uploadNewBtn')}</span>
          </Link>
        </div>
      </div>

      {/* Email Verification Alert */}
      {user && user.isEmailVerified === false && (
        <div className="mt-6 flex flex-col justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 sm:flex-row sm:items-center dark:border-amber-800/70 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                {t('settings.verifyBannerTitle')}
              </p>
              <p className="text-xs text-amber-800/90 dark:text-amber-300/80">
                {t('settings.verifyBannerDesc')}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={sendingVerify}
            onClick={handleResendVerification}
            className="btn-secondary shrink-0 border-amber-300 bg-white text-xs dark:border-amber-700 dark:bg-slate-900"
          >
            {sendingVerify ? t('common.loading') : t('settings.resendVerificationBtn')}
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="dash-animate surface-card rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {card.label}
                </span>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.accent}`}>
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {loading ? '—' : card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        {/* Left 7 cols */}
        <div className="space-y-6 lg:col-span-7">
          {/* Daily Quota & Resume Intelligence Hub */}
          <section className="dash-animate surface-card rounded-3xl p-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('dashboard.quotaTitle')}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {t('dashboard.quotaSubtitle')}
                </p>
              </div>
              <span
                className={`self-start rounded-full px-3 py-1 text-xs font-extrabold sm:self-center ${
                  dailyQuota.remaining <= 0
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                    : 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                }`}
              >
                {t('dashboard.quotaRemainingLabel', { remaining: dailyQuota.remaining })}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">
                  {t('dashboard.quotaProgress', { used: dailyQuota.used, limit: dailyQuota.limit })}
                </span>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {Math.round((dailyQuota.used / dailyQuota.limit) * 100)}%
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 via-indigo-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${Math.min(100, Math.round((dailyQuota.used / dailyQuota.limit) * 100))}%` }}
                />
              </div>
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <span>{t('dashboard.quotaResets')}</span>
                <span>{dailyQuota.limit} scans / day</span>
              </div>
            </div>

            {/* Platform highlights strip */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2 border-t border-slate-100 pt-5 dark:border-slate-800">
              <div className="flex items-center gap-2.5 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/60">
                <Cpu className="h-4 w-4 text-brand-600 dark:text-brand-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">AI Engine</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Deep bilingual ATS audit</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-2xl bg-slate-50 p-3 dark:bg-slate-900/60">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">PDF In-Memory</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Zero disk persistence</p>
                </div>
              </div>
            </div>
          </section>

          {/* Recent Resumes */}
          <section className="dash-animate surface-card rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t('dashboard.recentResumesTitle')}
              </h2>
              <Link
                to="/resumes"
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline dark:text-brand-400"
              >
                <span>{t('dashboard.viewAllResumes')}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {resumes.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('dashboard.noResumes')}
                </p>
                <Link to="/resumes" className="btn-primary mt-4 text-xs">
                  {t('dashboard.uploadNewBtn')}
                </Link>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800/80">
                {resumes.slice(0, 5).map((r) => {
                  const score = r.analysis?.score;
                  const tone = getScoreTone(score ?? 0);
                  return (
                    <Link
                      key={r._id}
                      to={`/resumes/${r._id}`}
                      className="flex items-center justify-between gap-4 py-3.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl px-2 -mx-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {r.fileName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(r.createdAt, language)} •{' '}
                          {tEnum('resumeStatuses', r.status)}
                        </p>
                      </div>
                      {typeof score === 'number' && (
                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-extrabold ${tone.badge}`}
                        >
                          {score} {t('dashboard.scoreSuffix')}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right 5 cols */}
        <div className="space-y-6 lg:col-span-5">
          {/* Top Skills */}
          <section className="dash-animate surface-card rounded-3xl p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('dashboard.topSkillsTitle')}
            </h2>

            {topSkills.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                {t('dashboard.noSkills')}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {topSkills.map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800 dark:text-slate-200">{item.name}</span>
                      <span className="font-mono text-slate-500">{item.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gold-500"
                        style={{ width: `${Math.round((item.count / maxSkillCount) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* AI Career Growth & Diagnostics ("Guess Works") */}
          <section className="dash-animate surface-card rounded-3xl p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Sparkles className="h-4 w-4 text-brand-500" />
              <span>{t('dashboard.careerGrowthTitle')}</span>
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t('dashboard.careerGrowthSubtitle')}
            </p>

            {resumes.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                {t('dashboard.noMatches')}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {diagnostics.targetRoles.slice(0, 3).map((role, idx) => {
                  const tone = getScoreTone(role.matchScore);
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-200/80 p-3.5 transition-all hover:border-brand-300 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:border-brand-700/70 dark:hover:bg-slate-800/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {role.title}
                          </p>
                          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {language === 'am' ? role.rationaleAm : role.rationaleEn}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${tone.badge}`}
                        >
                          {role.matchScore}%
                        </span>
                      </div>
                    </div>
                  );
                })}

                <Link
                  to="/resumes"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline dark:text-brand-400"
                >
                  <span>{t('dashboard.viewAllResumes')}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
