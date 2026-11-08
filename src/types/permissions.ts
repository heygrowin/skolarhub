export type PermissionKey =
  // Module Access
  | 'module.dashboard'
  | 'module.students'
  | 'module.applications'
  | 'module.countries'
  | 'module.partners'
  | 'module.finance'
  | 'module.documents'
  | 'module.team'
  | 'module.settings'
  // Student Actions
  | 'student.create'
  | 'student.edit'
  | 'student.delete'
  | 'student.view_all' // if false, only view assigned students
  // Application Actions
  | 'application.create'
  | 'application.edit'
  | 'application.delete'
  | 'application.change_status'
  // Country & Settings Actions
  | 'country.manage'
  | 'settings.manage'
  // Partner Actions
  | 'partner.manage'
  // Finance Actions
  | 'finance.view'
  | 'finance.create_invoice'
  | 'finance.record_payment'
  | 'finance.record_expense'
  | 'finance.delete'
  // Document Actions
  | 'document.upload'
  | 'document.delete'
  | 'document.review'
  // Team Actions
  | 'team.manage'
  | 'team.assign_permissions';

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'counsellor'
  | 'finance'
  | 'custom';

export interface CustomRole {
  id: string;
  name: string;
  description: string;
  permissions: PermissionKey[];
  isSystem?: boolean;
}

// Built-in Default Permission Matrices for Roles
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  super_admin: [
    'module.dashboard',
    'module.students',
    'module.applications',
    'module.countries',
    'module.partners',
    'module.finance',
    'module.documents',
    'module.team',
    'module.settings',
    'student.create',
    'student.edit',
    'student.delete',
    'student.view_all',
    'application.create',
    'application.edit',
    'application.delete',
    'application.change_status',
    'country.manage',
    'settings.manage',
    'partner.manage',
    'finance.view',
    'finance.create_invoice',
    'finance.record_payment',
    'finance.record_expense',
    'finance.delete',
    'document.upload',
    'document.delete',
    'document.review',
    'team.manage',
    'team.assign_permissions',
  ],
  admin: [
    'module.dashboard',
    'module.students',
    'module.applications',
    'module.countries',
    'module.partners',
    'module.finance',
    'module.documents',
    'module.team',
    'module.settings',
    'student.create',
    'student.edit',
    'student.delete',
    'student.view_all',
    'application.create',
    'application.edit',
    'application.delete',
    'application.change_status',
    'country.manage',
    'settings.manage',
    'partner.manage',
    'finance.view',
    'finance.create_invoice',
    'finance.record_payment',
    'finance.record_expense',
    'document.upload',
    'document.delete',
    'document.review',
    'team.manage',
  ],
  manager: [
    'module.dashboard',
    'module.students',
    'module.applications',
    'module.countries',
    'module.partners',
    'module.documents',
    'student.create',
    'student.edit',
    'student.view_all',
    'application.create',
    'application.edit',
    'application.change_status',
    'partner.manage',
    'document.upload',
    'document.review',
  ],
  counsellor: [
    'module.dashboard',
    'module.students',
    'module.applications',
    'module.documents',
    'student.create',
    'student.edit',
    'application.create',
    'application.edit',
    'application.change_status',
    'document.upload',
  ],
  finance: [
    'module.dashboard',
    'module.students',
    'module.finance',
    'module.documents',
    'finance.view',
    'finance.create_invoice',
    'finance.record_payment',
    'finance.record_expense',
    'finance.delete',
  ],
  custom: [
    'module.dashboard',
  ],
};

export const ALL_PERMISSIONS: { key: PermissionKey; label: string; group: string }[] = [
  // Modules
  { key: 'module.dashboard', label: 'Access Dashboard', group: 'Module Access' },
  { key: 'module.students', label: 'Access Students', group: 'Module Access' },
  { key: 'module.applications', label: 'Access Applications', group: 'Module Access' },
  { key: 'module.countries', label: 'Access Countries', group: 'Module Access' },
  { key: 'module.partners', label: 'Access B2B Partners', group: 'Module Access' },
  { key: 'module.finance', label: 'Access Finance', group: 'Module Access' },
  { key: 'module.documents', label: 'Access Documents', group: 'Module Access' },
  { key: 'module.team', label: 'Access Team & Access', group: 'Module Access' },
  { key: 'module.settings', label: 'Access Settings', group: 'Module Access' },

  // Students
  { key: 'student.create', label: 'Create Students', group: 'Student Management' },
  { key: 'student.edit', label: 'Edit Students', group: 'Student Management' },
  { key: 'student.delete', label: 'Delete Students', group: 'Student Management' },
  { key: 'student.view_all', label: 'View All Students (Otherwise Assigned Only)', group: 'Student Management' },

  // Applications
  { key: 'application.create', label: 'Create Applications', group: 'Application Management' },
  { key: 'application.edit', label: 'Edit Applications', group: 'Application Management' },
  { key: 'application.delete', label: 'Delete Applications', group: 'Application Management' },
  { key: 'application.change_status', label: 'Update Application Status', group: 'Application Management' },

  // Partners
  { key: 'partner.manage', label: 'Manage B2B Partners & Commission', group: 'Partners' },

  // Finance
  { key: 'finance.view', label: 'View Financial Data & Balances', group: 'Finance' },
  { key: 'finance.create_invoice', label: 'Create & Manage Invoices', group: 'Finance' },
  { key: 'finance.record_payment', label: 'Record Payments', group: 'Finance' },
  { key: 'finance.record_expense', label: 'Record Expenses', group: 'Finance' },
  { key: 'finance.delete', label: 'Delete Financial Records', group: 'Finance' },

  // Documents
  { key: 'document.upload', label: 'Upload Documents', group: 'Document Management' },
  { key: 'document.delete', label: 'Delete Documents', group: 'Document Management' },
  { key: 'document.review', label: 'Review & Approve Documents', group: 'Document Management' },

  // Country & Settings
  { key: 'country.manage', label: 'Manage Countries & Configuration', group: 'Configuration' },
  { key: 'settings.manage', label: 'Manage System Settings & Custom Fields', group: 'Configuration' },

  // Team
  { key: 'team.manage', label: 'Manage Team Accounts', group: 'Team & Security' },
  { key: 'team.assign_permissions', label: 'Assign & Override Permissions', group: 'Team & Security' },
];

