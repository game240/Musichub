import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import {
  ShieldCheck,
  Lock,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Unlink,
  Mail,
} from 'lucide-react';
import axios from 'axios';
import { Modal } from './Modal';
import { Button } from '../atoms/Button';
import { Input } from '../atoms/Input';
import { Badge } from '../atoms/Badge';
import { userApi } from '../../api/userApi';
import type { SetPasswordRequest } from '../../types/auth';

export interface AccountSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
}

export const AccountSecurityModal: React.FC<AccountSecurityModalProps> = ({
  isOpen,
  onClose,
  userEmail,
}) => {
  const queryClient = useQueryClient();

  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<'initial' | 'code_sent'>('initial');
  const [verificationCode, setVerificationCode] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [googleActionError, setGoogleActionError] = useState<string | null>(null);
  const [googleActionSuccess, setGoogleActionSuccess] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['user-identities'],
    queryFn: () => userApi.getIdentities(),
    enabled: isOpen,
  });

  const isGoogleLinked = data?.identities.some((i) => i.provider === 'GOOGLE') ?? false;
  const hasPassword = data?.hasPassword ?? false;
  const totalIdentitiesCount = data?.identities.length ?? 0;

  // 비밀번호 변경 (hasPassword === true)
  const setPasswordMutation = useMutation({
    mutationFn: (payload: SetPasswordRequest) => userApi.setPassword(payload),
    onSuccess: () => {
      setPasswordSuccess('비밀번호가 성공적으로 변경되었습니다.');
      setPasswordError(null);
      setVerificationCode('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordFormOpen(false);
      setSetupStep('initial');
      queryClient.invalidateQueries({ queryKey: ['user-identities'] });
    },
    onError: (err: unknown) => {
      let msg = '비밀번호 변경에 실패했습니다.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setPasswordError(msg);
      setPasswordSuccess(null);
    },
  });

  // 인증코드 발송 요청 (비밀번호 설정 및 변경 공용)
  const requestCodeMutation = useMutation({
    mutationFn: () => userApi.requestPasswordCode(),
    onSuccess: () => {
      setSetupStep('code_sent');
      setPasswordSuccess('인증번호 6자리가 이메일로 발송되었습니다.');
      setPasswordError(null);
    },
    onError: (err: unknown) => {
      let msg = '인증번호 발송에 실패했습니다.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setPasswordError(msg);
    },
  });

  // 인증코드 확인 후 비밀번호 설정 (hasPassword === false)
  const confirmSetupMutation = useMutation({
    mutationFn: ({ code, newPassword }: { code: string; newPassword: string }) =>
      userApi.confirmPasswordSetup(code, newPassword),
    onSuccess: () => {
      setPasswordSuccess(
        '비밀번호가 성공적으로 설정되었습니다. 이제 이메일/비밀번호로도 로그인하실 수 있습니다.',
      );
      setPasswordError(null);
      setVerificationCode('');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordFormOpen(false);
      setSetupStep('initial');
      queryClient.invalidateQueries({ queryKey: ['user-identities'] });
    },
    onError: (err: unknown) => {
      let msg = '비밀번호 설정에 실패했습니다.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setPasswordError(msg);
    },
  });

  const linkGoogleMutation = useMutation({
    mutationFn: (idToken: string) => userApi.linkGoogle(idToken),
    onSuccess: () => {
      setGoogleActionSuccess('Google 계정이 성공적으로 연결되었습니다.');
      setGoogleActionError(null);
      queryClient.invalidateQueries({ queryKey: ['user-identities'] });
    },
    onError: (err: unknown) => {
      let msg = 'Google 계정 연결에 실패했습니다.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setGoogleActionError(msg);
      setGoogleActionSuccess(null);
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (provider: 'GOOGLE' | 'LOCAL') => userApi.unlinkProvider(provider),
    onSuccess: () => {
      setGoogleActionSuccess('로그인 수단 연결이 해제되었습니다.');
      setGoogleActionError(null);
      queryClient.invalidateQueries({ queryKey: ['user-identities'] });
    },
    onError: (err: unknown) => {
      let msg = '연결 해제에 실패했습니다.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setGoogleActionError(msg);
      setGoogleActionSuccess(null);
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    const passwordRegex =
      /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~]).{8,64}$/;
    if (!passwordRegex.test(newPassword)) {
      setPasswordError('비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다.');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('새 비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!verificationCode || verificationCode.trim().length !== 6) {
      setPasswordError('이메일로 전송된 6자리 인증번호를 정확히 입력해 주세요.');
      return;
    }

    if (hasPassword) {
      if (!currentPassword) {
        setPasswordError('현재 비밀번호를 입력해 주세요.');
        return;
      }
      setPasswordMutation.mutate({
        code: verificationCode.trim(),
        currentPassword,
        newPassword,
      });
    } else {
      confirmSetupMutation.mutate({
        code: verificationCode.trim(),
        newPassword,
      });
    }
  };

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setGoogleActionError('Google 인증 정보를 가져오지 못했습니다.');
      return;
    }
    setGoogleActionError(null);
    linkGoogleMutation.mutate(credentialResponse.credential);
  };

  const handleUnlinkGoogle = () => {
    if (!hasPassword) {
      setGoogleActionError('비밀번호를 먼저 등록해야 Google 연동을 해제할 수 있습니다.');
      return;
    }
    if (totalIdentitiesCount <= 1) {
      setGoogleActionError('최소 하나 이상의 로그인 수단이 유지되어야 합니다.');
      return;
    }
    if (window.confirm('정말 Google 계정 연결을 해제하시겠습니까?')) {
      unlinkMutation.mutate('GOOGLE');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="로그인 수단 및 계정 보안" maxWidth="lg">
      <div className="flex flex-col gap-5">
        <p className="text-xs text-neutral-400 leading-relaxed">
          Music Hub에 접속할 수 있는 로그인 수단을 관리합니다. Google 원클릭 로그인과 일반 비밀번호
          로그인을 모두 등록하여 편리하게 이용하실 수 있습니다.
        </p>

        {isLoading ? (
          <div className="py-8 flex justify-center items-center text-xs text-neutral-400">
            로그인 수단 정보 조회 중...
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Google Authentication Method Card */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center font-bold text-sm text-neutral-200 shrink-0">
                    G
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-100">Google 계정</span>
                      {isGoogleLinked ? (
                        <Badge variant="success">연결됨</Badge>
                      ) : (
                        <Badge variant="default">미연결</Badge>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                      {isGoogleLinked
                        ? 'Google 계정으로 원클릭 로그인이 활성화되어 있습니다.'
                        : 'Google 계정을 연결하여 간편하게 원클릭으로 로그인하세요.'}
                    </p>
                  </div>
                </div>

                <div className="self-end sm:self-auto shrink-0">
                  {isGoogleLinked ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleUnlinkGoogle}
                      isLoading={unlinkMutation.isPending}
                      disabled={!hasPassword || totalIdentitiesCount <= 1}
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>연결 해제</span>
                    </Button>
                  ) : null}
                </div>
              </div>

              {!isGoogleLinked ? (
                <div className="pt-2 border-t border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <span className="text-xs text-neutral-400">현재 계정에 Google 계정 추가:</span>
                  <div className="scale-90 origin-left sm:origin-right">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setGoogleActionError('Google 계정 인증이 취소되었습니다.')}
                      theme="filled_black"
                      shape="pill"
                      size="medium"
                      text="continue_with"
                    />
                  </div>
                </div>
              ) : null}

              {googleActionError ? (
                <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{googleActionError}</span>
                </div>
              ) : null}

              {googleActionSuccess ? (
                <div className="flex items-center gap-2 p-2.5 bg-green-500/10 border border-green-500/20 text-green-300 text-xs rounded-lg">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />
                  <span>{googleActionSuccess}</span>
                </div>
              ) : null}
            </div>

            {/* Email / Password Method Card */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#5e6ad2] shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-100">
                        이메일 비밀번호 로그인
                      </span>
                      {hasPassword ? (
                        <Badge variant="success">설정됨</Badge>
                      ) : (
                        <Badge variant="default">미설정</Badge>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed truncate sm:whitespace-normal">
                      {userEmail} 계정으로 비밀번호를 입력하여 직접 로그인합니다.
                    </p>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="self-end sm:self-auto shrink-0"
                  onClick={() => {
                    setIsPasswordFormOpen((prev) => !prev);
                    setPasswordError(null);
                    setPasswordSuccess(null);
                    setSetupStep('initial');
                  }}
                >
                  <span>{hasPassword ? '비밀번호 변경' : '비밀번호 설정'}</span>
                  {isPasswordFormOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>

              {/* Password Setting / Changing Area */}
              {isPasswordFormOpen ? (
                <div className="mt-2 pt-3 border-t border-white/[0.06] flex flex-col gap-3">
                  {/* Case 1: 비밀번호 설정 또는 변경 전 이메일 인증번호 발송 단계 */}
                  {setupStep === 'initial' ? (
                    <div className="p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl flex flex-col gap-3">
                      <div className="flex items-start gap-2.5 text-xs text-neutral-300">
                        <Mail className="w-4 h-4 text-[#5e6ad2] shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-neutral-100 mb-0.5">
                            이메일 본인 확인 필요
                          </p>
                          <p className="text-neutral-400 leading-relaxed">
                            {hasPassword
                              ? '비밀번호를 안전하게 변경하기 위해 등록된 계정 이메일 ('
                              : '계정 보안을 위해 Google 계정 이메일 ('}
                            <span className="text-neutral-200 font-medium">{userEmail}</span>)로
                            6자리 일회용 인증번호를 발송합니다.
                          </p>
                        </div>
                      </div>

                      {passwordError ? (
                        <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-lg">
                          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                          <span>{passwordError}</span>
                        </div>
                      ) : null}

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsPasswordFormOpen(false)}
                          disabled={requestCodeMutation.isPending}
                        >
                          취소
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => requestCodeMutation.mutate()}
                          isLoading={requestCodeMutation.isPending}
                        >
                          인증번호 발송
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {/* Case 2: 인증번호 발송 완료 후 입력 폼 */}
                  {setupStep === 'code_sent' ? (
                    <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
                      {/* 인증코드 입력란 (설정 및 변경 모두 사용) */}
                      <div className="p-3 bg-[#5e6ad2]/10 border border-[#5e6ad2]/20 rounded-xl mb-1">
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-medium text-[#8590ea]">
                            이메일 인증번호 6자리
                          </label>
                          <button
                            type="button"
                            onClick={() => requestCodeMutation.mutate()}
                            disabled={requestCodeMutation.isPending}
                            className="text-[11px] text-neutral-400 hover:text-white underline cursor-pointer"
                          >
                            인증번호 재전송
                          </button>
                        </div>
                        <Input
                          type="text"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          placeholder="6자리 숫자 입력 (예: 123456)"
                          disabled={
                            hasPassword
                              ? setPasswordMutation.isPending
                              : confirmSetupMutation.isPending
                          }
                          className="tracking-widest font-mono text-center text-base"
                        />
                        <p className="text-[10px] text-neutral-400 mt-1">
                          {userEmail}로 전송된 6자리 번호를 5분 내에 입력해 주세요.
                        </p>
                      </div>

                      {/* 기존 비밀번호 변경 시 현재 비밀번호 입력란 */}
                      {hasPassword ? (
                        <div>
                          <label className="block text-xs text-neutral-300 mb-1">
                            현재 비밀번호
                          </label>
                          <Input
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="현재 비밀번호를 입력하세요"
                            disabled={setPasswordMutation.isPending}
                          />
                        </div>
                      ) : null}

                      <div>
                        <label className="block text-xs text-neutral-300 mb-1">
                          {hasPassword ? '새 비밀번호' : '설정할 비밀번호'} (8자 이상,
                          영문/숫자/특수문자 포함)
                        </label>
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="영문, 숫자, 특수문자를 포함한 8자 이상 비밀번호"
                          disabled={
                            hasPassword
                              ? setPasswordMutation.isPending
                              : confirmSetupMutation.isPending
                          }
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-neutral-300 mb-1">비밀번호 확인</label>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="비밀번호를 다시 한번 입력하세요"
                          disabled={
                            hasPassword
                              ? setPasswordMutation.isPending
                              : confirmSetupMutation.isPending
                          }
                        />
                      </div>

                      {passwordError ? (
                        <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-lg">
                          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                          <span>{passwordError}</span>
                        </div>
                      ) : null}

                      {passwordSuccess ? (
                        <div className="flex items-center gap-2 p-2.5 bg-green-500/10 border border-green-500/20 text-green-300 text-xs rounded-lg">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />
                          <span>{passwordSuccess}</span>
                        </div>
                      ) : null}

                      <div className="flex justify-end gap-2 mt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsPasswordFormOpen(false);
                            setSetupStep('initial');
                          }}
                          disabled={
                            hasPassword
                              ? setPasswordMutation.isPending
                              : confirmSetupMutation.isPending
                          }
                        >
                          취소
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          isLoading={
                            hasPassword
                              ? setPasswordMutation.isPending
                              : confirmSetupMutation.isPending
                          }
                        >
                          {hasPassword ? '비밀번호 변경 완료' : '비밀번호 등록 완료'}
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Security Tip Box */}
            <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl flex items-start gap-2.5 text-xs text-neutral-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                안전을 위해 최소 하나 이상의 로그인 수단이 항상 유지되어야 합니다. Google 계정과
                비밀번호를 둘 다 설정하시면 어느 기기에서든 제약 없이 접속하실 수 있습니다.
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
