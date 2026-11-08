import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'navy' | 'gold' | 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'slate';
  size?: 'sm' | 'md';
  className?: string;
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  className = '',
  dot = false,
}) => {
  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-medium",
    md: "px-2.5 py-1 text-xs font-semibold",
  };

  const variantClasses = {
    navy: "bg-navy-100 text-navy-900 border border-navy-200/60",
    gold: "bg-amber-50 text-amber-900 border border-amber-300/60",
    green: "bg-emerald-50 text-emerald-800 border border-emerald-200/80",
    blue: "bg-sky-50 text-sky-800 border border-sky-200/80",
    yellow: "bg-amber-50 text-amber-800 border border-amber-200/80",
    red: "bg-rose-50 text-rose-800 border border-rose-200/80",
    purple: "bg-purple-50 text-purple-800 border border-purple-200/80",
    slate: "bg-slate-100 text-slate-800 border border-slate-200",
  };

  const dotColors = {
    navy: "bg-navy-700",
    gold: "bg-gold-500",
    green: "bg-emerald-500",
    blue: "bg-sky-500",
    yellow: "bg-amber-500",
    red: "bg-rose-500",
    purple: "bg-purple-500",
    slate: "bg-slate-500",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

