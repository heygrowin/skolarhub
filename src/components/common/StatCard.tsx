import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: 'gold' | 'navy' | 'green' | 'blue' | 'purple';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  accentColor = 'navy',
  onClick,
}) => {
  const iconBgClasses = {
    gold: 'bg-gold-50 text-gold-600 border border-gold-200/50',
    navy: 'bg-navy-50 text-navy-800 border border-navy-200/50',
    green: 'bg-emerald-50 text-emerald-600 border border-emerald-200/50',
    blue: 'bg-sky-50 text-sky-600 border border-sky-200/50',
    purple: 'bg-purple-50 text-purple-600 border border-purple-200/50',
  };

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/80 shadow-soft hover:shadow-card transition-all duration-300 ${
        onClick ? 'cursor-pointer hover:border-gold-300' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={`p-2.5 rounded-xl ${iconBgClasses[accentColor]} transition-transform group-hover:scale-105`}>
          {icon}
        </div>
      </div>

      <div className="flex items-baseline justify-between">
        <h3 className="text-2xl font-extrabold text-navy-950 tracking-tight">{value}</h3>
        {trend && (
          <span
            className={`text-xs font-semibold flex items-center ${
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="mt-1.5 text-xs text-slate-400 font-medium truncate">{subtitle}</p>
      )}

      {/* Subtle bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

