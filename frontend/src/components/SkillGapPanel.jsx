import { CheckCircle2, AlertTriangle, Lightbulb, Sparkles } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { getScoreTone } from '../utils/formatters';

export default function SkillGapPanel({ analysis }) {
  const { t } = useLanguage();
  if (!analysis) return null;

  const percentage = Math.max(0, Math.min(100, Math.round(Number(analysis.matchPercentage) || 0)));
  const tone = getScoreTone(percentage);

  const renderBadgeGroup = (title, items, variant) => {
    const list = Array.isArray(items) ? items : [];
    const pillClass =
      variant === 'matched'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70'
        : variant === 'missingRequired'
          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/70'
          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70';

    return (
      <div>
        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
          {variant === 'matched' ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span>{title}</span>
        </h4>
        {list.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {list.map((skill) => (
              <span
                key={skill}
                className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${pillClass}`}
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 dark:text-slate-500">—</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            {t('jobs.matchScore')}
          </span>
        </div>
        <span className={`rounded-full border px-3 py-0.5 text-xs font-extrabold ${tone.badge}`}>
          {percentage}%
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-700 ${tone.bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {renderBadgeGroup(t('jobs.matchedSkills'), analysis.matchedSkills, 'matched')}
        {renderBadgeGroup(t('jobs.missingRequired'), analysis.missingRequired, 'missingRequired')}
      </div>

      {Array.isArray(analysis.missingPreferred) && analysis.missingPreferred.length > 0 && (
        <div>{renderBadgeGroup(t('jobs.missingPreferred'), analysis.missingPreferred, 'preferred')}</div>
      )}

      {Array.isArray(analysis.recommendations) && analysis.recommendations.length > 0 && (
        <div className="border-t border-slate-200/80 pt-3 dark:border-slate-800">
          <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            <Lightbulb className="h-3.5 w-3.5 text-gold-500" />
            <span>{t('jobs.recommendations')}</span>
          </h4>
          <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
            {analysis.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
