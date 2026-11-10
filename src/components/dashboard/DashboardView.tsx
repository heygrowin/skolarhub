import React, { useState, useEffect, useCallback } from 'react';
import { OverviewMetrics } from './OverviewMetrics';
import { DistributionCharts } from './DistributionCharts';
import { RecentActivityFeed } from './RecentActivityFeed';
import { QuickActionModal } from './QuickActionModal';
import { NavigationSection } from '../layout/Sidebar';
import { getStudents } from '../../services/studentService';
import { getApplications } from '../../services/applicationService';
import { getCountries } from '../../services/countryService';
import { getPartners } from '../../services/partnerService';
import { getInvoices, getPayments, getExpenses, calculateBusinessFinancialSummary } from '../../services/financeService';
import { getDocuments } from '../../services/documentService';
import { Student, Application, Partner, Invoice, Payment, DocumentRecord, BusinessFinancialSummary } from '../../types';
import { useYear } from '../../context/YearContext';
import { useCountry } from '../../context/CountryContext';
import { Button } from '../common/Button';
import { RefreshCw, Plus, Calendar } from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (section: NavigationSection) => void;
  onOpenAddStudent: () => void;
  onOpenAddCountry: () => void;
  onOpenAddPartner: () => void;
  onOpenCreateInvoice: () => void;
  onOpenRecordExpense: () => void;
  dataVersion?: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenAddStudent,
  onOpenAddCountry,
  onOpenAddPartner,
  onOpenCreateInvoice,
  onOpenRecordExpense,
  dataVersion = 0,
}) => {
  const { selectedYearFilter, refreshYears } = useYear();
  const { selectedCountryFilter } = useCountry();

  const [loading, setLoading] = useState<boolean>(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [countriesCount, setCountriesCount] = useState<number>(0);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [financeSummary, setFinanceSummary] = useState<BusinessFinancialSummary>({
    totalInvoiced: {},
    totalCollected: {},
    totalOutstanding: {},
    totalExpenses: {},
    netProfit: {},
  });
  const [quickActionOpen, setQuickActionOpen] = useState<boolean>(false);

  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const [
        studentRes,
        appsRes,
        countriesRes,
        partnersRes,
        invsRes,
        paysRes,
        expsRes,
        docsRes,
      ] = await Promise.all([
        getStudents({ forceRefresh }),
        getApplications({ forceRefresh }),
        getCountries(forceRefresh),
        getPartners(forceRefresh),
        getInvoices(undefined, forceRefresh),
        getPayments(undefined, forceRefresh),
        getExpenses(undefined, undefined, forceRefresh),
        getDocuments({ forceRefresh }),
      ]);

      // Sync discovered years into YearContext
      const studentYears = studentRes.students
        .map(s => s.intakeYear)
        .filter((y): y is string => Boolean(y));
      if (studentYears.length > 0) {
        refreshYears(studentYears);
      }

      const studentMap = new Map(studentRes.students.map(s => [s.id, s]));

      const filterByYearAndCountry = <T extends { countryCode?: string; intakeYear?: string; studentId?: string; createdAt?: string }>(
        list: T[],
        fallbackCountryGetter?: (item: T) => string | undefined,
        fallbackYearGetter?: (item: T) => string | undefined
      ) => {
        return list.filter(item => {
          const linkedStudent = item.studentId ? studentMap.get(item.studentId) : undefined;
          const itemYear =
            item.intakeYear ||
            linkedStudent?.intakeYear ||
            (fallbackYearGetter ? fallbackYearGetter(item) : undefined) ||
            (item.createdAt ? new Date(item.createdAt).getFullYear().toString() : '');
          const itemCountry =
            item.countryCode ||
            (fallbackCountryGetter ? fallbackCountryGetter(item) : undefined) ||
            linkedStudent?.countryOfInterest;

          const yearMatch = selectedYearFilter === 'ALL' || itemYear === selectedYearFilter;
          const countryMatch = selectedCountryFilter === 'ALL' || itemCountry === selectedCountryFilter;
          return yearMatch && countryMatch;
        });
      };

      const filteredStudents = studentRes.students.filter(s => {
        const sYear = s.intakeYear || (s.registrationDate ? new Date(s.registrationDate).getFullYear().toString() : '');
        const yearMatch = selectedYearFilter === 'ALL' || sYear === selectedYearFilter;
        const countryMatch = selectedCountryFilter === 'ALL' || s.countryOfInterest === selectedCountryFilter;
        return yearMatch && countryMatch;
      });

      const filteredApps = filterByYearAndCountry(appsRes);
      const filteredInvoices = filterByYearAndCountry(invsRes, undefined, (i) =>
        i.invoiceDate ? new Date(i.invoiceDate).getFullYear().toString() : undefined
      );
      const filteredPayments = filterByYearAndCountry(paysRes, undefined, (p) =>
        p.paymentDate ? new Date(p.paymentDate).getFullYear().toString() : undefined
      );
      const filteredExpenses = filterByYearAndCountry(expsRes, undefined, (e) =>
        e.date ? new Date(e.date).getFullYear().toString() : undefined
      );
      const filteredDocs = filterByYearAndCountry(docsRes, undefined, (d) =>
        d.uploadDate ? new Date(d.uploadDate).getFullYear().toString() : undefined
      );

      const summaryRes = calculateBusinessFinancialSummary(filteredInvoices, filteredPayments, filteredExpenses);

      setStudents(filteredStudents);
      setApplications(filteredApps);
      setCountriesCount(countriesRes.length);
      setPartners(partnersRes);
      setInvoices(filteredInvoices);
      setPayments(filteredPayments);
      setDocuments(filteredDocs);
      setFinanceSummary(summaryRes);
    } catch (err: any) {
      console.error('Error loading dashboard records:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedYearFilter, selectedCountryFilter, refreshYears]);

  useEffect(() => {
    loadDashboardData(false);
  }, [loadDashboardData, dataVersion]);

  const pendingApps = applications.filter(a =>
    !['Completed', 'Rejected', 'Withdrawn'].includes(a.status)
  ).length;

  const pendingInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'partial').length;

  const handleQuickActionTrigger = (key: string) => {
    switch (key) {
      case 'add_student': onOpenAddStudent(); break;
      case 'add_country': onOpenAddCountry(); break;
      case 'add_partner': onOpenAddPartner(); break;
      case 'create_invoice': onOpenCreateInvoice(); break;
      case 'record_expense': onOpenRecordExpense(); break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-deep-navy to-midnight p-6 rounded-3xl text-white shadow-card border border-navy-700/60 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-gold-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs uppercase font-bold tracking-widest text-gold-400">Control Center Overview</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {selectedYearFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-gold-400/20 text-gold-300 px-2 py-0.5 rounded-full border border-gold-400/30">
                <Calendar className="w-3 h-3" />
                {selectedYearFilter} Cohort Active
              </span>
            )}
          </div>
          <h2 className="text-2xl font-serif font-bold text-white tracking-tight">
            International Education Pipeline
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            Centralized operations across Italy, Mongolia and global partners with real-time Firestore database synchronization.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <Button
            variant="gold"
            size="sm"
            onClick={onOpenAddStudent}
            icon={<Plus className="w-4 h-4" />}
          >
            Enroll Candidate
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => loadDashboardData(true)}
            loading={loading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Data
          </Button>

          <Button
            variant="gold"
            size="sm"
            onClick={() => setQuickActionOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Action
          </Button>
        </div>
      </div>

      {/* 1. Overview Metric Stat Cards */}
      <OverviewMetrics
        totalStudents={students.length}
        totalApplications={applications.length}
        activeCountries={countriesCount}
        b2bPartners={partners.length}
        pendingApplications={pendingApps}
        pendingInvoicesCount={pendingInvoices}
        onNavigate={onNavigate}
      />

      {/* 2. Visual Distribution Charts & Balance */}
      <DistributionCharts
        students={students}
        applications={applications}
        financeSummary={financeSummary}
      />

      {/* 3. Live Recent Activity Feed */}
      <RecentActivityFeed
        recentStudents={students}
        recentPayments={payments}
        recentDocuments={documents}
        recentApplications={applications}
        onNavigate={onNavigate}
      />

      {/* Quick Action Modal */}
      <QuickActionModal
        isOpen={quickActionOpen}
        onClose={() => setQuickActionOpen(false)}
        onTriggerAction={handleQuickActionTrigger}
      />
    </div>
  );
};
