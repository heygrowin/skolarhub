import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  icon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-navy-900 uppercase tracking-wider mb-1.5">
          {label} {props.required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative rounded-xl shadow-sm">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`block w-full rounded-xl border ${
            error
              ? 'border-rose-400 text-rose-900 focus:ring-rose-500 focus:border-rose-500'
              : 'border-slate-300 text-navy-950 focus:ring-navy-600 focus:border-navy-600'
          } ${icon ? 'pl-10' : 'pl-3.5'} pr-3.5 py-2.5 text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="mt-1 text-xs text-rose-600">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';

