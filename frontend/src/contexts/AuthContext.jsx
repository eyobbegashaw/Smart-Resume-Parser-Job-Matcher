import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi, setUnauthorizedHandler, tokenStorage, userApi } from '../services/api';
import { useTheme } from './ThemeContext';
import { useLanguage } from './LanguageContext';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setTheme } = useTheme();
  const { setLanguage } = useLanguage();

  const applyServerPreferences = useCallback((userObj) => {
    const prefs = userObj?.preferences;
    if (!prefs) return;
    // Apply backend preference only if user has no explicit local override yet
    if (!localStorage.getItem('tp_theme') && typeof prefs.darkMode === 'boolean') {
      setTheme(prefs.darkMode ? 'dark' : 'light', { persist: false });
    }
    if (!localStorage.getItem('tp_language') && (prefs.language === 'en' || prefs.language === 'am')) {
      setLanguage(prefs.language, { persist: false });
    }
  }, [setTheme, setLanguage]);

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = tokenStorage.getToken();
    if (!token) {
      setUser(null);
      return null;
    }
    try {
      const res = await authApi.getMe();
      const loadedUser = res.data?.data || null;
      setUser(loadedUser);
      applyServerPreferences(loadedUser);
      return loadedUser;
    } catch {
      clearSession();
      return null;
    }
  }, [applyServerPreferences, clearSession]);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    refreshUser().finally(() => setIsLoading(false));
  }, [clearSession, refreshUser]);

  const login = useCallback(async (credentials) => {
    const res = await authApi.login(credentials);
    if (res.data?.requiresOtpVerification || !res.data?.data?.token) {
      return {
        requiresOtpVerification: true,
        ...(res.data?.data || {})
      };
    }
    const { token, refreshToken } = res.data?.data || {};
    tokenStorage.setTokens(token, refreshToken);
    const loadedUser = await refreshUser();
    return loadedUser || res.data?.data;
  }, [refreshUser]);

  const register = useCallback(async (payload) => {
    const res = await authApi.register(payload);
    if (res.data?.requiresOtpVerification || !res.data?.data?.token) {
      return {
        requiresOtpVerification: true,
        ...(res.data?.data || {})
      };
    }
    const { token, refreshToken } = res.data?.data || {};
    tokenStorage.setTokens(token, refreshToken);
    const loadedUser = await refreshUser();
    return loadedUser || res.data?.data;
  }, [refreshUser]);

  const verifyOtp = useCallback(async (payload) => {
    const res = await authApi.verifyOtp(payload);
    const { token, refreshToken } = res.data?.data || {};
    tokenStorage.setTokens(token, refreshToken);
    const loadedUser = await refreshUser();
    return {
      user: loadedUser || res.data?.data,
      data: res.data?.data
    };
  }, [refreshUser]);

  const loginWithToken = useCallback(async (token, refreshToken) => {
    tokenStorage.setTokens(token, refreshToken);
    return refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      if (tokenStorage.getToken()) {
        await authApi.logout();
      }
    } catch {
      // Proceed with local cleanup even if network fails
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const syncPreferences = useCallback(async (partialPrefs) => {
    if (!tokenStorage.getToken()) return;
    try {
      const res = await userApi.updatePreferences(partialPrefs);
      setUser((prev) => (prev ? { ...prev, preferences: res.data?.data || { ...prev.preferences, ...partialPrefs } } : prev));
    } catch {
      // Preference persistence is non-blocking
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'admin',
        isLoading,
        login,
        register,
        verifyOtp,
        loginWithToken,
        logout,
        refreshUser,
        clearSession,
        syncPreferences
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
