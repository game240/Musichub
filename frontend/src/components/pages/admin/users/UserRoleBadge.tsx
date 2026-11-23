import React from 'react';
import { Shield, Download, User as UserIcon } from 'lucide-react';
import type { UserRole } from '../../../../types/auth';

export interface UserRoleBadgeProps {
  role: UserRole;
  className?: string;
}

export const UserRoleBadge: React.FC<UserRoleBadgeProps> = ({ role, className = '' }) => {
  if (role === 'ADMIN') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#5e6ad2]/20 text-[#8590ea] border border-[#5e6ad2]/35 shadow-sm ${className}`}
      >
        <Shield className="w-3 h-3 text-[#8590ea]" />
        <span>관리자</span>
      </span>
    );
  }

  if (role === 'DOWNLOADER') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm ${className}`}
      >
        <Download className="w-3 h-3 text-sky-400" />
        <span>다운로더</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/[0.05] text-neutral-400 border border-white/[0.08] ${className}`}
    >
      <UserIcon className="w-3 h-3 text-neutral-500" />
      <span>일반 사용자</span>
    </span>
  );
};
