import React, { useState } from 'react';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import {
  Disc3,
  Cloud,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Mail,
  Lock,
  User as UserIcon,
} from 'lucide-react';
import axios from 'axios';
import { useAuthStore } from '../../../stores/authStore';
import { authApi } from '../../../api/authApi';
import { Button } from '../../atoms/Button';
import { Input } from '../../atoms/Input';

interface LoginPageProps {
  onNavigateLegal?: (route: 'privacy' | 'terms') => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateLegal }) => {
  const { setAuth } = useAuthStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError(null);
    setPassword('');
    setConfirmPassword('');
  };

  const handleLocalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('이메일을 입력해 주세요.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('올바른 이메일 형식을 입력해 주세요.');
      return;
    }

    if (!password) {
      setError('비밀번호를 입력해 주세요.');
      return;
    }

    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]).{8,64}$/;
    if (mode === 'register' && !passwordRegex.test(password)) {
      setError('비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다.');
      return;
    }

    if (password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.');
        return;
      }
    }

    try {
      setIsLoading(true);
      if (mode === 'login') {
        const res = await authApi.loginWithLocal({
          email: trimmedEmail,
          password,
        });
        setAuth(res.user, res.accessToken);
      } else {
        const res = await authApi.register({
          email: trimmedEmail,
          password,
          displayName: displayName.trim() || undefined,
        });
        setAuth(res.user, res.accessToken);
      }
    } catch (err: unknown) {
      let message = mode === 'login' ? '로그인에 실패했습니다.' : '회원가입에 실패했습니다.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

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
      let message = 'Google 로그인에 실패했습니다.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err instanceof Error) {
        message = err.message;
      }
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
    <div className="min-h-screen bg-[#08090a] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#5e6ad2]/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-[#0f1011] border border-white/[0.1] rounded-2xl p-5 sm:p-8 shadow-2xl backdrop-blur-2xl relative z-10 flex flex-col items-center text-center">
        {/* Logo */}
        <div className="p-3.5 bg-[#5e6ad2]/15 border border-[#5e6ad2]/30 rounded-2xl shadow-lg shadow-[#5e6ad2]/10 text-[#5e6ad2] mb-5">
          <Disc3 className="w-8 h-8" />
        </div>

        <h1 className="text-xl font-bold text-neutral-100 mb-2">Music Hub</h1>
        <p className="text-sm text-neutral-400 mb-6 max-w-xs leading-relaxed">
          보유한 음원을 손실 없이 안전하게 보관하고, 언제 어디서나 끊김 없이 스트리밍하세요.
        </p>

        {/* Features highlights */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full mb-6 text-[11px] sm:text-xs text-neutral-300">
          <div className="p-2 sm:p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] flex flex-col items-center gap-1 sm:gap-1.5">
            <Cloud className="w-4 h-4 text-[#5e6ad2]" />
            <span>R2 스토리지</span>
          </div>
          <div className="p-2 sm:p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] flex flex-col items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#8590ea]" />
            <span>실시간 재생</span>
          </div>
          <div className="p-2 sm:p-3 bg-white/[0.03] rounded-xl border border-white/[0.06] flex flex-col items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#27a672]" />
            <span>보안 인증</span>
          </div>
        </div>

        {/* Mode Toggle Tabs */}
        <div className="grid grid-cols-2 p-1 bg-white/[0.04] rounded-xl border border-white/[0.08] w-full mb-5">
          <button
            type="button"
            onClick={() => resetForm('login')}
            className={`py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-[#5e6ad2] text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => resetForm('register')}
            className={`py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-[#5e6ad2] text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            회원가입
          </button>
        </div>

        {error ? (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 text-red-300 text-xs rounded-xl w-full mb-4 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Local Auth Form */}
        <form onSubmit={handleLocalSubmit} className="w-full flex flex-col gap-3 mb-5 text-left">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
              <Mail className="w-4 h-4" />
            </div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 주소"
              className="pl-9"
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          {mode === 'register' ? (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <UserIcon className="w-4 h-4" />
              </div>
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="표시 이름 / 닉네임 (선택)"
                className="pl-9"
                autoComplete="nickname"
                disabled={isLoading}
              />
            </div>
          ) : null}

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
              <Lock className="w-4 h-4" />
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                mode === 'register' ? '비밀번호 (8자 이상, 영문/숫자/특수문자)' : '비밀번호'
              }
              className="pl-9"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              disabled={isLoading}
            />
          </div>

          {mode === 'register' ? (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                <Lock className="w-4 h-4" />
              </div>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="비밀번호 확인"
                className="pl-9"
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>
          ) : null}

          <Button
            type="submit"
            variant="primary"
            size="md"
            className="w-full mt-1"
            isLoading={isLoading}
          >
            {mode === 'login' ? '로그인' : '회원가입 완료'}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative w-full my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/[0.08]" />
          </div>
          <div className="relative flex justify-center text-[11px]">
            <span className="bg-[#0f1011] px-3 text-neutral-500">
              또는 Google 계정으로 계속하기
            </span>
          </div>
        </div>

        {/* Google Login Provider */}
        <div className="w-full flex justify-center mb-2">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="filled_black"
            shape="pill"
            size="large"
            width="100%"
          />
        </div>

        {/* Legal Consent Notice */}
        <p className="text-[11px] text-neutral-500 text-center leading-relaxed mb-6 px-1">
          계속 진행하면 Music Hub의{' '}
          <button
            type="button"
            onClick={() =>
              onNavigateLegal ? onNavigateLegal('terms') : (window.location.href = '/terms')
            }
            className="text-neutral-400 underline underline-offset-2 hover:text-[#5e6ad2] transition-colors cursor-pointer"
          >
            서비스 이용약관
          </button>{' '}
          및{' '}
          <button
            type="button"
            onClick={() =>
              onNavigateLegal ? onNavigateLegal('privacy') : (window.location.href = '/privacy')
            }
            className="text-neutral-400 underline underline-offset-2 hover:text-[#5e6ad2] transition-colors cursor-pointer"
          >
            개인정보처리방침
          </button>
          에 <br /> 동의하는 것으로 간주됩니다.
        </p>

        {/* Developer Sandbox Mode Bypass */}
        <div className="pt-6 border-t border-white/[0.08] w-full flex flex-col items-center gap-2">
          <p className="text-[11px] text-neutral-500">로컬 개발 환경에서 테스트 중이신가요?</p>
          <Button variant="ghost" size="sm" onClick={handleDevBypass}>
            로컬 개발자 모드로 접속
          </Button>
        </div>
      </div>

      {/* Footer Legal Links */}
      <footer className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 text-xs text-neutral-500 relative z-10">
        <span>© 2026 Music Hub</span>
        <span>·</span>
        <button
          type="button"
          onClick={() =>
            onNavigateLegal ? onNavigateLegal('terms') : (window.location.href = '/terms')
          }
          className="hover:text-neutral-300 transition-colors cursor-pointer underline-offset-2 hover:underline"
        >
          서비스 이용약관
        </button>
        <span>·</span>
        <button
          type="button"
          onClick={() =>
            onNavigateLegal ? onNavigateLegal('privacy') : (window.location.href = '/privacy')
          }
          className="hover:text-neutral-300 transition-colors cursor-pointer underline-offset-2 hover:underline"
        >
          개인정보처리방침
        </button>
      </footer>
    </div>
  );
};
