import React from 'react';
import { Application, Student, BusinessFinancialSummary } from '../../types';
import { Badge } from '../common/Badge';

interface DistributionChartsProps {
  students: Student[];
  applications: Application[];
  financeSummary: BusinessFinancialSummary;
}

export const DistributionCharts: React.FC<DistributionChartsProps> = ({
  students,
  applications,
  financeSummary,
}) => {
  // 1. B2B vs B2C Breakdown
  const b2bCount = students.filter(s => s.acquisitionType === 'B2B').length;
  const b2cCount = students.filter(s => s.acquisitionType === 'B2C').length;
  const totalAcquisition = b2bCount + b2cCount || 1;
  const b2bPercent = Math.round((b2bCount / totalAcquisition) * 100);
  const b2cPercent = Math.round((b2cCount / totalAcquisition) * 100);

  // 2. Applications by Country
  const countryCounts: { [code: string]: number } = {};
  applications.forEach(app => {
    const code = app.countryCode || 'Other';
    countryCounts[code] = (countryCounts[code] || 0) + 1;
  });

  const totalApps = applications.length || 1;

  // 3. Real Candidate Intake Year Distribution (computed from actual Firebase/local records)
  const yearMap: Record<string, number> = {};
  students.forEach(s => {
    const yr = s.intakeYear || (s.registrationDate ? new Date(s.registrationDate).getFullYear().toString() : String(new Date().getFullYear()));
    yearMap[yr] = (yearMap[yr] || 0) + 1;
  });
  const yearEntries = Object.entries(yearMap).sort((a, b) => a[0].localeCompare(b[0]));
  const maxYearVal = Math.max(...yearEntries.map(([, val]) => val), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Chart 1: Acquisition Channels (B2B vs B2C) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-navy-950">Acquisition Distribution</h3>
            <p className="text-xs text-slate-400">Direct B2C vs B2B Partner Referrals</p>
          </div>
          <Badge variant="navy">{students.length} Total</Badge>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-4 pt-2">
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-navy-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-navy-800" />
                Direct Students (B2C)
              </span>
              <span className="text-navy-900">{b2cCount} ({b2cPercent}%)</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-navy-800 transition-all duration-500 rounded-full"
                style={{ width: `${b2cPercent}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold mb-1">
              <span className="text-navy-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gold-400" />
                Partner & Creator Referrals (B2B)
              </span>
              <span className="text-navy-900">{b2bCount} ({b2bPercent}%)</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gold-400 transition-all duration-500 rounded-full"
                style={{ width: `${b2bPercent}%` }}
              />
            </div>
          </div>

          {/* Quick Summary Box */}
          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 flex items-center justify-between">
            <div>
              <span className="font-semibold text-navy-950 block">Key Insight</span>
              <span>{b2bPercent > 40 ? 'Partner channels provide strong volume' : 'Direct web campaigns lead acquisitions'}</span>
            </div>
            <span className="text-xl font-bold text-gold-500">{b2bPercent}% B2B</span>
          </div>
        </div>
      </div>

      {/* Chart 2: Applications by Destination Country */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-navy-950">Destination Country Share</h3>
            <p className="text-xs text-slate-400">Applications by active destinations</p>
          </div>
          <Badge variant="gold">{applications.length} Applications</Badge>
        </div>

        <div className="space-y-3 pt-2">
          {Object.entries(countryCounts).length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No applications recorded yet</p>
          ) : (
            Object.entries(countryCounts).map(([code, count]) => {
              const pct = Math.round((count / totalApps) * 100);
              const flag = code === 'IT' ? '🇮🇹' : code === 'MN' ? '🇲🇳' : '🌐';
              const name = code === 'IT' ? 'Italy' : code === 'MN' ? 'Mongolia' : code;

              return (
                <div key={code}>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-navy-900 flex items-center gap-1.5">
                      <span>{flag}</span>
                      <span>{name}</span>
                    </span>
                    <span className="text-slate-600">{count} dossiers ({pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        code === 'IT' ? 'bg-navy-900' : 'bg-gold-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}

          {/* Real Intake Year Cohort Breakdown */}
          <div className="pt-4 border-t border-slate-100 mt-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Candidates by Intake Year
            </span>
            {yearEntries.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No enrollment data yet</p>
            ) : (
              <div className="flex items-end justify-between h-20 gap-2 px-1">
                {yearEntries.map(([yr, val]) => {
                  const heightPct = Math.round((val / maxYearVal) * 100);
                  return (
                    <div key={yr} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group" title={`${yr}: ${val} students`}>
                      <span className="text-[10px] font-bold text-navy-900">{val}</span>
                      <div
                        className="w-full bg-navy-200 group-hover:bg-gold-400 rounded-t transition-all duration-300"
                        style={{ height: `${Math.max(15, heightPct)}%` }}
                      />
                      <span className="text-[10px] text-slate-500 font-semibold">{yr}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart 3: Multi-Currency Financial Overview */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-navy-950">Multi-Currency Balance</h3>
            <p className="text-xs text-slate-400">Strictly segregated ledger accounts</p>
          </div>
          <Badge variant="green">Audited</Badge>
        </div>

        <div className="space-y-4 pt-1">
          {/* EUR Block */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Euro Account (€ - EUR)
              </span>
              <span className="text-xs font-bold text-emerald-700">
                +€{(financeSummary.netProfit.EUR || 0).toLocaleString()} Net
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Collected</span>
                <span className="font-semibold text-navy-900">€{(financeSummary.totalCollected.EUR || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Expenses</span>
                <span className="font-semibold text-rose-600">€{(financeSummary.totalExpenses.EUR || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Outstanding</span>
                <span className="font-semibold text-amber-600">€{(financeSummary.totalOutstanding.EUR || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* USD Block */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                US Dollar Account ($ - USD)
              </span>
              <span className="text-xs font-bold text-sky-700">
                +${(financeSummary.netProfit.USD || 0).toLocaleString()} Net
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Collected</span>
                <span className="font-semibold text-navy-900">${(financeSummary.totalCollected.USD || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Expenses</span>
                <span className="font-semibold text-rose-600">${(financeSummary.totalExpenses.USD || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Outstanding</span>
                <span className="font-semibold text-amber-600">${(financeSummary.totalOutstanding.USD || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Compliance note */}
          <p className="text-[10px] text-slate-400 italic">
            * Currencies are never silently converted or conflated. Exact amounts retained.
          </p>
        </div>
      </div>
    </div>
  );
};

