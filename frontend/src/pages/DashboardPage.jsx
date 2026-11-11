import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import {
  Award,
  Bookmark,
  FileText,
  MailWarning,
  Sparkles,
  TrendingUp,
  UploadCloud,
  ArrowRight
} from 'lucide-react';
import { authApi, extractErrorMessage, jobApi, resumeApi, userApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { APPLICATION_STATUSES } from '../i18n/translations';
import { formatDate, getScoreTone } from '../utils/formatters';

export default function DashboardPage() {
  const { user } = useAuth();
  const { language, t, tEnum } = useLanguage();
  const toast = useToast();
  const rootRef = useRef(null);

  const [stats, setStats] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingVerify, setSendingVerify] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.allSettled([
      userApi.getStats(),
      resumeApi.getResumes(),
      jobApi.getRecommended()
    ])
      .then(([statsRes, resumesRes, recRes]) => {
        if (!active) return;
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data?.data || null);
        if (resumesRes.status === 'fulfilled') setResumes(resumesRes.value.data?.data || []);
        if (recRes.status === 'fulfilled') setRecommended(recRes.value.data?.data || []);
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

  const apps = stats?.applications || {};
  const totalTracked = APPLICATION_STATUSES.reduce((sum, key) => sum + (Number(apps[key]) || 0), 0);
  const resumeSummary = stats?.resumes || {};
  const avgScore = Math.round(Number(resumeSummary.averageScore) || 0);
  const highScore = Math.round(Number(resumeSummary.highestScore) || 0);
  const totalResumes = Number(resumeSummary.totalResumes) || resumes.length || 0;
  const topSkills = stats?.topSkills || [];
  const maxSkillCount = Math.max(1, ...topSkills.map((s) => Number(s.count) || 1));

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
      label: t('dashboard.kpis.savedTracked'),
      value: totalTracked,
      icon: Bookmark,
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
          {/* Application Pipeline */}
          <section className="dash-animate surface-card rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t('dashboard.pipelineTitle')}
              </h2>
              <Link
                to="/saved-jobs"
                className="text-xs font-bold text-brand-600 hover:underline dark:text-brand-400"
              >
                {t('nav.savedJobs')}
              </Link>
            </div>

            <div className="mt-5 space-y-3.5">
              {APPLICATION_STATUSES.map((status) => {
                const count = Number(apps[status]) || 0;
                const widthPct = totalTracked > 0 ? Math.round((count / totalTracked) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-700 dark:text-slate-300">
                        {tEnum('applicationStatuses', status)}
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
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

          {/* AI Recommended Jobs */}
          <section className="dash-animate surface-card rounded-3xl p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Sparkles className="h-4 w-4 text-brand-500" />
              <span>{t('dashboard.recommendedTitle')}</span>
            </h2>

            {recommended.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                {t('dashboard.noMatches')}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {recommended.slice(0, 4).map((job) => {
                  const jobId = job._id || job.id;
                  const score = typeof job.matchScore === 'number' ? Math.round(job.matchScore) : null;
                  const tone = getScoreTone(score ?? 0);
                  return (
                    <Link
                      key={jobId}
                      to={`/jobs/${jobId}`}
                      className="block rounded-2xl border border-slate-200/80 p-3.5 transition-all hover:border-brand-300 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:border-brand-700/70 dark:hover:bg-slate-800/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {job.title}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {job.company} • {job.location}
                          </p>
                        </div>
                        {score !== null && (
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${tone.badge}`}
                          >
                            {score}%
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
