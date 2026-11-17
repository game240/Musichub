import React from 'react';

export interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

export const Slider: React.FC<SliderProps> = ({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  className = '',
  disabled = false,
}) => {
  const percentage =
    max > min ? Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100)) : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className={`relative flex items-center w-full group ${className}`}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={handleChange}
        className="w-full h-1 bg-white/[0.08] rounded-full appearance-none cursor-pointer accent-[#5e6ad2] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none transition-all duration-150 hover:h-1.5"
        style={{
          background: `linear-gradient(to right, #5e6ad2 0%, #5e6ad2 ${percentage}%, rgba(255, 255, 255, 0.12) ${percentage}%, rgba(255, 255, 255, 0.12) 100%)`,
        }}
      />
    </div>
  );
};
