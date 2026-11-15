import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          ref={ref}
          className={`w-full bg-slate-800 border rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
            error ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-700'
          } ${className}`}
          {...props}
        />
        {error ? <p className="mt-1 text-xs text-rose-400">{error}</p> : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
