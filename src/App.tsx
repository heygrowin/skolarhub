import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CountryProvider } from './context/CountryContext';
import { YearProvider } from './context/YearContext';
import { AppLayout } from './components/layout/AppLayout';
import { NavigationSection } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { StudentList } from './components/students/StudentList';
import { ApplicationList } from './components/applications/ApplicationList';
import { CountryList } from './components/countries/CountryList';
import { PartnerList } from './components/partners/PartnerList';
import { FinanceOverview } from './components/finance/FinanceOverview';
import { DocumentList } from './components/documents/DocumentList';
import { TeamList } from './components/team/TeamList';
import { SettingsView } from './components/settings/SettingsView';
import { LoginForm } from './components/auth/LoginForm';
import { StudentFormModal } from './components/students/StudentFormModal';
import { CountryFormModal } from './components/countries/CountryFormModal';
import { PartnerFormModal } from './components/partners/PartnerFormModal';
import { InvoiceFormModal } from './components/finance/InvoiceFormModal';
import { ExpenseFormModal } from './components/finance/ExpenseFormModal';
import { PaymentFormModal } from './components/finance/PaymentFormModal';
import { ApplicationFormModal } from './components/applications/ApplicationFormModal';
import { DocumentUploadModal } from './components/documents/DocumentUploadModal';
import { DocumentPreviewModal } from './components/documents/DocumentPreviewModal';
import { getStudents, createStudent } from './services/studentService';
import { getPartners, createPartner } from './services/partnerService';
import { createCountry } from './services/countryService';
import { getInvoices, createInvoice, recordExpense, recordPayment } from './services/financeService';
import { createApplication } from './services/applicationService';
import { initProductionWorkspace } from './lib/seedData';
import { Student, Partner, Invoice, DocumentRecord } from './types';
import { Loader2 } from 'lucide-react';

/**
 * Authenticated Workspace: Mounts and synchronizes Firestore data ONLY after user signs in cleanly.
 */
