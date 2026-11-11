import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './contexts/ToastContext';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const VerifyOtpPage = lazy(() => import('./pages/VerifyOtpPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ResumesPage = lazy(() => import('./pages/ResumesPage'));
const JobDetailPage = lazy(() => import('./pages/JobDetailPage'));
const SavedJobsPage = lazy(() => import('./pages/SavedJobsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AdminJobsPage = lazy(() => import('./pages/AdminJobsPage'));

const HIDE_FOOTER_ROUTES = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/verify-otp',
  '/auth/callback'
]);

function shouldHideFooter(pathname) {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return (
    HIDE_FOOTER_ROUTES.has(normalized) ||
    normalized.startsWith('/reset-password/') ||
    normalized.startsWith('/verify-email/')
  );
}

function RouteLoader() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}

function AppLayout() {
  const location = useLocation();
  const showFooter = !shouldHideFooter(location.pathname);

  return (
    <div className="flex min-h-screen flex-col bg-surface-light text-slate-900 transition-colors duration-200 dark:bg-surface-dark dark:text-slate-100">
      <Navbar />
      <main className="flex-1">
        <ErrorBoundary>
          <Suspense fallback={<RouteLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-otp" element={<VerifyOtpPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />

              <Route path="/jobs/:id" element={<JobDetailPage />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/resumes"
                element={
                  <ProtectedRoute>
                    <ResumesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/resumes/:id"
                element={
                  <ProtectedRoute>
                    <ResumesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/saved-jobs"
                element={
                  <ProtectedRoute>
                    <SavedJobsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/jobs"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminJobsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      {showFooter && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppLayout />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
