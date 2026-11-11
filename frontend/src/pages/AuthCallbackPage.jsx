import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import { savePendingOtpSession } from '../utils/otpSession';

export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const { loginWithToken } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const navigate = useNavigate();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const requiresOtp = params.get('requiresOtp') === 'true';
    if (requiresOtp) {
      const pendingSession = savePendingOtpSession({
        email: params.get('email') || '',
        name: params.get('name') || '',
        authProvider: params.get('provider') || 'google',
        emailSent: params.get('emailSent') !== '0',
        otpExpiresIn: Number(params.get('otpExpiresIn')) || 600,
        resendCooldown: Number(params.get('resendCooldown')) || 60,
        verificationToken: params.get('verificationToken') || '',
        previewUrl: params.get('previewUrl') || ''
      });
      if (pendingSession.emailSent) {
        toast.success(t('auth.otpSentToast'));
      } else {
        toast.info(t('auth.otpDeliveryWarn'));
      }
      navigate('/verify-otp', { replace: true, state: pendingSession });
      return;
    }

    const token = params.get('token');
    const refreshToken = params.get('refreshToken');
    if (!token) {
      navigate('/login?error=missing_token', { replace: true });
      return;
    }

    loginWithToken(token, refreshToken)
      .then((user) => {
        navigate(user ? '/dashboard' : '/login?error=auth_failed', { replace: true });
      })
      .catch(() => {
        navigate('/login?error=auth_failed', { replace: true });
      });
  }, [params, loginWithToken, navigate, t, toast]);

  return (
    <AuthShell title={t('auth.callbackTitle')}>
      <div className="flex justify-center py-6">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    </AuthShell>
  );
}
