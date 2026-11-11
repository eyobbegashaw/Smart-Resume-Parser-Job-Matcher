import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  Eye,
  Mail,
  MapPin,
  Sparkles
} from 'lucide-react';
import { extractErrorMessage, jobApi, resumeApi, userApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import SkillGapPanel from '../components/SkillGapPanel';
import { formatDate, formatSalary, normalizeSkillNames } from '../utils/formatters';

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { language, t, tEnum } = useLanguage();
  const toast = useToast();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(isAuthenticated ? '/dashboard' : '/');
    }
  };

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [gapAnalysis, setGapAnalysis] = useState(null);
  const [analyzingGap, setAnalyzingGap] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    jobApi
      .getJob(id)
      .then((res) => {
        if (active) setJob(res.data?.data || null);
      })
      .catch((err) => {
        if (active) toast.error(extractErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, toast]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let active = true;
    Promise.allSettled([resumeApi.getResumes(), userApi.getSavedJobs({ limit: 50 })]).then(
      ([resumesRes, savedRes]) => {
        if (!active) return;
        if (resumesRes.status === 'fulfilled') {
          const completed = (resumesRes.value.data?.data || []).filter(
            (r) => r.status === 'completed'
          );
          setResumes(completed);
          if (completed[0]?._id) setSelectedResumeId(completed[0]._id);
        }
        if (savedRes.status === 'fulfilled') {
          const savedList = savedRes.value.data?.data || [];
          setIsSaved(savedList.some((s) => (s.jobId?._id || s.jobId) === id));
        }
      }
    );
    return () => {
      active = false;
    };
  }, [id, isAuthenticated]);

  const handleToggleSave = async () => {
    if (!isAuthenticated) {
      toast.info(t('auth.loginTitle'));
      return;
    }
    setSaving(true);
    try {
      if (isSaved) {
        await userApi.removeSavedJob(id);
        setIsSaved(false);
        toast.info(t('jobs.jobUnsavedToast'));
      } else {
        await userApi.saveJob(id, { status: 'saved' });
        setIsSaved(true);
        toast.success(t('jobs.jobSavedToast'));
      }
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyzeGap = async () => {
    if (!selectedResumeId) return;
    setAnalyzingGap(true);
    try {
      const res = await resumeApi.analyzeSkillGap(selectedResumeId, id, language);
      setGapAnalysis(res.data?.data || null);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setAnalyzingGap(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="surface-card rounded-3xl p-10">
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">
            {t('common.noData')}
          </p>
          <button type="button" onClick={handleGoBack} className="btn-secondary mt-5">
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  const requiredSkillNames = normalizeSkillNames(job.requiredSkills);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={handleGoBack}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{t('common.back')}</span>
      </button>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Main Job Details */}
        <div className="space-y-6 lg:col-span-8">
          <div className="surface-card rounded-3xl p-6 sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                  <Building2 className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                    {job.title}
                  </h1>
                  <p className="mt-1 text-base font-semibold text-brand-600 dark:text-brand-400">
                    {job.company}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleToggleSave}
                  className={isSaved ? 'btn-primary' : 'btn-secondary'}
                >
                  <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
                  <span>{isSaved ? t('jobs.unsaveJob') : t('jobs.saveJob')}</span>
                </button>

                {job.applicationUrl && (
                  <a
                    href={job.applicationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary"
                  >
                    <span>{t('jobs.applyExternal')}</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}

                {job.applicationEmail && (
                  <a href={`mailto:${job.applicationEmail}`} className="btn-secondary">
                    <Mail className="h-4 w-4" />
                    <span>{t('jobs.applyEmail')}</span>
                  </a>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3 border-y border-slate-100 py-4 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-brand-500" />
                {job.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                {tEnum('jobTypes', job.jobType)}
              </span>
              {job.experienceLevel && (
                <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 dark:bg-slate-800">
                  {tEnum('experienceLevels', job.experienceLevel)}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-400" />
                {t('jobs.postedOn')}: {formatDate(job.postedDate || job.createdAt, language)}
              </span>
              {job.expiryDate && (
                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                  {t('jobs.expiresOn')}: {formatDate(job.expiryDate, language)}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-slate-400" />
                {t('common.views', { count: job.views || 0 })}
              </span>
            </div>

            <div className="mt-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('jobs.salaryCompensation')}
                </h2>
                <p className="mt-1 text-lg font-extrabold text-brand-600 dark:text-brand-400">
                  {formatSalary(job.salary, t)}
                </p>
              </div>

              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('jobs.description')}
                </h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {job.description}
                </p>
              </div>

              {Array.isArray(job.responsibilities) && job.responsibilities.length > 0 && (
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('jobs.responsibilities')}
                  </h2>
                  <ul className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    {job.responsibilities.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(job.requirements) && job.requirements.length > 0 && (
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('jobs.requirements')}
                  </h2>
                  <ul className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    {job.requirements.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {requiredSkillNames.length > 0 && (
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('jobs.requiredSkills')}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {requiredSkillNames.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800 dark:border-brand-800/70 dark:bg-brand-950/60 dark:text-brand-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {Array.isArray(job.preferredSkills) && job.preferredSkills.length > 0 && (
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {t('jobs.preferredSkills')}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {job.preferredSkills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Sidebar: Skill Gap Analyzer */}
        <aside className="lg:col-span-4">
          <div className="surface-card sticky top-24 rounded-3xl p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Sparkles className="h-5 w-5 text-brand-500" />
              <span>{t('jobs.skillGapCardTitle')}</span>
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {t('jobs.skillGapSubtitle')}
            </p>

            {!isAuthenticated ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {t('jobs.loginForGap')}
                </p>
                <Link to="/login" className="btn-primary mt-3 w-full text-xs">
                  {t('nav.signIn')}
                </Link>
              </div>
            ) : resumes.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {t('jobs.uploadFirstForGap')}
                </p>
                <Link to="/resumes" className="btn-primary mt-3 w-full text-xs">
                  {t('dashboard.uploadNewBtn')}
                </Link>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    {t('jobs.selectResumeLabel')}
                  </label>
                  <select
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="input-field"
                  >
                    {resumes.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.fileName}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={!selectedResumeId || analyzingGap}
                  onClick={handleAnalyzeGap}
                  className="btn-primary w-full"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{analyzingGap ? t('resumes.runningGap') : t('jobs.runGapAnalysis')}</span>
                </button>

                {gapAnalysis && <SkillGapPanel analysis={gapAnalysis} />}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
