import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { TabNav, TabItem } from '../common/TabNav';
import { StudentApplicationsTab } from './StudentApplicationsTab';
import { StudentDocumentsTab } from './StudentDocumentsTab';
import { StudentFinanceTab } from './StudentFinanceTab';
import { 
  Student, 
  Application, 
  DocumentRecord, 
  Invoice, 
  Payment, 
  Expense, 
  StudentFinancialSummary 
} from '../../types';
import { getApplications } from '../../services/applicationService';
import { getDocuments } from '../../services/documentService';
import { getInvoices, getPayments, getExpenses, getStudentFinancialSummary } from '../../services/financeService';
import { User, GraduationCap, FolderLock, Coins, Edit3, Mail, Phone, MapPin, Globe } from 'lucide-react';

interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  onEditStudent: (student: Student) => void;
  onOpenCreateApplication: (studentId: string) => void;
  onOpenCreateInvoice: (studentId: string) => void;
  onOpenRecordPayment: (studentId: string) => void;
  onOpenRecordExpense: (studentId: string) => void;
  onPreviewDocument: (doc: DocumentRecord) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  isOpen,
  onClose,
  student,
  onEditStudent,
  onOpenCreateApplication,
  onOpenCreateInvoice,
  onOpenRecordPayment,
  onOpenRecordExpense,
  onPreviewDocument,
}) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [applications, setApplications] = useState<Application[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<StudentFinancialSummary>({
    invoiced: {},
    paid: {},
    balance: {},
    expenses: {},
  });

  const loadStudentRelatedData = useCallback(async () => {
    if (!student) return;
    try {
      const [apps, docs, invs, pays, exps, summ] = await Promise.all([
        getApplications({ studentId: student.id }),
        getDocuments({ studentId: student.id }),
        getInvoices(student.id),
        getPayments(student.id),
        getExpenses(student.id),
        getStudentFinancialSummary(student.id),
      ]);
      setApplications(apps);
      setDocuments(docs);
      setInvoices(invs);
      setPayments(pays);
      setExpenses(exps);
      setSummary(summ);
    } catch (err) {
      console.error('Error loading student details:', err);
    }
  }, [student]);

  useEffect(() => {
    if (isOpen && student) {
      loadStudentRelatedData();
    }
  }, [isOpen, student, loadStudentRelatedData]);

  if (!student) return null;

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Profile Dossier', icon: <User className="w-4 h-4" /> },
    { id: 'applications', label: 'Applications', icon: <GraduationCap className="w-4 h-4" />, count: applications.length },
    { id: 'documents', label: 'Documents', icon: <FolderLock className="w-4 h-4" />, count: documents.length },
    { id: 'finance', label: 'Finance & Ledger', icon: <Coins className="w-4 h-4" /> },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={student.fullName}
      subtitle={`Student ID: ${student.id} • Registered on ${new Date(student.registrationDate).toLocaleDateString()}`}
      size="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditStudent(student)}
            icon={<Edit3 className="w-4 h-4" />}
          >
            Edit Student Profile
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-deep-navy to-midnight text-white shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gold-400 text-navy-950 font-extrabold text-base flex items-center justify-center shrink-0 shadow-md">
              {student.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{student.fullName}</h3>
                <Badge variant={student.acquisitionType === 'B2B' ? 'gold' : 'blue'} size="sm">
                  {student.acquisitionType} {student.partnerName ? `• ${student.partnerName}` : 'Direct'}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-gold-400" />
                  {student.email}
                </span>
                {student.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gold-400" />
                    {student.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <span className="text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 font-semibold">
              Destination: {student.countryOfInterest === 'IT' ? '🇮🇹 Italy' : student.countryOfInterest === 'MN' ? '🇲🇳 Mongolia' : student.countryOfInterest}
            </span>
            <span className="text-xs bg-gold-400/20 text-gold-300 px-3 py-1.5 rounded-xl border border-gold-400/30 font-bold">
              Intake: {student.intakeYear || '2025'}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <TabNav tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* 1. Identity & Academic */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <h5 className="font-bold text-navy-950 uppercase tracking-wider mb-2">Personal Identity</h5>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date of Birth:</span>
                  <span className="font-semibold text-navy-900">{student.dateOfBirth || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nationality:</span>
                  <span className="font-semibold text-navy-900">{student.nationality || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Passport Number:</span>
                  <span className="font-semibold text-navy-900">{student.passportNumber || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Passport Expiry:</span>
                  <span className="font-semibold text-navy-900">{student.passportExpiry || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Residential Address:</span>
                  <span className="font-semibold text-navy-900 truncate max-w-[200px]">{student.address || 'Not provided'}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                <h5 className="font-bold text-navy-950 uppercase tracking-wider mb-2">Academic Qualifications</h5>
                <div className="flex justify-between">
                  <span className="text-slate-400">Intake Academic Year:</span>
                  <span className="font-bold text-gold-700 bg-gold-50 px-2 py-0.5 rounded-md border border-gold-200/50">
                    {student.intakeYear || '2025'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Previous Education:</span>
                  <span className="font-semibold text-navy-900">{student.previousEducation || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">School / University:</span>
                  <span className="font-semibold text-navy-900">{student.schoolOrUniversity || 'Not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Academic Marks / GPA:</span>
                  <span className="font-semibold text-navy-900">{student.academicMarks || 'Not provided'}</span>
                </div>
                {student.neetScore && (
                  <div className="flex justify-between text-amber-700">
                    <span className="font-medium">NEET Score:</span>
                    <span className="font-bold">{student.neetScore} {student.neetQualified ? '(Qualified)' : ''}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Country Custom Fields */}
            {student.customFields && Object.keys(student.customFields).length > 0 && (
              <div className="p-4 rounded-2xl bg-gold-50/40 border border-gold-200/60">
                <h5 className="font-bold text-navy-950 text-xs uppercase tracking-wider mb-3">
                  Country-Specific Configurations ({student.countryOfInterest})
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  {Object.entries(student.customFields).map(([k, v]) => (
                    <div key={k} className="p-2.5 rounded-xl bg-white border border-slate-200/60">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{k}</span>
                      <span className="font-semibold text-navy-950 mt-0.5 block truncate">
                        {typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Internal Counsellor Notes */}
            {student.notes && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <h5 className="font-bold text-navy-950 text-xs uppercase tracking-wider mb-2">Counsellor Notes</h5>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{student.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'applications' && (
          <StudentApplicationsTab
            student={student}
            applications={applications}
            onOpenCreateApplication={() => onOpenCreateApplication(student.id)}
            onRefresh={loadStudentRelatedData}
          />
        )}

        {activeTab === 'documents' && (
          <StudentDocumentsTab
            student={student}
            documents={documents}
            onRefresh={loadStudentRelatedData}
            onPreviewDocument={onPreviewDocument}
          />
        )}

        {activeTab === 'finance' && (
          <StudentFinanceTab
            student={student}
            invoices={invoices}
            payments={payments}
            expenses={expenses}
            summary={summary}
            onOpenCreateInvoice={() => onOpenCreateInvoice(student.id)}
            onOpenRecordPayment={() => onOpenRecordPayment(student.id)}
            onOpenRecordExpense={() => onOpenRecordExpense(student.id)}
            onRefresh={loadStudentRelatedData}
          />
        )}
      </div>
    </Modal>
  );
};

