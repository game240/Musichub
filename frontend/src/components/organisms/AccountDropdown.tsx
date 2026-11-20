import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, ShieldCheck, ChevronDown } from 'lucide-react';
import { formatBytes } from '../../utils/formatBytes';

export interface AccountDropdownProps {
  user: {
    displayName: string | null;
    email: string;
    profileImageUrl: string | null;
    storageUsedBytes: number;
  };
  onOpenSecurityModal: () => void;
  onLogout: () => void;
}

export const AccountDropdown: React.FC<AccountDropdownProps> = ({
  user,
  onOpenSecurityModal,
  onLogout,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const maxStorageBytes = 2 * 1024 * 1024 * 1024; // 2.0 GB
  const usagePercentage = Math.min(100, Math.round((user.storageUsedBytes / maxStorageBytes) * 100));

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-xl hover:bg-white/[0.05] transition-all cursor-pointer border border-transparent hover:border-white/[0.08]"
      >
        {user.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt={user.displayName || user.email}
            className="w-7 h-7 rounded-full border border-white/[0.1] object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-neutral-400">
            <User className="w-4 h-4" />
          </div>
        )}
        <span className="text-xs font-medium text-neutral-200 hidden sm:inline max-w-[120px] truncate">
          {user.displayName || user.email}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen ? (
        <div className="absolute right-0 mt-2 w-64 bg-[#0f1011] border border-white/[0.1] rounded-2xl shadow-2xl p-2 z-50 flex flex-col gap-1 backdrop-blur-2xl animate-fade-in">
          {/* Header Info */}
          <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.05] flex flex-col gap-1.5 mb-1">
            <div className="flex items-center gap-2.5">
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={user.displayName || user.email}
                  className="w-8 h-8 rounded-full border border-white/[0.1] object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center text-neutral-400">
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-neutral-100 truncate">
                  {user.displayName || '뮤직허브 사용자'}
                </p>
                <p className="text-[11px] text-neutral-400 truncate">{user.email}</p>
              </div>
            </div>

            {/* Storage Progress */}
            <div className="mt-2 pt-2 border-t border-white/[0.05]">
              <div className="flex justify-between text-[10px] text-neutral-400 mb-1">
                <span>보관함 용량</span>
                <span>
                  {formatBytes(user.storageUsedBytes)} / {formatBytes(maxStorageBytes)}
                </span>
              </div>
              <div className="w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#5e6ad2] h-full rounded-full transition-all duration-300"
                  style={{ width: `${usagePercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onOpenSecurityModal();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-neutral-200 hover:text-white rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer text-left"
          >
            <ShieldCheck className="w-4 h-4 text-[#5e6ad2]" />
            <span>계정 보안 및 로그인 수단 관리</span>
          </button>

          <div className="h-[1px] bg-white/[0.06] my-1" />

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>로그아웃</span>
          </button>
        </div>
      ) : null}
    </div>
  );
};
