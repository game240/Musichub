import React, { useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { Disc3, Cloud, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { authApi } from '../../../api/authApi';
import { Button } from '../../atoms/Button';

export const LoginPage: React.FC = () => {
  const { setAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Google 인증 토큰을 가져오지 못했습니다.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const res = await authApi.loginWithGoogle(credentialResponse.credential);
      setAuth(res.user, res.accessToken);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google 로그인에 실패했습니다.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google 로그인이 취소되었거나 초기화에 실패했습니다.');
  };

  // Mock login for local development / testing without Google credentials configured
  const handleDevBypass = () => {
    setAuth(
      {
        id: 1,
        email: 'developer@musichub.local',
        displayName: '로컬 개발자',
        profileImageUrl: null,
        storageUsedBytes: 0,
        volume: 100,
      },
      'dev-access-token-local',
    );
  };

  return (
    <div className="min-h-screen bg-[#08090a] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#5e6ad2]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0f1011] border border-white/[0.1] rounded-2xl p-8 shadow-2xl backdrop-blur-2xl relative z-10 flex flex-col items-center text-center">
        {/* Logo */}
        <div className="p-3.5 bg-[#5e6ad2]/15 border border-[#5e6ad2]/30 rounded-2xl shadow-lg shadow-[#5e6ad2]/10 text-[#5e6ad2] mb-5">
          <Disc3 className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold text-neutral-100 mb-2">Music Hub</h1>
        <p className="text-sm text-neutral-400 mb-6 max-w-xs leading-relaxed">
          보유한 음원을 손실 없이 안전하게 보관하고, 언제 어디서나 끊김 없이 스트리밍하세요.
        </p>

        {/* Features highlights */}
        <div className="grid grid-cols-3 gap-2 w-full mb-6 text-xs text-neutral-300">
          <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] flex flex-col items-center gap-1.5">
            <Cloud className="w-4 h-4 text-[#5e6ad2]" />
            <span>R2 스토리지</span>
          </div>
          <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] flex flex-col items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#8590ea]" />
            <span>실시간 재생</span>
          </div>
          <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] flex flex-col items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#27a672]" />
            <span>보안 인증</span>
          </div>
        </div>

        {error ? (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl w-full mb-6 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Google Login Provider */}
        <div className="w-full flex justify-center mb-6">
          {isLoading ? (
            <p className="text-sm text-[#8590ea]">Music Hub 로그인 중...</p>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_black"
              shape="pill"
              size="large"
              width="100%"
            />
          )}
        </div>

        {/* Developer Sandbox Mode Bypass */}
        <div className="pt-6 border-t border-white/[0.08] w-full flex flex-col items-center gap-2">
          <p className="text-[11px] text-neutral-500">로컬 개발 환경에서 테스트 중이신가요?</p>
          <Button variant="ghost" size="sm" onClick={handleDevBypass}>
            로컬 개발자 모드로 접속
          </Button>
        </div>
      </div>
    </div>
  );
};