const AuthenticatedWorkspace: React.FC = () => {
  const { userProfile, canAccessModule } = useAuth();
  const { success } = useToast();

  const [currentSection, setCurrentSection] = useState<NavigationSection>('dashboard');
  const [dataVersion, setDataVersion] = useState<number>(0);

  // Shared Modals
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addCountryOpen, setAddCountryOpen] = useState(false);
  const [addPartnerOpen, setAddPartnerOpen] = useState(false);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [recordExpenseOpen, setRecordExpenseOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [createAppOpen, setCreateAppOpen] = useState(false);
  const [uploadDocOpen, setUploadDocOpen] = useState(false);
  const [previewDocOpen, setPreviewDocOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);

  // Cross-modal selected IDs & live cache
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('');
  const [cachedStudents, setCachedStudents] = useState<Student[]>([]);
  const [cachedPartners, setCachedPartners] = useState<Partner[]>([]);
  const [cachedInvoices, setCachedInvoices] = useState<Invoice[]>([]);

  const loadCache = useCallback(async () => {
    try {
      const [stRes, ptList, invList] = await Promise.all([
        getStudents(),
        getPartners(),
        getInvoices(),
      ]);
      setCachedStudents(stRes.students);
      setCachedPartners(ptList);
      setCachedInvoices(invList);
    } catch (e) {
      console.warn(e);
    }
  }, []);

  useEffect(() => {
    initProductionWorkspace();
    loadCache();
  }, [loadCache]);

  const bumpVersion = async () => {
    await loadCache();
    setDataVersion((v) => v + 1);
  };

  // Cross-entity handlers
  const handleOpenAddStudent = () => {
    loadCache();
    setAddStudentOpen(true);
  };

  const handleOpenAddCountry = () => {
    setAddCountryOpen(true);
  };

  const handleOpenAddPartner = () => {
    setAddPartnerOpen(true);
  };

  const handleOpenCreateInvoice = (stId?: string) => {
    loadCache();
    setSelectedStudentId(stId || '');
    setCreateInvoiceOpen(true);
  };

  const handleOpenRecordExpense = (stId?: string) => {
    loadCache();
    setSelectedStudentId(stId || '');
    setSelectedPartnerId('');
    setRecordExpenseOpen(true);
  };

  const handleOpenRecordPayment = (stId?: string) => {
    loadCache();
    setSelectedStudentId(stId || '');
    setRecordPaymentOpen(true);
  };

  const handleOpenCreateApplication = (stId?: string) => {
    loadCache();
    setSelectedStudentId(stId || '');
    setCreateAppOpen(true);
  };

  const handleOpenPartnerPayout = (partner: Partner) => {
    loadCache();
    setSelectedPartnerId(partner.id);
    setRecordExpenseOpen(true);
  };

  const handlePreviewDocument = (doc: DocumentRecord) => {
    setPreviewDoc(doc);
    setPreviewDocOpen(true);
  };

  return (
    <AppLayout
      currentSection={currentSection}
      onSelectSection={setCurrentSection}
      onOpenQuickAction={handleOpenAddStudent}
    >
      {/* 1. Dashboard View */}
      {currentSection === 'dashboard' && canAccessModule('dashboard') && (
        <DashboardView
          onNavigate={setCurrentSection}
          onOpenAddStudent={handleOpenAddStudent}
          onOpenAddCountry={handleOpenAddCountry}
          onOpenAddPartner={handleOpenAddPartner}
          onOpenCreateInvoice={() => handleOpenCreateInvoice()}
          onOpenRecordExpense={() => handleOpenRecordExpense()}
          dataVersion={dataVersion}
        />
      )}

      {/* 2. Students View */}
      {currentSection === 'students' && canAccessModule('students') && (
        <StudentList
          key={`students-${dataVersion}`}
          onOpenCreateApplication={handleOpenCreateApplication}
          onOpenCreateInvoice={handleOpenCreateInvoice}
          onOpenRecordPayment={handleOpenRecordPayment}
          onOpenRecordExpense={handleOpenRecordExpense}
          onPreviewDocument={handlePreviewDocument}
        />
      )}

      {/* 3. Applications View */}
      {currentSection === 'applications' && canAccessModule('applications') && (
        <ApplicationList key={`apps-${dataVersion}`} />
      )}

      {/* 4. Countries View */}
      {currentSection === 'countries' && canAccessModule('countries') && (
        <CountryList key={`countries-${dataVersion}`} />
      )}

      {/* 5. Partners View */}
      {currentSection === 'partners' && canAccessModule('partners') && (
        <PartnerList
          key={`partners-${dataVersion}`}
          onOpenRecordPayout={handleOpenPartnerPayout}
          onSelectStudent={() => setCurrentSection('students')}
        />
      )}

      {/* 6. Finance View */}
      {currentSection === 'finance' && canAccessModule('finance') && (
        <FinanceOverview
          key={`finance-${dataVersion}`}
          preselectedStudentId={selectedStudentId}
          preselectedPartnerId={selectedPartnerId}
        />
      )}

      {/* 7. Documents View */}
      {currentSection === 'documents' && canAccessModule('documents') && (
        <DocumentList key={`docs-${dataVersion}`} />
      )}

      {/* 8. Team View */}
      {currentSection === 'team' && canAccessModule('team') && (
        <TeamList />
      )}

      {/* 9. Settings View */}
      {currentSection === 'settings' && canAccessModule('settings') && (
        <SettingsView />
      )}

      {/* Modals Accessible Across the Workspace */}
      <StudentFormModal
        isOpen={addStudentOpen}
        onClose={() => setAddStudentOpen(false)}
        onSubmit={async (data) => {
          await createStudent(data);
          success('Student Registered', `${data.fullName} is now enrolled.`);
          await bumpVersion();
        }}
        partners={cachedPartners}
      />

      <CountryFormModal
        isOpen={addCountryOpen}
        onClose={() => setAddCountryOpen(false)}
        onSubmit={async (data) => {
          await createCountry(data);
          success('Country Added', `${data.name} is now available.`);
          await bumpVersion();
        }}
      />

      <PartnerFormModal
        isOpen={addPartnerOpen}
        onClose={() => setAddPartnerOpen(false)}
        onSubmit={async (data) => {
          await createPartner(data);
          success('Partner Onboarded', `${data.name} joined the network.`);
          await bumpVersion();
        }}
      />

      <InvoiceFormModal
        isOpen={createInvoiceOpen}
        onClose={() => setCreateInvoiceOpen(false)}
        onSubmit={async (data) => {
          await createInvoice(data);
          success('Invoice Created', `Invoice ${data.invoiceNumber} recorded.`);
          await bumpVersion();
        }}
        students={cachedStudents}
        preselectedStudentId={selectedStudentId}
      />

      <ExpenseFormModal
        isOpen={recordExpenseOpen}
        onClose={() => setRecordExpenseOpen(false)}
        onSubmit={async (data) => {
          await recordExpense(data);
          success('Expense Logged', `${data.title} recorded.`);
          await bumpVersion();
        }}
        students={cachedStudents}
        partners={cachedPartners}
        preselectedStudentId={selectedStudentId}
        preselectedPartnerId={selectedPartnerId}
      />

      <PaymentFormModal
        isOpen={recordPaymentOpen}
        onClose={() => setRecordPaymentOpen(false)}
        onSubmit={async (data) => {
          await recordPayment(data);
          success('Payment Received', `${data.currency} ${data.amount} credited.`);
          await bumpVersion();
        }}
        students={cachedStudents}
        invoices={cachedInvoices}
        preselectedStudentId={selectedStudentId}
      />

      <ApplicationFormModal
        isOpen={createAppOpen}
        onClose={() => setCreateAppOpen(false)}
        onSubmit={async (data) => {
          await createApplication(data, userProfile?.uid || 'admin', userProfile?.displayName || 'Admin');
          success('Application Dossier Created', `Application created for ${data.studentName}.`);
          await bumpVersion();
        }}
        students={cachedStudents}
        preselectedStudentId={selectedStudentId}
      />

      <DocumentUploadModal
        isOpen={uploadDocOpen}
        onClose={() => setUploadDocOpen(false)}
        onSuccess={bumpVersion}
        students={cachedStudents}
      />

      <DocumentPreviewModal
        isOpen={previewDocOpen}
        onClose={() => setPreviewDocOpen(false)}
        document={previewDoc}
        onStatusChanged={bumpVersion}
      />
    </AppLayout>
  );
};

const MainAppContent: React.FC = () => {
  const { userProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#101A32] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-14 h-14 rounded-3xl bg-gold-400 text-navy-950 font-serif font-bold text-2xl flex items-center justify-center shadow-gold-glow animate-pulse">
          S
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
          <span>Synchronizing SKOLAR Control Center...</span>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return <LoginForm />;
  }

  return <AuthenticatedWorkspace />;
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <CountryProvider>
          <YearProvider>
            <MainAppContent />
          </YearProvider>
        </CountryProvider>
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
