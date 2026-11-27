import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  RefreshCw,
  Shield,
  User as UserIcon,
  Calendar,
  HardDrive,
  Music,
} from 'lucide-react';
import { adminApi, type AdminUserDto } from '../../../../api/adminApi';
import { useAuthStore } from '../../../../stores/authStore';
import { useToastStore } from '../../../../stores/toastStore';
import { formatBytes } from '../../../../utils/formatBytes';
import { SearchInput } from '../../../molecules/SearchInput';
import { Spinner } from '../../../atoms/Spinner';
import { UserRoleBadge } from './UserRoleBadge';
import { UserRoleSelect } from './UserRoleSelect';
import type { UserRole } from '../../../../types/auth';

export interface AdminUsersPageProps {
  onBack: () => void;
}

export const AdminUsersPage: React.FC<AdminUsersPageProps> = ({ onBack }) => {
  const currentUser = useAuthStore((state) => state.user);
  const addToast = useToastStore((state) => state.addToast);
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [pageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setPage(0); // Reset to first page on search
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['adminUsers', debouncedQuery, page, pageSize],
    queryFn: () => adminApi.listUsers(debouncedQuery, page, pageSize),
  });

  const users = data?.content || [];
  const totalElements = data?.totalElements || 0;
  const totalPages = data?.totalPages || 0;

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: UserRole }) =>
      adminApi.updateUserRole(userId, role),
    onSuccess: (updatedUser, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      const roleLabel =
        variables.role === 'ADMIN'
          ? '관리자'
          : variables.role === 'DOWNLOADER'
            ? '다운로더'
            : '일반 사용자';
      addToast(
        `${updatedUser.displayName || updatedUser.email}님의 권한이 [${roleLabel}]로 변경되었습니다.`,
        'success',
      );
    },
    onError: (err: unknown) => {
      console.error('Failed to update role:', err);
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        '권한 변경에 실패했습니다.';
      addToast(errorMessage, 'error');
    },
    onSettled: () => {
      setUpdatingUserId(null);
    },
  });

  const handleRoleChange = (targetUser: AdminUserDto, newRole: UserRole) => {
    setUpdatingUserId(targetUser.id);
    updateRoleMutation.mutate({ userId: targetUser.id, role: newRole });
  };

  const formatDate = (isoString: string) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="min-h-screen bg-[#08090a] text-neutral-100 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#08090a]/80 backdrop-blur-md border-b border-white/[0.08] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>라이브러리로 돌아가기</span>
          </button>
          <div className="h-4 w-[1px] bg-white/[0.08]" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#5e6ad2]/15 border border-[#5e6ad2]/30 flex items-center justify-center text-[#8590ea]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-neutral-100 tracking-tight">
                  사용자 관리
                </h1>
                <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.2 bg-[#5e6ad2]/20 text-[#8590ea] border border-[#5e6ad2]/30 rounded">
                  ADMIN CONSOLE
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                등록된 사용자 목록 조회 및 역할(Role) 권한을 관리합니다.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isLoading || isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#5e6ad2]' : ''}`} />
          <span className="hidden sm:inline">새로고침</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Search & Stats Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="w-full sm:w-80">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="이메일 또는 닉네임 검색..."
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <Users className="w-4 h-4 text-neutral-500" />
            <span>총 {totalElements.toLocaleString()}명의 사용자</span>
          </div>
        </div>

        {/* User Table Container */}
        <div className="bg-[#0f1011] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-medium text-neutral-400 tracking-wider">
                  <th className="py-3 px-4">사용자</th>
                  <th className="py-3 px-4">가입 수단</th>
                  <th className="py-3 px-4">권한 상태</th>
                  <th className="py-3 px-4">보관 용량</th>
                  <th className="py-3 px-4">곡 수</th>
                  <th className="py-3 px-4">가입 일자</th>
                  <th className="py-3 px-4 text-right">권한 변경</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Spinner className="w-6 h-6 text-[#5e6ad2]" />
                        <span>사용자 목록을 불러오는 중...</span>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-neutral-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <UserIcon className="w-8 h-8 text-neutral-600 mb-1" />
                        <span className="font-medium text-neutral-300">
                          검색된 사용자가 없습니다.
                        </span>
                        <span className="text-[11px] text-neutral-500">
                          다른 검색어를 입력해 보세요.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((targetUser) => {
                    const isSelf = currentUser?.id === targetUser.id;
                    const isUpdating = updatingUserId === targetUser.id;

                    return (
                      <tr
                        key={targetUser.id}
                        className={`hover:bg-white/[0.02] transition-colors ${
                          isSelf ? 'bg-white/[0.015]' : ''
                        }`}
                      >
                        {/* User Profile & Email */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {targetUser.profileImageUrl ? (
                              <img
                                src={targetUser.profileImageUrl}
                                alt={targetUser.displayName || targetUser.email}
                                className="w-8 h-8 rounded-full border border-white/[0.1] object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-neutral-400 flex-shrink-0">
                                <UserIcon className="w-4 h-4" />
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-neutral-100 truncate">
                                  {targetUser.displayName || '이름 없음'}
                                </span>
                                {isSelf ? (
                                  <span className="text-[10px] bg-[#5e6ad2]/20 text-[#8590ea] px-1.5 py-0.2 rounded font-medium">
                                    나
                                  </span>
                                ) : null}
                              </div>
                              <span className="text-[11px] text-neutral-400 truncate">
                                {targetUser.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Auth Provider */}
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium tracking-wide uppercase bg-white/[0.04] text-neutral-300 border border-white/[0.06]">
                            {targetUser.authProvider}
                          </span>
                        </td>

                        {/* Role Badge */}
                        <td className="py-3 px-4">
                          <UserRoleBadge role={targetUser.role} />
                        </td>

                        {/* Storage Used */}
                        <td className="py-3 px-4 text-neutral-300">
                          <div className="flex items-center gap-1.5">
                            <HardDrive className="w-3.5 h-3.5 text-neutral-500" />
                            <span>{formatBytes(targetUser.storageUsedBytes)}</span>
                          </div>
                        </td>

                        {/* Track Count */}
                        <td className="py-3 px-4 text-neutral-300">
                          <div className="flex items-center gap-1.5">
                            <Music className="w-3.5 h-3.5 text-neutral-500" />
                            <span>{targetUser.trackCount.toLocaleString()} 곡</span>
                          </div>
                        </td>

                        {/* Created At */}
                        <td className="py-3 px-4 text-neutral-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                            <span>{formatDate(targetUser.createdAt)}</span>
                          </div>
                        </td>

                        {/* Role Change Action */}
                        <td className="py-3 px-4 text-right">
                          <UserRoleSelect
                            currentRole={targetUser.role}
                            isSelf={isSelf}
                            isUpdating={isUpdating}
                            onRoleChange={(newRole) => handleRoleChange(targetUser, newRole)}
                          />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 ? (
            <div className="border-t border-white/[0.08] px-4 py-3 flex items-center justify-between text-xs text-neutral-400 bg-white/[0.01]">
              <span>
                페이지 {page + 1} / {totalPages} (총 {totalElements}명)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 0 || isLoading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  이전
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages - 1 || isLoading}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  다음
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};
