import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  Lock,
  Plus,
  Shield,
  Sliders,
  User,
  X
} from 'lucide-react';
import { authApi, extractErrorMessage, tokenStorage, userApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { ETHIOPIAN_LOCATIONS } from '../i18n/translations';

const ETH_PHONE_RE = /^(\+251|0)[1-9]\d{8}$/;

export default function SettingsPage() {
  const { user, refreshUser, clearSession } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { isDark, setTheme } = useTheme();
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('profile');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setPhone(user.phone || '');
    setLocation(user.location || '');
    setBio(user.bio || '');
    setSkills(Array.isArray(user.skills) ? user.skills : []);
    setEmailNotifications(user.preferences?.emailNotifications ?? true);
    setJobAlerts(user.preferences?.jobAlerts ?? true);
  }, [user]);

  const addSkillChip = () => {
    const clean = skillInput.trim();
    if (!clean) return;
    if (!skills.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setSkills((prev) => [...prev, clean.slice(0, 50)]);
    }
    setSkillInput('');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    if (cleanPhone && !ETH_PHONE_RE.test(cleanPhone)) {
      toast.error(t('settings.phoneHint'));
      return;
    }

    setSavingProfile(true);
    try {
      const payload = {
        name: name.trim(),
        location: location.trim(),
        bio: bio.trim(),
        skills
      };
      if (cleanPhone) payload.phone = cleanPhone;

      await userApi.updateProfile(payload);
      await refreshUser();
      toast.success(t('settings.profileSavedToast'));
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePreferences = async (nextOverrides = {}) => {
    const targetLang = nextOverrides.language || language;
    const targetDark = nextOverrides.darkMode !== undefined ? nextOverrides.darkMode : isDark;
    const targetEmailNotif =
      nextOverrides.emailNotifications !== undefined
        ? nextOverrides.emailNotifications
        : emailNotifications;
    const targetJobAlerts =
      nextOverrides.jobAlerts !== undefined ? nextOverrides.jobAlerts : jobAlerts;

    setSavingPrefs(true);
    try {
      await userApi.updatePreferences({
        language: targetLang,
        darkMode: targetDark,
        emailNotifications: targetEmailNotif,
        jobAlerts: targetJobAlerts
      });
      await refreshUser();
      toast.success(t('settings.prefsSavedToast'));
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error(t('auth.passwordWeak'));
      return;
    }
    setSavingPassword(true);
    try {
      const res = await authApi.updatePassword({ currentPassword, newPassword });
      if (res.data?.data?.token) {
        tokenStorage.setTokens(res.data.data.token);
      }
      setCurrentPassword('');
      setNewPassword('');
      toast.success(res.data?.message || t('settings.passwordUpdatedToast'));
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteText.trim() !== 'DELETE') return;
    setDeletingAccount(true);
    try {
      await userApi.deleteAccount();
      clearSession();
      toast.info(t('settings.accountDeletedToast'));
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          {t('settings.title')}
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t('settings.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { id: 'profile', icon: User, label: t('settings.tabs.profile') },
          { id: 'preferences', icon: Sliders, label: t('settings.tabs.preferences') },
          { id: 'security', icon: Shield, label: t('settings.tabs.security') }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                tab === item.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {tab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="surface-card space-y-5 rounded-3xl p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {t('auth.nameLabel')}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {t('settings.phoneLabel')}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('settings.phonePlaceholder')}
                className="input-field"
              />
              <p className="mt-1 text-[11px] text-slate-400">{t('settings.phoneHint')}</p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              {t('settings.locationLabel')}
            </label>
            <input
              list="ethiopian-cities"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Addis Ababa"
              className="input-field"
            />
            <datalist id="ethiopian-cities">
              {ETHIOPIAN_LOCATIONS.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </div>

          <div>
            <div className="mb-1.5 flex justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {t('settings.bioLabel')}
              </label>
              <span className="font-mono text-[11px] text-slate-400">{bio.length} / 500</span>
            </div>
            <textarea
              rows={3}
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t('settings.bioPlaceholder')}
              className="input-field resize-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              {t('settings.skillsLabel')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSkillChip();
                  }
                }}
                placeholder={t('settings.skillsPlaceholder')}
                className="input-field"
              />
              <button type="button" onClick={addSkillChip} className="btn-secondary shrink-0">
                <Plus className="h-4 w-4" />
                <span>{t('common.add')}</span>
              </button>
            </div>

            {skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800 dark:border-brand-800/70 dark:bg-brand-950/60 dark:text-brand-300"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => setSkills((prev) => prev.filter((s) => s !== skill))}
                      className="hover:text-rose-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={savingProfile} className="btn-primary">
              {savingProfile ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      )}

      {tab === 'preferences' && (
        <div className="surface-card space-y-6 rounded-3xl p-6 sm:p-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {t('settings.prefLanguage')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['en', 'am'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setLanguage(code);
                      handleSavePreferences({ language: code });
                    }}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                      code === 'am' ? 'font-ethiopic' : ''
                    } ${
                      language === code
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                        : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {t(`lang.${code}Full`)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                {t('settings.prefTheme')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'light', dark: false, label: t('theme.light') },
                  { id: 'dark', dark: true, label: t('theme.dark') }
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setTheme(opt.id);
                      handleSavePreferences({ darkMode: opt.dark });
                    }}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                      isDark === opt.dark
                        ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                        : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-5 dark:border-slate-800">
            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <Bell className="mt-0.5 h-5 w-5 text-brand-500" />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {t('settings.prefEmailNotif')}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('settings.prefEmailNotifDesc')}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={emailNotifications}
                disabled={savingPrefs}
                onChange={(e) => {
                  const val = e.target.checked;
                  setEmailNotifications(val);
                  handleSavePreferences({ emailNotifications: val });
                }}
                className="h-5 w-5 accent-brand-600"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200/80 p-4 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <Bell className="mt-0.5 h-5 w-5 text-gold-500" />
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {t('settings.prefJobAlerts')}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('settings.prefJobAlertsDesc')}
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={jobAlerts}
                disabled={savingPrefs}
                onChange={(e) => {
                  const val = e.target.checked;
                  setJobAlerts(val);
                  handleSavePreferences({ jobAlerts: val });
                }}
                className="h-5 w-5 accent-brand-600"
              />
            </label>
          </div>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-6">
          <div className="surface-card rounded-3xl p-6 sm:p-8">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <Lock className="h-5 w-5 text-brand-500" />
              <span>{t('settings.passwordSectionTitle')}</span>
            </h2>

            {user?.authProvider === 'google' ? (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                {t('settings.oauthNoPassword')}
              </p>
            ) : (
              <form onSubmit={handleChangePassword} className="mt-4 max-w-md space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    {t('settings.currentPasswordLabel')}
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    {t('settings.newPasswordLabel')}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input-field"
                  />
                </div>
                <button type="submit" disabled={savingPassword} className="btn-primary">
                  {savingPassword ? t('common.saving') : t('settings.updatePasswordBtn')}
                </button>
              </form>
            )}
          </div>

          <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-6 sm:p-8 dark:border-rose-900/70 dark:bg-rose-950/25">
            <h2 className="flex items-center gap-2 text-base font-bold text-rose-700 dark:text-rose-400">
              <AlertTriangle className="h-5 w-5" />
              <span>{t('settings.dangerTitle')}</span>
            </h2>
            <p className="mt-2 text-sm text-rose-700/90 dark:text-rose-300/80">
              {t('settings.dangerDesc')}
            </p>
            <p className="mt-4 text-xs font-semibold text-rose-700 dark:text-rose-300">
              {t('settings.deletePromptConfirm')}
            </p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                placeholder="DELETE"
                className="input-field max-w-xs border-rose-200 dark:border-rose-900"
              />
              <button
                type="button"
                disabled={deleteText.trim() !== 'DELETE' || deletingAccount}
                onClick={handleDeleteAccount}
                className="inline-flex items-center justify-center rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingAccount ? t('common.loading') : t('settings.deleteAccountBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
