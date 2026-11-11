export const formatSalary = (salary, t) => {
  if (!salary || (salary.min === undefined && salary.max === undefined)) {
    return t('jobs.negotiableSalary');
  }

  const currency = salary.currency || t('common.etb');
  const fmt = new Intl.NumberFormat('en-US');

  let range = '';
  if (salary.min !== undefined && salary.max !== undefined) {
    range = `${fmt.format(salary.min)} – ${fmt.format(salary.max)} ${currency}`;
  } else if (salary.min !== undefined) {
    range = `${fmt.format(salary.min)}+ ${currency}`;
  } else {
    range = t('common.upTo', { amount: `${fmt.format(salary.max)} ${currency}` });
  }

  const periodMap = {
    monthly: t('common.perMonth'),
    yearly: t('common.perYear'),
    hourly: t('common.perHour')
  };

  return `${range} ${periodMap[salary.period] || ''}`.trim();
};

export const formatDate = (dateInput, language = 'en') => {
  if (!dateInput) return '—';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat(language === 'am' ? 'am-ET' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
};

export const getScoreTone = (score = 0) => {
  const numeric = Number(score) || 0;
  if (numeric >= 80) {
    return {
      stroke: 'stroke-emerald-500 dark:stroke-emerald-400',
      text: 'text-emerald-600 dark:text-emerald-400',
      badge:
        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70',
      bar: 'bg-emerald-500'
    };
  }
  if (numeric >= 60) {
    return {
      stroke: 'stroke-amber-500 dark:stroke-amber-400',
      text: 'text-amber-600 dark:text-amber-400',
      badge:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/70',
      bar: 'bg-amber-500'
    };
  }
  return {
    stroke: 'stroke-rose-500 dark:stroke-rose-400',
    text: 'text-rose-600 dark:text-rose-400',
    badge:
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/70',
    bar: 'bg-rose-500'
  };
};

export const normalizeSkillNames = (skills = []) =>
  Array.isArray(skills)
    ? skills
        .map((item) => (typeof item === 'string' ? item : item?.name))
        .filter((name) => typeof name === 'string' && name.trim())
    : [];
