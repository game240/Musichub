import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const variantClasses = {
    default: 'bg-white/[0.05] text-neutral-300 border border-white/[0.08]',
    success: 'bg-[#27a672]/15 text-[#27a672] border border-[#27a672]/30',
    warning: 'bg-[#f2994a]/15 text-[#f2994a] border border-[#f2994a]/30',
    danger: 'bg-[#eb5757]/15 text-[#eb5757] border border-[#eb5757]/30',
    info: 'bg-[#5e6ad2]/15 text-[#8590ea] border border-[#5e6ad2]/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
