import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Building2, MapPin, Save, Trash2 } from 'lucide-react';
import { extractErrorMessage, userApi } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { APPLICATION_STATUSES } from '../i18n/translations';
import { formatSalary } from '../utils/formatters';

const toDateInput = (val) => {
  if (!val) return '';
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

export default function SavedJobsPage() {
  const { t, tEnum } = useLanguage();
  const toast = useToast();

  const [statusFilter, setStatusFilter] = useState('');
  const [items, setItems] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingJobId, setSavingJobId] = useState(null);

  const loadSaved = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (statusFilter) params.status = statusFilter;
      const res = await userApi.getSavedJobs(params);
      const list = res.data?.data || [];
      setItems(list);

      const initialDrafts = {};
      list.forEach((entry) => {
        const jId = entry.jobId?._id || entry.jobId;
        initialDrafts[jId] = {
          status: entry.status || 'saved',
          notes: entry.notes || '',
          tagsText: Array.isArray(entry.tags) ? entry.tags.join(', ') : '',
          applicationDate: toDateInput(entry.applicationDate),
          interviewDate: toDateInput(entry.interviewDate)
        };
      });
      setDrafts(initialDrafts);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  const updateDraft = (jobId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [jobId]: { ...(prev[jobId] || {}), [field]: value }
    }));
  };

  const handleSaveEntry = async (jobId) => {
    const draft = drafts[jobId] || {};
    setSavingJobId(jobId);
    try {
      const payload = {
        status: draft.status,
        notes: draft.notes,
        tags: (draft.tagsText || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      };
      if (draft.applicationDate) payload.applicationDate = draft.applicationDate;
      if (draft.interviewDate) payload.interviewDate = draft.interviewDate;

      await userApi.updateSavedJob(jobId, payload);
      toast.success(t('savedJobs.updatedToast'));
      await loadSaved();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSavingJobId(null);
    }
  };

  const handleRemove = async (jobId) => {
    setSavingJobId(jobId);
    try {
      await userApi.removeSavedJob(jobId);
      setItems((prev) => prev.filter((item) => (item.jobId?._id || item.jobId) !== jobId));
      toast.info(t('jobs.jobUnsavedToast'));
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSavingJobId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          {t('savedJobs.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('savedJobs.subtitle')}</p>
      </div>

      {/* Stage Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatusFilter('')}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
            statusFilter === ''
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          {t('savedJobs.allTab')}
        </button>
        {APPLICATION_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
              statusFilter === status
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            {tEnum('applicationStatuses', status)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="surface-card h-44 animate-pulse rounded-3xl bg-slate-100/70 dark:bg-slate-800/40"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="surface-card rounded-3xl p-12 text-center">
          <Bookmark className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{t('savedJobs.empty')}</p>
          <Link to="/resumes" className="btn-primary mt-5">
            {t('dashboard.viewAllResumes')}
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((entry) => {
            const job = entry.jobId && typeof entry.jobId === 'object' ? entry.jobId : null;
            const jobId = job?._id || entry.jobId;
            const draft = drafts[jobId] || {};

            return (
              <div key={entry._id} className="surface-card rounded-3xl p-6">
                <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 sm:flex-row sm:items-center dark:border-slate-800">
                  <div>
                    <Link
                      to={`/jobs/${jobId}`}
                      className="text-lg font-bold text-slate-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-400"
                    >
                      {job?.title || `Job #${String(jobId).slice(-6)}`}
                    </Link>
                    {job && (
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {job.company}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location}
                        </span>
                        <span>{formatSalary(job.salary, t)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={draft.status || 'saved'}
                      onChange={(e) => updateDraft(jobId, 'status', e.target.value)}
                      className="input-field w-auto py-1.5 text-xs font-bold"
                    >
                      {APPLICATION_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {tEnum('applicationStatuses', st)}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={savingJobId === jobId}
                      onClick={() => handleRemove(jobId)}
                      className="rounded-xl border border-rose-200 p-2 text-rose-600 transition-colors hover:bg-rose-50 dark:border-rose-900/70 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      aria-label={t('savedJobs.remove')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-12">
                  <div className="md:col-span-5">
                    <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
                      {t('savedJobs.notesLabel')}
                    </label>
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={draft.notes || ''}
                      onChange={(e) => updateDraft(jobId, 'notes', e.target.value)}
                      placeholder={t('savedJobs.notesPlaceholder')}
                      className="input-field resize-none"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
                      {t('savedJobs.tagsLabel')}
                    </label>
                    <input
                      type="text"
                      value={draft.tagsText || ''}
                      onChange={(e) => updateDraft(jobId, 'tagsText', e.target.value)}
                      placeholder="remote, priority"
                      className="input-field"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
                      {t('savedJobs.appDateLabel')}
                    </label>
                    <input
                      type="date"
                      value={draft.applicationDate || ''}
                      onChange={(e) => updateDraft(jobId, 'applicationDate', e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
                      {t('savedJobs.interviewDateLabel')}
                    </label>
                    <input
                      type="date"
                      value={draft.interviewDate || ''}
                      onChange={(e) => updateDraft(jobId, 'interviewDate', e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    disabled={savingJobId === jobId}
                    onClick={() => handleSaveEntry(jobId)}
                    className="btn-primary py-2 text-xs"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>
                      {savingJobId === jobId ? t('common.saving') : t('savedJobs.saveUpdates')}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
