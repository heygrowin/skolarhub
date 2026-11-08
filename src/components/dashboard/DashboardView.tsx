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
import { Student, Application, Partner, Invoice, Payment, Expense, DocumentRecord, BusinessFinancialSummary } from '../../types';
import { seedInitialSystemData } from '../../lib/seedData';
import { invalidateCache } from '../../lib/firestoreUtils';
import { Button } from '../common/Button';
import { Sparkles, RefreshCw, Plus } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface DashboardViewProps {
  onNavigate: (section: NavigationSection) => void;
  onOpenAddStudent: () => void;
  onOpenAddCountry: () => void;
  onOpenAddPartner: () => void;
  onOpenCreateInvoice: () => void;
  onOpenRecordExpense: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenAddStudent,
  onOpenAddCountry,
  onOpenAddPartner,
  onOpenCreateInvoice,
  onOpenRecordExpense,
}) => {
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
  const [seeding, setSeeding] = useState<boolean>(false);
  const [quickActionOpen, setQuickActionOpen] = useState<boolean>(false);
  const { success, error } = useToast();

  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      invalidateCache();
    }
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
        getStudents(),
        getApplications(),
        getCountries(),
        getPartners(),
        getInvoices(),
        getPayments(),
        getExpenses(),
        getDocuments(),
      ]);

      const summaryRes = calculateBusinessFinancialSummary(invsRes, paysRes, expsRes);

      setStudents(studentRes.students);
      setApplications(appsRes);
      setCountriesCount(countriesRes.length);
      setPartners(partnersRes);
      setInvoices(invsRes);
      setPayments(paysRes);
      setDocuments(docsRes);
      setFinanceSummary(summaryRes);
    } catch (err: any) {
      console.error('Error loading dashboard records:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const res = await seedInitialSystemData();
      if (res.success) {
        success('System Initialized', res.message);
        await loadDashboardData(false);
      } else {
        error('Seeding notice', res.message);
      }
    } catch (err: any) {
      error('Failed to seed system', err?.message);
    } finally {
      setSeeding(false);
    }
  };

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
        {/* Background glow decoration */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-gold-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs uppercase font-bold tracking-widest text-gold-400">Control Center Overview</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
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

