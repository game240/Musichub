import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = '검색...',
  className = '',
}) => {
  const handleClear = () => {
    onChange('');
  };

  return (
    <div className={`relative flex items-center w-full max-w-md ${className}`}>
      <Search className="absolute left-3 w-4 h-4 text-neutral-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        className="w-full bg-[#0f1011] border border-white/[0.08] rounded-lg pl-9 pr-12 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-[#5e6ad2] focus:ring-1 focus:ring-[#5e6ad2] transition-all duration-150"
      />
      {value ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      ) : (
        <span className="absolute right-2.5 text-[10px] border border-white/10 bg-white/[0.04] text-neutral-500 px-1.5 py-0.5 rounded pointer-events-none select-none">
          /
        </span>
      )}
    </div>
  );
};
