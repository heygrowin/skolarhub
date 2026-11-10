import { PermissionKey, UserRole } from './permissions';

export * from './permissions';

export type Currency = 'EUR' | 'INR' | 'USD';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  customRoleId?: string;
  assignedCountries: string[]; // e.g. ['IT', 'MN'] or ['*'] for all
  permissions: PermissionKey[]; // direct permissions or overrides
  isActive: boolean;
  photoURL?: string;
  phone?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Country {
  id: string;
  name: string;
  code: string; // 'IT', 'MN', 'DE', etc.
  flag: string; // Flag emoji or URL
  description: string;
  websiteUrl: string;
  status: 'active' | 'inactive';
  defaultCurrency: Currency;
  settings: {
    requiredDocuments: string[];
    universities: string[];
    applicationStages?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export type AcquisitionType = 'B2C' | 'B2B';

export interface Student {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  nationality: string;
  address: string;
  passportNumber: string;
  passportExpiry?: string;

  // Academic Info
  previousEducation: string;
  schoolOrUniversity: string;
  academicMarks: string;
  intakeYear?: string; // e.g. '2024', '2025', '2026', '2027'
  neetScore?: string;
  neetQualified?: boolean;
  otherQualifications?: string;

  // Business Info
  acquisitionType: AcquisitionType;
  countryOfInterest: string; // country code like 'IT', 'MN'
  assignedCounsellorId?: string;
  assignedCounsellorName?: string;
  leadSource: string;
  partnerId?: string;
  partnerName?: string;
  registrationDate: string;

  // Internal Notes & Custom Fields
  notes?: string;
  customFields: Record<string, any>;
  isDemo?: boolean;

  createdAt: string;
  updatedAt: string;
}

export type ApplicationStatus =
  | 'New Enquiry'
  | 'Profile Review'
  | 'Documents Pending'
  | 'Application Preparation'
  | 'Application Submitted'
  | 'Awaiting University Response'
  | 'Admission Received'
  | 'Visa Process'
  | 'Completed'
  | 'Rejected'
  | 'Withdrawn';

export interface ApplicationTimelineItem {
  id: string;
  status: ApplicationStatus | string;
  changedAt: string;
  changedBy: string;
  changedByName?: string;
  note?: string;
}

export interface Application {
  id: string;
  studentId: string;
  studentName: string;
  countryId: string;
  countryCode: string;
  countryName: string;
  university: string;
  course: string;
  intakeYear?: string;
  intake?: string; // e.g. "Fall 2026", "Spring 2027"
  status: ApplicationStatus;
  assignedUserId?: string;
  assignedUserName?: string;
  statusHistory: ApplicationTimelineItem[];
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PartnerType =
  | 'Content Creator'
  | 'Education Agent'
  | 'Referral Partner'
  | 'Business Partner'
  | 'Other'
  | string;

export interface Partner {
  id: string;
  name: string;
  partnerType: PartnerType;
  contactPerson: string;
  email: string;
  phone: string;
  company?: string;
  country: string;
  commissionType: 'percentage' | 'fixed';
  commissionRate: number; // percentage (e.g. 15 for 15%) or fixed amount (e.g. 500)
  currency: Currency;
  status: 'active' | 'inactive';
  notes?: string;
  agreementDetails?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  studentName: string;
  applicationId?: string;
  countryCode?: string;
  intakeYear?: string;
  subtotal?: number;
  discount?: number;
  discountType?: 'flat' | 'percentage';
  discountValue?: number;
  discountReason?: string;
  taxRate?: number;
  taxAmount?: number;
  amount: number;
  paidAmount: number;
  currency: Currency;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  notes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod = 'Bank Transfer' | 'Credit Card' | 'Cash' | 'UPI' | string;

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  intakeYear?: string;
  amount: number;
  currency: Currency;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  transactionReference: string;
  notes?: string;
  receiptUrl?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory =
  | 'University Application Fee'
  | 'Document Translation'
  | 'Legalization/Apostille'
  | 'Visa Processing'
  | 'Courier'
  | 'Marketing'
  | 'Partner Commission'
  | 'Office/Admin'
  | 'Other'
  | string;

export interface Expense {
  id: string;
  title: string;
  amount: number;
  currency: Currency;
  date: string;
  intakeYear?: string;
  studentId?: string;
  studentName?: string;
  applicationId?: string;
  partnerId?: string;
  partnerName?: string;
  countryCode?: string;
  category: ExpenseCategory;
  description?: string;
  receiptUrl?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DocumentCategory =
  | 'Passport'
  | 'Academic Transcripts'
  | 'Language Certificate'
  | 'Visa'
  | 'CV/Resume'
  | 'Financial Document'
  | 'University Offer Letter'
  | 'Other'
  | string;

export type DocumentReviewStatus = 'Pending' | 'Approved' | 'Rejected';

export interface DocumentRecord {
  id: string;
  name: string;
  studentId: string;
  studentName?: string;
  applicationId?: string;
  countryCode: string;
  intakeYear?: string;
  category: DocumentCategory;
  uploadedBy: string;
  uploadedByName?: string;
  uploadDate: string;
  storagePath: string;
  fileUrl: string;
  fileSize: number; // in bytes
  fileType: string; // mime type
  reviewStatus: DocumentReviewStatus;
  rejectionReason?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'dropdown'
  | 'multiselect'
  | 'boolean'
  | 'file'
  | 'image'
  | 'checkbox';

export interface CustomFieldDefinition {
  id: string;
  fieldName: string;
  key: string;
  description?: string;
  fieldType: CustomFieldType;
  required: boolean;
  options?: string[]; // For dropdown/multiselect
  countryCode: string; // '*' for all countries, or specific code like 'IT', 'MN'
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  entityType: 'student' | 'application' | 'partner' | 'country' | 'finance' | 'document' | 'team' | 'permission' | 'setting';
  entityId: string;
  details: string;
  timestamp: string;
}

export interface StudentFinancialSummary {
  invoiced: { [c in Currency]?: number };
  paid: { [c in Currency]?: number };
  balance: { [c in Currency]?: number };
  expenses: { [c in Currency]?: number };
}

export interface BusinessFinancialSummary {
  totalInvoiced: { [c in Currency]?: number };
  totalCollected: { [c in Currency]?: number };
  totalOutstanding: { [c in Currency]?: number };
  totalExpenses: { [c in Currency]?: number };
  netProfit: { [c in Currency]?: number };
}

export interface PartnerMetrics {
  totalReferredStudents: number;
  activeApplications: number;
  convertedStudents: number;
  associatedRevenue: { [currency: string]: number };
  commissionOwed: { [currency: string]: number };
  commissionPaid: { [currency: string]: number };
}

