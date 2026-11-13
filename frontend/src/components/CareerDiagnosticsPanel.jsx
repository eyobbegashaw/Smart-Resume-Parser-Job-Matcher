import {
  Award,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Sparkles,
  Zap,
  Target,
  Compass
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { generateCareerDiagnostics } from '../utils/careerDiagnostics';
import { getScoreTone } from '../utils/formatters';

export default function CareerDiagnosticsPanel({ parsedData, analysis }) {
  const { language, t } = useLanguage();
  const diagnostics = generateCareerDiagnostics(parsedData, analysis);
  const isAmharic = language === 'am';

  const { seniority, targetRoles, recommendedSkills, optimizations } = diagnostics;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-brand-200/90 bg-gradient-to-br from-brand-50/80 via-white to-sky-50/60 p-6 dark:border-brand-900/60 dark:from-brand-950/40 dark:via-surface-dark dark:to-slate-900/60">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100/90 px-3 py-1 text-xs font-bold text-brand-800 dark:bg-brand-900/60 dark:text-brand-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{t('resumes.insightsTitle')}</span>
            </span>
            <h3 className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">
              {t('resumes.guessedRolesTitle')}
            </h3>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              {t('resumes.insightsSubtitle')}
            </p>
          </div>

          {/* Seniority Hypothesis Badge */}
          <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-brand-200 bg-white/90 p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('resumes.seniorityTitle')}
              </p>
              <p className="text-sm font-extrabold text-brand-700 dark:text-brand-300">
                {t(seniority.labelKey)}
              </p>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                ~ {seniority.horizon}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Target Role Hypotheses ("Guess Works") */}
      <div className="surface-card rounded-3xl p-6">
        <h4 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
          <Target className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          <span>{t('resumes.guessedRolesTitle')}</span>
        </h4>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {isAmharic
            ? 'ከሲቪዎ የተገኙ ክህሎቶች እና የስራ ልምዶች ላይ በመመስረት ከፍተኛ ተዛማጅነት ያላቸው የስራ መደቦች፡'
            : 'AI-inferred role matches and probability confidence based on your verified skills:'}
        </p>

        <div className="mt-5 space-y-3.5">
          {targetRoles.map((role, idx) => {
            const tone = getScoreTone(role.matchScore);
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/90 p-4 transition-all hover:border-brand-300 dark:border-slate-800 dark:hover:border-brand-700/60"
              >
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                        {role.title}
                      </h5>
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {role.category}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300">
                      {isAmharic ? role.rationaleAm : role.rationaleEn}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-extrabold ${tone.badge}`}
                    >
                      {role.matchScore}% {isAmharic ? 'ተዛማጅነት' : 'Fit'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${tone.bar}`}
                    style={{ width: `${role.matchScore}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended Next-Level High-Impact Skills */}
      {recommendedSkills.length > 0 && (
        <div className="surface-card rounded-3xl p-6">
          <h4 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Zap className="h-5 w-5 text-amber-500" />
            <span>{t('resumes.nextLevelSkillsTitle')}</span>
          </h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('resumes.nextLevelSkillsSubtitle')}
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {recommendedSkills.map((skill, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-slate-200/80 p-4 transition-colors hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {skill.name}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                      skill.priority === 'High'
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    }`}
                  >
                    {skill.priority} Priority
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {isAmharic ? skill.impactAm : skill.impactEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resume Optimization Checklist (ATS Readiness) */}
      <div className="surface-card rounded-3xl p-6">
        <h4 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          <span>{t('resumes.resumeOptimizationTitle')}</span>
        </h4>

        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {optimizations.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3 py-3.5">
              {item.passed ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {isAmharic ? item.titleAm : item.titleEn}
                </p>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  {isAmharic ? item.tipAm : item.tipEn}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
