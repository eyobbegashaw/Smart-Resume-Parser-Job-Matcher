import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function FloatingInput({
  id,
  type = 'text',
  label,
  value,
  onChange,
  icon: Icon,
  required = false,
  autoComplete,
  minLength,
  maxLength,
  showPasswordToggle = false,
  className = '',
  disabled = false,
  inputMode,
  inputClassName = '',
  rightElement,
  prClass
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const inputType = showPasswordToggle ? (showPassword ? 'text' : 'password') : type;
  const hasValue = Boolean(value !== undefined && value !== null && String(value).length > 0);
  const isFloating = focused || hasValue;

  const rightPadding =
    prClass ||
    (showPasswordToggle ? 'pr-11' : rightElement ? 'pr-28' : 'pr-4');

  return (
    <div className={`relative ${className}`}>
      {Icon && (
        <Icon
          className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200 z-10 ${
            focused
              ? 'text-brand-600 dark:text-brand-400'
              : 'text-slate-400 dark:text-slate-500'
          }`}
        />
      )}

      <input
        id={id}
        name={id}
        type={inputType}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={maxLength}
        inputMode={inputMode}
        disabled={disabled}
        placeholder=" "
        className={`peer w-full rounded-2xl border bg-white/80 py-3.5 text-sm text-slate-900 outline-none transition-all duration-200 placeholder-transparent dark:text-white ${
          Icon ? 'pl-11' : 'pl-4'
        } ${rightPadding} ${
          focused
            ? 'border-brand-500 bg-white ring-4 ring-brand-500/10 dark:border-brand-400 dark:bg-slate-900 dark:ring-brand-400/15'
            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700/80 dark:bg-slate-900/60 dark:hover:border-slate-600'
        } ${inputClassName}`}
      />

      <label
        htmlFor={id}
        className={`pointer-events-none absolute transition-all duration-200 ease-out select-none z-10 ${
          isFloating
            ? 'left-3 top-0 -translate-y-1/2 px-1.5 text-xs font-bold bg-white dark:bg-[#101724] rounded-md ' +
              (focused ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400')
            : (Icon ? 'left-11' : 'left-4') +
              ' top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500 peer-focus:left-3 peer-focus:top-0 peer-focus:-translate-y-1/2 peer-focus:px-1.5 peer-focus:text-xs peer-focus:font-bold peer-focus:text-brand-600 peer-focus:bg-white dark:peer-focus:bg-[#101724] dark:peer-focus:text-brand-400 peer-[:not(:placeholder-shown)]:left-3 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:-translate-y-1/2 peer-[:not(:placeholder-shown)]:px-1.5 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:bg-white dark:peer-[:not(:placeholder-shown)]:bg-[#101724]'
        }`}
      >
        {label}
      </label>

      {showPasswordToggle && (
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          tabIndex={-1}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 z-10 rounded-lg p-1 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}

      {rightElement && (
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 flex items-center">
          {rightElement}
        </div>
      )}
    </div>
  );
}
