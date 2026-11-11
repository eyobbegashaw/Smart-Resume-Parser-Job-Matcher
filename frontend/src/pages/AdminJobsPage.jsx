import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, PlusCircle, Trash2 } from 'lucide-react';
import { extractErrorMessage, jobApi } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { ETHIOPIAN_LOCATIONS, EXPERIENCE_LEVELS, JOB_TYPES } from '../i18n/translations';
import { formatSalary, normalizeSkillNames } from '../utils/formatters';

const EMPTY_FORM = {
  title: '',
  company: '',
  location: 'Addis Ababa',
  jobType: 'Full-time',
  experienceLevel: 'Mid Level',
  industry: '',
  description: '',
  requiredSkillsText: '',
  preferredSkillsText: '',
  responsibilitiesText: '',
  requirementsText: '',
  salaryMin: '',
  salaryMax: '',
  salaryPeriod: 'monthly',
  applicationUrl: '',
  applicationEmail: ''
};

export default function AdminJobsPage() {
  const { t, tEnum } = useLanguage();
  const toast = useToast();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await jobApi.getJobs({ limit: 50, page: 1 });
      setJobs(res.data?.data || []);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  const startEdit = (job) => {
    setEditingId(job._id);
    setForm({
      title: job.title || '',
      company: job.company || '',
      location: job.location || 'Addis Ababa',
      jobType: job.jobType || 'Full-time',
      experienceLevel: job.experienceLevel || 'Mid Level',
      industry: job.industry || '',
      description: job.description || '',
      requiredSkillsText: normalizeSkillNames(job.requiredSkills).join(', '),
      preferredSkillsText: (job.preferredSkills || []).join(', '),
      responsibilitiesText: (job.responsibilities || []).join('\n'),
      requirementsText: (job.requirements || []).join('\n'),
      salaryMin: job.salary?.min ?? '',
      salaryMax: job.salary?.max ?? '',
      salaryPeriod: job.salary?.period || 'monthly',
      applicationUrl: job.applicationUrl || '',
      applicationEmail: job.applicationEmail || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const requiredSkills = form.requiredSkillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name, importance: 'required' }));

    if (requiredSkills.length === 0) {
      toast.error(t('admin.skillsRequiredError'));
      return;
    }

    if (
      form.salaryMin !== '' &&
      form.salaryMax !== '' &&
      Number(form.salaryMin) > Number(form.salaryMax)
    ) {
      toast.error(t('admin.salaryRangeError'));
      return;
    }

    const payload = {
      title: form.title.trim(),
      company: form.company.trim(),
      location: form.location.trim(),
      jobType: form.jobType,
      experienceLevel: form.experienceLevel,
      description: form.description.trim(),
      requiredSkills,
      preferredSkills: form.preferredSkillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      responsibilities: form.responsibilitiesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      requirements: form.requirementsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    };

    if (form.industry.trim()) payload.industry = form.industry.trim();
    if (form.applicationUrl.trim()) payload.applicationUrl = form.applicationUrl.trim();
    if (form.applicationEmail.trim()) payload.applicationEmail = form.applicationEmail.trim();

    if (form.salaryMin !== '' || form.salaryMax !== '') {
      payload.salary = {
        currency: 'ETB',
        period: form.salaryPeriod
      };
      if (form.salaryMin !== '') payload.salary.min = Number(form.salaryMin);
      if (form.salaryMax !== '') payload.salary.max = Number(form.salaryMax);
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await jobApi.updateJob(editingId, payload);
        toast.success(t('admin.updateBtn'));
      } else {
        await jobApi.createJob(payload);
        toast.success(t('admin.createBtn'));
      }
      resetForm();
      await loadJobs();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (job) => {
    if (!window.confirm(t('admin.deleteConfirm', { title: job.title }))) return;
    try {
      await jobApi.deleteJob(job._id);
      setJobs((prev) => prev.filter((item) => item._id !== job._id));
      toast.info(t('admin.deletedToast'));
      if (editingId === job._id) resetForm();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {t('admin.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('admin.subtitle')}</p>
        </div>
        {editingId && (
          <button type="button" onClick={resetForm} className="btn-secondary">
            <PlusCircle className="h-4 w-4" />
            <span>{t('admin.newJobBtn')}</span>
          </button>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="surface-card space-y-4 rounded-3xl p-6 lg:col-span-6"
        >
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {editingId ? t('admin.editJobTitle') : t('admin.createJobTitle')}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                {t('admin.formTitle')}
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={100}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="input-field"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                {t('admin.formCompany')}
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={50}
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                className="input-field"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                {t('admin.formLocation')}
              </label>
              <input
                list="admin-cities"
                required
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="input-field"
              />
              <datalist id="admin-cities">
                {ETHIOPIAN_LOCATIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                {t('admin.formJobType')}
              </label>
              <select
                value={form.jobType}
                onChange={(e) => setForm((f) => ({ ...f, jobType: e.target.value }))}
                className="input-field"
              >
                {JOB_TYPES.map((jt) => (
                  <option key={jt} value={jt}>
                    {tEnum('jobTypes', jt)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                {t('admin.formExp')}
              </label>
              <select
                value={form.experienceLevel}
                onChange={(e) => setForm((f) => ({ ...f, experienceLevel: e.target.value }))}
                className="input-field"
              >
                {EXPERIENCE_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {tEnum('experienceLevels', lvl)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="mb-1 flex justify-between">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400">
                {t('admin.formDesc')}
              </label>
              <span className="font-mono text-[11px] text-slate-400">
                {form.description.trim().length} / 50+
              </span>
            </div>
            <textarea
              rows={4}
              required
              minLength={50}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="input-field"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                {t('admin.formSkills')}
              </label>
              <input
                type="text"
                required
                value={form.requiredSkillsText}
                onChange={(e) => setForm((f) => ({ ...f, requiredSkillsText: e.target.value }))}
                placeholder="React, Node.js, MongoDB"
                className="input-field"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                {t('admin.formPreferredSkills')}
              </label>
              <input
                type="text"
                value={form.preferredSkillsText}
                onChange={(e) => setForm((f) => ({ ...f, preferredSkillsText: e.target.value }))}
                placeholder="Docker, AWS"
                className="input-field"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                {t('admin.formSalaryMin')}
              </label>
              <input
                type="number"
                min={0}
                value={form.salaryMin}
                onChange={(e) => setForm((f) => ({ ...f, salaryMin: e.target.value }))}
                className="input-field"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                {t('admin.formSalaryMax')}
              </label>
              <input
                type="number"
                min={0}
                value={form.salaryMax}
                onChange={(e) => setForm((f) => ({ ...f, salaryMax: e.target.value }))}
                className="input-field"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                {t('admin.formSalaryPeriod')}
              </label>
              <select
                value={form.salaryPeriod}
                onChange={(e) => setForm((f) => ({ ...f, salaryPeriod: e.target.value }))}
                className="input-field"
              >
                <option value="monthly">{t('admin.periodMonthly')}</option>
                <option value="yearly">{t('admin.periodYearly')}</option>
                <option value="hourly">{t('admin.periodHourly')}</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                {t('admin.formAppUrl')}
              </label>
              <input
                type="url"
                value={form.applicationUrl}
                onChange={(e) => setForm((f) => ({ ...f, applicationUrl: e.target.value }))}
                placeholder="https://..."
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-400">
                {t('admin.formAppEmail')}
              </label>
              <input
                type="email"
                value={form.applicationEmail}
                onChange={(e) => setForm((f) => ({ ...f, applicationEmail: e.target.value }))}
                placeholder="careers@company.et"
                className="input-field"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary flex-1">
              {submitting
                ? t('common.saving')
                : editingId
                  ? t('admin.updateBtn')
                  : t('admin.createBtn')}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="btn-secondary">
                {t('common.cancel')}
              </button>
            )}
          </div>
        </form>

        {/* Job List */}
        <div className="surface-card rounded-3xl p-6 lg:col-span-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {t('common.totalResults', { total: jobs.length })}
          </h2>

          {loading ? (
            <div className="mt-4 space-y-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/50"
                />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{t('common.noData')}</p>
          ) : (
            <div className="mt-4 space-y-3">
              {jobs.map((job) => (
                <div
                  key={job._id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/jobs/${job._id}`}
                      className="block truncate text-sm font-bold text-slate-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400"
                    >
                      {job.title}
                    </Link>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {job.company} • {job.location} • {formatSalary(job.salary, t)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => startEdit(job)}
                      className="rounded-xl border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                      aria-label={t('common.edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(job)}
                      className="rounded-xl border border-rose-200 p-2 text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900/70 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      aria-label={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
