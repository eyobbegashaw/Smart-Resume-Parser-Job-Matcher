import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

export const TOKEN_KEY = 'tp_token';
export const REFRESH_TOKEN_KEY = 'tp_refresh_token';

export const tokenStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  setTokens: (token, refreshToken) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

let onUnauthorizedCallback = null;
export const setUnauthorizedHandler = (cb) => {
  onUnauthorizedCallback = cb;
};

export const extractErrorMessage = (error, fallback = 'An unexpected error occurred') => {
  const data = error?.response?.data;
  if (data) {
    if (typeof data.error === 'string' && data.error.trim()) return data.error;
    if (typeof data.message === 'string' && data.message.trim()) return data.message;
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      return data.errors.map((e) => e.message || e.msg).filter(Boolean).join(', ');
    }
  }
  return error?.message || fallback;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = originalRequest?.url || '';

    const isAuthAttempt =
      requestUrl.includes('/api/auth/login') ||
      requestUrl.includes('/api/auth/register') ||
      requestUrl.includes('/api/auth/google') ||
      requestUrl.includes('/api/auth/verify-otp') ||
      requestUrl.includes('/api/auth/resend-otp') ||
      requestUrl.includes('/api/auth/forgot-password') ||
      requestUrl.includes('/api/auth/reset-password') ||
      requestUrl.includes('/api/auth/refresh-token');

    if (status === 401 && !originalRequest?._retry && !isAuthAttempt) {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        tokenStorage.clear();
        onUnauthorizedCallback?.();
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${API_BASE_URL}/api/auth/refresh-token`, { refreshToken })
            .then((res) => {
              const { token, refreshToken: nextRefresh } = res.data?.data || {};
              if (!token) throw new Error('Refresh response missing token');
              tokenStorage.setTokens(token, nextRefresh);
              return token;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newToken = await refreshPromise;
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        tokenStorage.clear();
        onUnauthorizedCallback?.();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  getHealth: () => api.get('/health'),
  register: (payload) => api.post('/api/auth/register', payload),
  login: (payload) => api.post('/api/auth/login', payload),
  googleAuth: (credential, options = {}) => api.post('/api/auth/google', { credential, ...options }),
  getGoogleOAuthUrl: (mode = 'login', language = 'en') =>
    `${API_BASE_URL}/api/auth/google?mode=${encodeURIComponent(mode)}&lang=${encodeURIComponent(language)}`,
  verifyOtp: (payload) => api.post('/api/auth/verify-otp', payload),
  resendOtp: (payload) => api.post('/api/auth/resend-otp', payload),
  refreshToken: (refreshToken) => api.post('/api/auth/refresh-token', { refreshToken }),
  getMe: () => api.get('/api/auth/me'),
  updatePassword: (payload) => api.put('/api/auth/password', payload),
  forgotPassword: (email, language = 'en') => api.post('/api/auth/forgot-password', { email, language }),
  resetPassword: (token, payloadOrPassword) =>
    api.put(
      `/api/auth/reset-password/${token}`,
      typeof payloadOrPassword === 'string' ? { password: payloadOrPassword } : payloadOrPassword
    ),
  resetPasswordWithOtp: (payload) => api.post('/api/auth/reset-password-otp', payload),
  verifyEmail: (token) => api.get(`/api/auth/verify-email/${token}`),
  resendVerification: () => api.post('/api/auth/resend-verification'),
  logout: () => api.post('/api/auth/logout')
};

export const resumeApi = {
  uploadResume: (file, language = 'en', onUploadProgress) => {
    const formData = new FormData();
    formData.append('resume', file);
    formData.append('language', language);
    return api.post('/api/resumes/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress
    });
  },
  getResumes: () => api.get('/api/resumes'),
  getResume: (id) => api.get(`/api/resumes/${id}`),
  deleteResume: (id) => api.delete(`/api/resumes/${id}`),
  analyzeSkillGap: (resumeId, jobId, language = 'en') =>
    api.post(`/api/resumes/${resumeId}/analyze-gap/${jobId}`, { language })
};

export const jobApi = {
  getJobs: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    );
    return api.get('/api/jobs', { params: cleanParams });
  },
  getRecommended: () => api.get('/api/jobs/recommended'),
  getJob: (id) => api.get(`/api/jobs/${id}`),
  createJob: (payload) => api.post('/api/jobs', payload),
  updateJob: (id, payload) => api.put(`/api/jobs/${id}`, payload),
  deleteJob: (id) => api.delete(`/api/jobs/${id}`)
};

export const userApi = {
  getProfile: () => api.get('/api/users/profile'),
  updateProfile: (payload) => api.put('/api/users/profile', payload),
  getResumes: (params = {}) => api.get('/api/users/resumes', { params }),
  getSavedJobs: (params = {}) => api.get('/api/users/saved-jobs', { params }),
  saveJob: (jobId, payload = {}) => api.post(`/api/users/saved-jobs/${jobId}`, payload),
  updateSavedJob: (jobId, payload) => api.put(`/api/users/saved-jobs/${jobId}`, payload),
  removeSavedJob: (jobId) => api.delete(`/api/users/saved-jobs/${jobId}`),
  getStats: () => api.get('/api/users/stats'),
  updatePreferences: (payload) => api.put('/api/users/preferences', payload),
  deleteAccount: () => api.delete('/api/users/account')
};

export default api;
