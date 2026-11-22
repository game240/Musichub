import React, { useEffect, useRef } from 'react';
import { Check, Minus } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean, event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  id?: string;
  name?: string;
  'aria-label'?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked = false,
  indeterminate = false,
  onChange,
  disabled = false,
  size = 'sm',
  className = '',
  id,
  name,
  'aria-label': ariaLabel,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const sizeClasses = {
    sm: 'w-4 h-4 rounded-[4px]',
    md: 'w-5 h-5 rounded-[5px]',
  };

  const iconSizes = {
    sm: 'w-3 h-3 stroke-[2.5]',
    md: 'w-3.5 h-3.5 stroke-[2.5]',
  };

  const isCheckedOrIndeterminate = checked || indeterminate;

  return (
    <label
      className={cn(
        'relative inline-flex items-center justify-center cursor-pointer select-none group',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
      onClick={(e) => {
        // Prevent row selection triggers or propagation when clicking label
        e.stopPropagation();
      }}
    >
      <input
        ref={inputRef}
        type="checkbox"
        id={id}
        name={name}
        aria-label={ariaLabel}
        checked={checked}
        disabled={disabled}
        onChange={(e) => {
          if (!disabled && onChange) {
            onChange(e.target.checked, e);
          }
        }}
        className="sr-only"
      />
      <div
        className={cn(
          'flex items-center justify-center transition-all duration-150 border',
          sizeClasses[size],
          isCheckedOrIndeterminate
            ? 'bg-[#5e6ad2] border-[#5e6ad2] text-white shadow-sm shadow-[#5e6ad2]/30'
            : 'bg-[#0f1011] border-white/20 group-hover:border-white/40 text-transparent',
          'group-focus-within:ring-2 group-focus-within:ring-[#5e6ad2] group-focus-within:ring-offset-1 group-focus-within:ring-offset-[#08090a]',
        )}
      >
        {indeterminate ? (
          <Minus className={cn('text-white transition-transform', iconSizes[size])} />
        ) : (
          <Check
            className={cn(
              'text-white transition-all',
              iconSizes[size],
              checked ? 'scale-100 opacity-100' : 'scale-50 opacity-0',
            )}
          />
        )}
      </div>
    </label>
  );
};
