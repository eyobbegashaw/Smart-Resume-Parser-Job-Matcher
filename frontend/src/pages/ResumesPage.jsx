import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  Briefcase,
  CheckCircle2,
  FileText,
  Globe,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Trash2,
  UploadCloud
} from 'lucide-react';
import { extractErrorMessage, resumeApi } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import ScoreRing from '../components/ScoreRing';
import SkillGapPanel from '../components/SkillGapPanel';
import { formatDate, formatSalary, getScoreTone } from '../utils/formatters';

const MAX_BYTES = 5 * 1024 * 1024;

export default function ResumesPage() {
  const { id: routeResumeId } = useParams();
  const navigate = useNavigate();
  const { language, t, tEnum } = useLanguage();
  const toast = useToast();
  const fileInputRef = useRef(null);
  const didInitRef = useRef(false);

  const [resumes, setResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [selectedFile, setSelectedFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [analysisLang, setAnalysisLang] = useState(language);
  const [uploading, setUploading] = useState(false);
  const [stageIdx, setStageIdx] = useState(0);

  const [activeTab, setActiveTab] = useState('overview');
  const [gapByJob, setGapByJob] = useState({});
  const [gapLoadingJob, setGapLoadingJob] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    setAnalysisLang(language);
  }, [language]);

  const fetchResumeDetail = useCallback(async (resumeId) => {
    if (!resumeId) return;
    setLoadingDetail(true);
    try {
      const res = await resumeApi.getResume(resumeId);
      setSelectedResume(res.data?.data || null);
      setGapByJob({});
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoadingDetail(false);
    }
  }, [toast]);

  const refreshLibrary = useCallback(async (preferredId) => {
    setLoadingList(true);
    try {
      const res = await resumeApi.getResumes();
      const list = res.data?.data || [];
      setResumes(list);

      const targetId = preferredId || list[0]?._id;
      if (targetId) {
        await fetchResumeDetail(targetId);
      } else {
        setSelectedResume(null);
      }
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  }, [fetchResumeDetail, toast]);

  useEffect(() => {
    if (!didInitRef.current) {
      didInitRef.current = true;
      refreshLibrary(routeResumeId);
      return;
    }
    if (routeResumeId && routeResumeId !== selectedResume?._id) {
      fetchResumeDetail(routeResumeId);
    }
  }, [routeResumeId, selectedResume?._id, refreshLibrary, fetchResumeDetail]);

  useEffect(() => {
    if (!uploading) return;
    setStageIdx(0);
    const interval = setInterval(() => {
      setStageIdx((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(interval);
  }, [uploading]);

  const validateAndSetFile = (file) => {
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      toast.error(t('resumes.invalidFileType'));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t('resumes.fileTooLarge'));
      return;
    }
    setSelectedFile(file);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    try {
      const res = await resumeApi.uploadResume(selectedFile, analysisLang);
      const createdId = res.data?.data?.resumeId;
      toast.success(res.data?.data?.message || 'Resume parsed successfully');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setActiveTab('overview');
      await refreshLibrary(createdId);
      if (createdId) navigate(`/resumes/${createdId}`, { replace: true });
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (resume) => {
    if (!window.confirm(t('resumes.deleteConfirm', { name: resume.fileName }))) return;
    setDeletingId(resume._id);
    try {
      await resumeApi.deleteResume(resume._id);
      toast.success(t('resumes.deletedToast'));
      const remaining = resumes.filter((item) => item._id !== resume._id);
      setResumes(remaining);
      if (selectedResume?._id === resume._id) {
        const nextId = remaining[0]?._id;
        if (nextId) {
          navigate(`/resumes/${nextId}`, { replace: true });
          await fetchResumeDetail(nextId);
        } else {
          setSelectedResume(null);
          navigate('/resumes', { replace: true });
        }
      }
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const handleAnalyzeGap = async (jobId) => {
    if (!selectedResume?._id || !jobId) return;
    setGapLoadingJob(jobId);
    try {
      const res = await resumeApi.analyzeSkillGap(selectedResume._id, jobId, analysisLang);
      setGapByJob((prev) => ({ ...prev, [jobId]: res.data?.data }));
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setGapLoadingJob(null);
    }
  };

  const stages = t('resumes.stages');
  const parsed = selectedResume?.parsedData || {};
  const analysis = selectedResume?.analysis || {};
  const matchedJobs = selectedResume?.matchedJobs || [];

  const severityBadge = (severity) => {
    if (severity === 'high') {
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/70';
    }
    if (severity === 'low') {
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/70';
    }
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70';
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          {t('resumes.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('resumes.subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Sidebar: Upload + Library */}
        <div className="space-y-6 lg:col-span-4">
          <form onSubmit={handleUpload} className="surface-card rounded-3xl p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <UploadCloud className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              <span>{t('resumes.uploadCardTitle')}</span>
            </h2>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                validateAndSetFile(e.dataTransfer.files?.[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-all ${
                dragActive
                  ? 'border-brand-500 bg-brand-50/70 dark:border-brand-400 dark:bg-brand-950/40'
                  : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50/70 dark:border-slate-700 dark:hover:border-brand-600 dark:hover:bg-slate-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => validateAndSetFile(e.target.files?.[0])}
              />
              <FileText className="h-8 w-8 text-brand-600 dark:text-brand-400" />
              <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                {dragActive ? t('resumes.dropActive') : t('resumes.dropIdle')}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {t('resumes.dropConstraints')}
              </p>
            </div>

            {selectedFile && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300">
                <span className="truncate">
                  {t('resumes.selectedFile')}: {selectedFile.name}
                </span>
                <span className="ml-2 shrink-0 font-mono">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            )}

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {t('resumes.outputLanguage')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['en', 'am'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setAnalysisLang(code)}
                    className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all ${
                      code === 'am' ? 'font-ethiopic' : ''
                    } ${
                      analysisLang === code
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-500 dark:bg-brand-950/60 dark:text-brand-300'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t(`lang.${code}Full`)}
                  </button>
                ))}
              </div>
            </div>

            {uploading && Array.isArray(stages) && (
              <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
                {stages.map((label, idx) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        idx <= stageIdx
                          ? 'bg-brand-500 animate-pulse'
                          : 'bg-slate-300 dark:bg-slate-700'
                      }`}
                    />
                    <span
                      className={
                        idx <= stageIdx
                          ? 'font-semibold text-slate-900 dark:text-white'
                          : 'text-slate-400 dark:text-slate-500'
                      }
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedFile || uploading}
              className="btn-primary mt-5 w-full"
            >
              <Sparkles className="h-4 w-4" />
              <span>{uploading ? t('resumes.analyzing') : t('resumes.analyzeBtn')}</span>
            </button>
          </form>

          {/* Uploaded Library */}
          <div className="surface-card rounded-3xl p-5 sm:p-6">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {t('resumes.historyTitle')}
            </h2>

            {loadingList ? (
              <div className="mt-4 space-y-2">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/60"
                  />
                ))}
              </div>
            ) : resumes.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                {t('resumes.emptyLibrary')}
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {resumes.map((item) => {
                  const isActive = selectedResume?._id === item._id;
                  const score = item.analysis?.score;
                  const tone = getScoreTone(score ?? 0);
                  return (
                    <div
                      key={item._id}
                      className={`flex items-center justify-between gap-2 rounded-2xl border p-3 transition-all ${
                        isActive
                          ? 'border-brand-400 bg-brand-50/60 dark:border-brand-600 dark:bg-brand-950/30'
                          : 'border-slate-200/80 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          navigate(`/resumes/${item._id}`);
                          fetchResumeDetail(item._id);
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {item.fileName}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {formatDate(item.createdAt, language)}
                        </p>
                      </button>
                      {typeof score === 'number' && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-extrabold ${tone.badge}`}
                        >
                          {score}%
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={deletingId === item._id}
                        onClick={() => handleDelete(item)}
                        aria-label={t('resumes.deleteResume')}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Detail Workspace */}
        <div className="lg:col-span-8">
          {loadingDetail ? (
            <div className="surface-card flex min-h-[420px] items-center justify-center rounded-3xl">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            </div>
          ) : !selectedResume ? (
            <div className="surface-card flex min-h-[420px] flex-col items-center justify-center rounded-3xl p-10 text-center">
              <FileText className="h-12 w-12 text-slate-300 dark:text-slate-700" />
              <p className="mt-4 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                {t('resumes.emptyLibrary')}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Top Profile + Score Summary */}
              <div className="surface-card rounded-3xl p-6 sm:p-8">
                <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                      <Sparkles className="h-3.5 w-3.5" />
                      {t('resumes.candidateProfile')}
                    </span>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      {parsed.name || selectedResume.fileName}
                    </h2>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      {parsed.email && (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {parsed.email}
                        </span>
                      )}
                      {parsed.phone && (
                        <span className="inline-flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {parsed.phone}
                        </span>
                      )}
                      {parsed.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {parsed.location}
                        </span>
                      )}
                    </div>
                  </div>

                  <ScoreRing score={analysis.score || 0} label={t('resumes.scoreLabel')} />
                </div>

                <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
                  {parsed.summary || t('resumes.noSummary')}
                </p>

                {/* Tabs */}
                <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-200/80 pt-5 dark:border-slate-800">
                  {['overview', 'skills', 'experience', 'matches'].map((tabKey) => (
                    <button
                      key={tabKey}
                      type="button"
                      onClick={() => setActiveTab(tabKey)}
                      className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                        activeTab === tabKey
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                      }`}
                    >
                      {t(`resumes.tabs.${tabKey}`)}
                      {tabKey === 'matches' && ` (${matchedJobs.length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="surface-card rounded-3xl p-6">
                      <h3 className="flex items-center gap-2 text-base font-bold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-5 w-5" />
                        <span>{t('resumes.strengths')}</span>
                      </h3>
                      <ul className="mt-4 space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                        {(analysis.strengths || []).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="surface-card rounded-3xl p-6">
                      <h3 className="flex items-center gap-2 text-base font-bold text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-5 w-5" />
                        <span>{t('resumes.weaknesses')}</span>
                      </h3>
                      <ul className="mt-4 space-y-2.5 text-sm text-slate-700 dark:text-slate-300">
                        {(analysis.weaknesses || []).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="surface-card rounded-3xl p-6">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {t('resumes.detailedFeedback')}
                    </h3>
                    <div className="mt-4 space-y-3">
                      {(analysis.feedback || []).map((item, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {item.category}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${severityBadge(
                                item.severity
                              )}`}
                            >
                              {tEnum('severities', item.severity)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                            {item.message}
                          </p>
                          {item.suggestion && (
                            <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-900/70 dark:text-slate-400">
                              {item.suggestion}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'skills' && (
                <div className="surface-card space-y-6 rounded-3xl p-6">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('resumes.hardSkills')}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(parsed.skills?.hard || []).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800 dark:border-brand-800/70 dark:bg-brand-950/60 dark:text-brand-300"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('resumes.softSkills')}
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(parsed.skills?.soft || []).map((skill) => (
                        <span
                          key={skill}
                          className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <Globe className="h-4 w-4" />
                      <span>{t('resumes.languagesSpoken')}</span>
                    </h3>
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {(parsed.languages || []).map((lang, i) => (
                        <div
                          key={`${lang.name}-${i}`}
                          className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs dark:border-slate-700"
                        >
                          <span className="font-bold text-slate-900 dark:text-white">{lang.name}</span>
                          {lang.proficiency && (
                            <span className="ml-2 text-slate-500 dark:text-slate-400">
                              • {lang.proficiency}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'experience' && (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="surface-card rounded-3xl p-6">
                    <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                      <Briefcase className="h-5 w-5 text-brand-500" />
                      <span>{t('resumes.experienceTitle')}</span>
                    </h3>
                    <div className="mt-5 space-y-5 border-l-2 border-slate-200 pl-4 dark:border-slate-800">
                      {(parsed.experience || []).map((exp, idx) => (
                        <div key={idx} className="relative">
                          <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500" />
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {exp.role || t('resumes.roleFallback')}
                          </h4>
                          <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                            {exp.company} {exp.duration ? `• ${exp.duration}` : ''}
                          </p>
                          {(exp.responsibilities || []).length > 0 && (
                            <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                              {exp.responsibilities.map((r, rIdx) => (
                                <li key={rIdx}>• {r}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="surface-card rounded-3xl p-6">
                    <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                      <GraduationCap className="h-5 w-5 text-gold-500" />
                      <span>{t('resumes.educationTitle')}</span>
                    </h3>
                    <div className="mt-5 space-y-4">
                      {(parsed.education || []).map((edu, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800"
                        >
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {edu.degree} {edu.field ? `— ${edu.field}` : ''}
                          </h4>
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            {edu.institution} {edu.graduationYear ? `• ${edu.graduationYear}` : ''}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'matches' && (
                <div className="surface-card rounded-3xl p-6">
                  <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                    <Award className="h-5 w-5 text-brand-500" />
                    <span>{t('resumes.matchedJobsTitle')}</span>
                  </h3>

                  {matchedJobs.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                      {t('resumes.noMatchedJobs')}
                    </p>
                  ) : (
                    <div className="mt-5 space-y-4">
                      {matchedJobs.map((match, idx) => {
                        const jobObj =
                          match.jobId && typeof match.jobId === 'object' ? match.jobId : null;
                        const jobId = jobObj?._id || match.jobId;
                        const tone = getScoreTone(match.matchScore || 0);
                        const gapResult = gapByJob[jobId];

                        return (
                          <div
                            key={jobId || idx}
                            className="rounded-2xl border border-slate-200/90 p-5 dark:border-slate-800"
                          >
                            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                              <div>
                                {jobObj ? (
                                  <Link
                                    to={`/jobs/${jobId}`}
                                    className="text-base font-bold text-slate-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400"
                                  >
                                    {jobObj.title}
                                  </Link>
                                ) : (
                                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                                    {t('resumes.unavailableJob', {
                                      id: String(jobId).slice(-6)
                                    })}
                                  </p>
                                )}
                                {jobObj && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {jobObj.company} • {jobObj.location} •{' '}
                                    {formatSalary(jobObj.salary, t)}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span
                                  className={`rounded-full border px-3 py-1 text-xs font-extrabold ${tone.badge}`}
                                >
                                  {Math.round(match.matchScore || 0)}%
                                </span>
                                {jobObj && jobId && (
                                  <button
                                    type="button"
                                    disabled={gapLoadingJob === jobId}
                                    onClick={() => handleAnalyzeGap(jobId)}
                                    className="btn-secondary px-3 py-1.5 text-xs"
                                  >
                                    <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                                    <span>
                                      {gapLoadingJob === jobId
                                        ? t('resumes.runningGap')
                                        : t('resumes.runGapBtn')}
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {gapResult && (
                              <div className="mt-4">
                                <SkillGapPanel analysis={gapResult} />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
