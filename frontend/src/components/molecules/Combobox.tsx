import React, { useState, useRef, useEffect, useImperativeHandle } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  error?: string;
  className?: string;
  inputClassName?: string;
  onClick?: (e: React.MouseEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export const Combobox = React.forwardRef<HTMLInputElement, ComboboxProps>(
  (
    {
      value,
      onChange,
      options,
      placeholder,
      disabled = false,
      readOnly = false,
      error,
      className,
      inputClassName,
      onClick,
      onFocus,
    },
    forwardedRef,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number>(-1);
    const [forceShowAll, setForceShowAll] = useState(false);

    useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);

    // Compute displayed options based on input value
    const trimmedVal = value.trim();
    const isExactMatch = options.some((opt) => opt.toLowerCase() === trimmedVal.toLowerCase());

    const displayedOptions = React.useMemo(() => {
      if (forceShowAll || !trimmedVal || isExactMatch) {
        return options;
      }
      return options.filter((opt) => opt.toLowerCase().includes(trimmedVal.toLowerCase()));
    }, [options, trimmedVal, isExactMatch, forceShowAll]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setForceShowAll(false);
          setActiveIndex(-1);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleOutsideClick);
      }
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
      };
    }, [isOpen]);

    // Scroll active item into view
    useEffect(() => {
      if (isOpen && activeIndex >= 0 && itemRefs.current[activeIndex]) {
        itemRefs.current[activeIndex]?.scrollIntoView({
          block: 'nearest',
        });
      }
    }, [activeIndex, isOpen]);

    const handleSelect = (option: string) => {
      onChange(option);
      setIsOpen(false);
      setForceShowAll(false);
      setActiveIndex(-1);
      inputRef.current?.focus();
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setForceShowAll(false);
      if (!isOpen && !readOnly && !disabled) {
        setIsOpen(true);
      }
      setActiveIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled || readOnly) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setForceShowAll(true);
          setActiveIndex(0);
        } else if (displayedOptions.length > 0) {
          setActiveIndex((prev) => (prev + 1) % displayedOptions.length);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setForceShowAll(true);
          setActiveIndex(displayedOptions.length - 1);
        } else if (displayedOptions.length > 0) {
          setActiveIndex((prev) => (prev - 1 + displayedOptions.length) % displayedOptions.length);
        }
      } else if (e.key === 'Enter') {
        if (isOpen && activeIndex >= 0 && activeIndex < displayedOptions.length) {
          e.preventDefault();
          handleSelect(displayedOptions[activeIndex]);
        }
      } else if (e.key === 'Escape') {
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
          setForceShowAll(false);
          setActiveIndex(-1);
        }
      }
    };

    const toggleDropdown = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (disabled || readOnly) return;

      if (!isOpen) {
        setForceShowAll(true);
        setIsOpen(true);
        inputRef.current?.focus();
      } else {
        setIsOpen(false);
        setForceShowAll(false);
      }
    };

    return (
      <div ref={containerRef} className={cn('relative w-full', className)}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onClick={(e) => {
              onClick?.(e);
              if (!readOnly && !disabled) {
                setIsOpen(true);
              }
            }}
            onFocus={(e) => {
              onFocus?.(e);
              if (!readOnly && !disabled) {
                setIsOpen(true);
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            className={cn(
              'w-full bg-[#0f1011] border rounded-lg px-3 py-2 pr-8 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] transition-all duration-150',
              error
                ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500'
                : 'border-white/[0.08]',
              inputClassName,
            )}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={toggleDropdown}
            disabled={disabled || readOnly}
            aria-label="추천 목록 토글"
            className={cn(
              'absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-neutral-200 transition-colors rounded cursor-pointer',
              (disabled || readOnly) && 'opacity-40 cursor-not-allowed pointer-events-none',
            )}
          >
            <ChevronDown
              className={cn(
                'w-4 h-4 text-neutral-400 transition-transform duration-150',
                isOpen && 'rotate-180 text-[#8590ea]',
              )}
            />
          </button>
        </div>

        {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}

        {/* Suggestion Dropdown Popover */}
        {isOpen && !readOnly && !disabled && (
          <div
            ref={listRef}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-[#0f1011] border border-white/[0.12] rounded-xl shadow-2xl p-1.5 max-h-52 overflow-y-auto backdrop-blur-xl animate-in fade-in zoom-in-95 divide-y divide-white/[0.02]"
          >
            {displayedOptions.length > 0 ? (
              displayedOptions.map((option, idx) => {
                const isSelected = option.toLowerCase() === value.trim().toLowerCase();
                const isHighlighted = idx === activeIndex;

                return (
                  <button
                    key={`${option}-${idx}`}
                    ref={(el) => {
                      itemRefs.current[idx] = el;
                    }}
                    type="button"
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      'w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer group',
                      isSelected && 'bg-[#5e6ad2]/20 text-[#8590ea] font-medium',
                      !isSelected && isHighlighted && 'bg-white/[0.06] text-white',
                      !isSelected && !isHighlighted && 'text-neutral-300 hover:text-white hover:bg-white/[0.04]',
                    )}
                  >
                    <span className="truncate flex-1">{option}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#8590ea] shrink-0 ml-1.5" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-xs text-neutral-400 text-center">
                일치하는 항목 없음 <span className="text-neutral-500">(직접 입력 유지)</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  },
);

Combobox.displayName = 'Combobox';
