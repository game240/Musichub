import React, { useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import type { UserRole } from '../../../../types/auth';
import { Tooltip } from '../../../atoms/Tooltip';

export interface UserRoleSelectProps {
  currentRole: UserRole;
  isSelf: boolean;
  isUpdating: boolean;
  onRoleChange: (newRole: UserRole) => void;
}

export const UserRoleSelect: React.FC<UserRoleSelectProps> = ({
  currentRole,
  isSelf,
  isUpdating,
  onRoleChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const roleOptions: Array<{ value: UserRole; label: string; desc: string }> = [
    { value: null, label: '일반 사용자', desc: '스트리밍 / 업로드 / 재생목록' },
    { value: 'DOWNLOADER', label: '다운로더', desc: '기본 기능 + 음원 다운로드' },
    { value: 'ADMIN', label: '최고 관리자', desc: '모든 권한 + 유저 관리' },
  ];

  if (isSelf) {
    return (
      <Tooltip content="본인 계정의 관리자 권한은 해제할 수 없습니다." side="left">
        <span className="inline-flex items-center px-2.5 py-1 text-xs text-neutral-500 bg-white/[0.02] border border-white/[0.05] rounded-lg cursor-not-allowed">
          변경 불가 (본인)
        </span>
      </Tooltip>
    );
  }

  const selectedOption = roleOptions.find((opt) => opt.value === currentRole) || roleOptions[0];

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        disabled={isUpdating}
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#121315] hover:bg-[#18191c] border border-white/[0.1] hover:border-white/[0.2] text-xs font-medium text-neutral-200 rounded-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-wait"
      >
        {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#5e6ad2]" /> : null}
        <span>{selectedOption.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-52 bg-[#0f1011] border border-white/[0.12] rounded-xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-xl animate-fade-in">
            {roleOptions.map((opt) => {
              const isSelected = opt.value === currentRole;
              return (
                <button
                  key={opt.value ?? 'null'}
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    if (opt.value !== currentRole) {
                      onRoleChange(opt.value);
                    }
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex flex-col gap-0.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#5e6ad2]/20 text-[#8590ea] font-medium'
                      : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{opt.label}</span>
                    {isSelected ? <span className="text-[10px] text-[#8590ea]">현재</span> : null}
                  </div>
                  <span className="text-[10px] text-neutral-500">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
};
