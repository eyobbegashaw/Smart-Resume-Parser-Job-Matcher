import { Link } from 'react-router-dom';
import { Bookmark, Building2, Clock, MapPin, ArrowUpRight, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { formatDate, formatSalary, getScoreTone, normalizeSkillNames } from '../utils/formatters';

export default function JobCard({
  job,
  isSaved = false,
  onToggleSave,
  savingId,
  compact = false
}) {
  const { language, t, tEnum } = useLanguage();
  if (!job) return null;

  const jobId = job._id || job.id;
  const skills = normalizeSkillNames(job.requiredSkills).slice(0, compact ? 4 : 6);
  const matchScore = typeof job.matchScore === 'number' ? Math.round(job.matchScore) : null;
  const tone = getScoreTone(matchScore ?? 0);

  return (
    <article className="surface-card group flex flex-col justify-between rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300/80 hover:shadow-lg dark:hover:border-brand-700/70">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {job.companyLogo ? (
              <img
                src={job.companyLogo}
                alt={job.company}
                className="h-11 w-11 shrink-0 rounded-xl border border-slate-200 object-cover dark:border-slate-700"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                <Building2 className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <Link
                to={`/jobs/${jobId}`}
                className="block truncate text-base font-bold text-slate-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400"
              >
                {job.title}
              </Link>
              <p className="truncate text-sm font-medium text-slate-600 dark:text-slate-400">
                {job.company}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {matchScore !== null && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${tone.badge}`}
              >
                <Sparkles className="h-3 w-3" />
                {t('jobs.matchBadge', { score: matchScore })}
              </span>
            )}
            {onToggleSave && (
              <button
                type="button"
                disabled={savingId === jobId}
                onClick={() => onToggleSave(jobId, isSaved)}
                aria-label={isSaved ? t('jobs.unsaveJob') : t('jobs.saveJob')}
                className={`rounded-xl border p-2 transition-colors ${
                  isSaved
                    ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                    : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Meta tags */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-medium dark:bg-slate-800/80">
            <MapPin className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
            {job.location}
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-medium dark:bg-slate-800/80">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            {tEnum('jobTypes', job.jobType)}
          </span>
          {job.experienceLevel && (
            <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 font-medium dark:bg-slate-800/80">
              {tEnum('experienceLevels', job.experienceLevel)}
            </span>
          )}
        </div>

        {!compact && job.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {job.description}
          </p>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {skills.map((skill) => {
              const isMatched =
                Array.isArray(job.matchedSkills) &&
                job.matchedSkills.some((m) => m.toLowerCase() === skill.toLowerCase());
              return (
                <span
                  key={skill}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                    isMatched
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800/60'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-300'
                  }`}
                >
                  {skill}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5 dark:border-slate-800/80">
        <div>
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            {formatSalary(job.salary, t)}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {t('jobs.postedOn')}: {formatDate(job.postedDate || job.createdAt, language)}
          </p>
        </div>

        <Link
          to={`/jobs/${jobId}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          <span>{t('common.view')}</span>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}
