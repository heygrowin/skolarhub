import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none";

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs gap-1.5 shadow-sm",
    md: "px-4 py-2.5 text-sm gap-2 shadow-soft",
    lg: "px-6 py-3 text-base gap-2.5 shadow-card",
  };

  const variantClasses = {
    primary: "bg-navy-900 text-white hover:bg-navy-800 focus:ring-navy-700 border border-navy-800",
    gold: "bg-gold-400 text-navy-950 font-semibold hover:bg-gold-300 focus:ring-gold-500 shadow-soft border border-gold-300",
    secondary: "bg-white text-navy-900 border border-slate-200 hover:bg-slate-50 focus:ring-navy-300 shadow-sm",
    outline: "bg-transparent text-navy-900 border border-slate-300 hover:bg-slate-100/70 focus:ring-navy-400",
    ghost: "bg-transparent text-slate-700 hover:bg-slate-200/60 focus:ring-navy-400 shadow-none",
    danger: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 shadow-sm",
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};

