import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { ShieldCheck, Lock, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Unlink } from 'lucide-react';
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

  const setPasswordMutation = useMutation({
    mutationFn: (payload: SetPasswordRequest) => userApi.setPassword(payload),
    onSuccess: () => {
      setPasswordSuccess('비밀번호가 성공적으로 저장되었습니다.');
      setPasswordError(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['user-identities'] });
    },
    onError: (err: unknown) => {
      let msg = '비밀번호 저장에 실패했습니다.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setPasswordError(msg);
      setPasswordSuccess(null);
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

  const isGoogleLinked = data?.identities.some((i) => i.provider === 'GOOGLE') ?? false;
  const hasPassword = data?.hasPassword ?? false;
  const totalIdentitiesCount = data?.identities.length ?? 0;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (hasPassword && !currentPassword) {
      setPasswordError('현재 비밀번호를 입력해 주세요.');
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

    setPasswordMutation.mutate({
      currentPassword: hasPassword ? currentPassword : undefined,
      newPassword,
    });
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
          Music Hub에 접속할 수 있는 로그인 수단을 관리합니다. Google 원클릭 로그인과 일반 비밀번호 로그인을
          모두 등록하여 편리하게 이용하실 수 있습니다.
        </p>

        {isLoading ? (
          <div className="py-8 flex justify-center items-center text-xs text-neutral-400">
            로그인 수단 정보 조회 중...
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Google Authentication Method Card */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center font-bold text-sm text-neutral-200">
                    G
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-100">Google 계정</span>
                      {isGoogleLinked ? (
                        <Badge variant="success">
                          연결됨
                        </Badge>
                      ) : (
                        <Badge variant="default">
                          미연결
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {isGoogleLinked
                        ? 'Google 계정으로 원클릭 로그인이 활성화되어 있습니다.'
                        : 'Google 계정을 연결하여 간편하게 원클릭으로 로그인하세요.'}
                    </p>
                  </div>
                </div>

                <div>
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
                <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between">
                  <span className="text-xs text-neutral-400">현재 계정에 Google 계정 추가:</span>
                  <div className="scale-90 origin-right">
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-[#5e6ad2]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-100">이메일 비밀번호 로그인</span>
                      {hasPassword ? (
                        <Badge variant="success">
                          설정됨
                        </Badge>
                      ) : (
                        <Badge variant="default">
                          미설정
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {userEmail} 계정으로 비밀번호를 입력하여 직접 로그인합니다.
                    </p>
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setIsPasswordFormOpen((prev) => !prev);
                    setPasswordError(null);
                    setPasswordSuccess(null);
                  }}
                >
                  <span>{hasPassword ? '비밀번호 변경' : '비밀번호 설정'}</span>
                  {isPasswordFormOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </Button>
              </div>

              {/* Password Setting / Changing Form */}
              {isPasswordFormOpen ? (
                <form
                  onSubmit={handlePasswordSubmit}
                  className="mt-2 pt-3 border-t border-white/[0.06] flex flex-col gap-3"
                >
                  {hasPassword ? (
                    <div>
                      <label className="block text-xs text-neutral-300 mb-1">현재 비밀번호</label>
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
                      {hasPassword ? '새 비밀번호' : '설정할 비밀번호'} (최소 8자)
                    </label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="8자 이상의 안전한 비밀번호"
                      disabled={setPasswordMutation.isPending}
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-neutral-300 mb-1">비밀번호 확인</label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="비밀번호를 다시 한번 입력하세요"
                      disabled={setPasswordMutation.isPending}
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
                      onClick={() => setIsPasswordFormOpen(false)}
                      disabled={setPasswordMutation.isPending}
                    >
                      취소
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={setPasswordMutation.isPending}
                    >
                      {hasPassword ? '비밀번호 변경 완료' : '비밀번호 등록'}
                    </Button>
                  </div>
                </form>
              ) : null}
            </div>

            {/* Security Tip Box */}
            <div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl flex items-start gap-2.5 text-xs text-neutral-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                안전을 위해 최소 하나 이상의 로그인 수단이 항상 유지되어야 합니다. Google 계정과 비밀번호를 둘
                다 설정하시면 어느 기기에서든 제약 없이 접속하실 수 있습니다.
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
