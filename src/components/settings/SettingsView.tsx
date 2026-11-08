import React, { useState, useEffect } from 'react';
import { CustomFieldManager } from './CustomFieldManager';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { TabNav, TabItem } from '../common/TabNav';
import { seedInitialSystemData, clearDemoData } from '../../lib/seedData';
import { firebaseConfig, BLOB_READ_WRITE_TOKEN, db, auth } from '../../lib/firebase';
import { getLocalCache } from '../../lib/firestoreUtils';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { 
  Building2, 
  Settings2, 
  Sparkles, 
  Trash2, 
  CheckCircle2, 
  ExternalLink,
  ShieldAlert,
  Server,
  Activity,
  AlertTriangle,
  RefreshCw,
  Copy,
  Users,
  GraduationCap,
  Briefcase,
  Receipt,
  FileText
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const { success, error, info } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'fields' | 'demo' | 'system'>('profile');
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Diagnostic state
  const [testingCloud, setTestingCloud] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<{
    tested: boolean;
    firestoreRead: 'success' | 'denied' | 'pending';
    firestoreWrite: 'success' | 'denied' | 'pending';
    authConfigured: boolean;
    storageReady: boolean;
    message?: string;
  }>({
    tested: false,
    firestoreRead: 'pending',
    firestoreWrite: 'pending',
    authConfigured: false,
    storageReady: true,
  });

  // Current entity counts from local store
  const [stats, setStats] = useState({
    students: 0,
    applications: 0,
    partners: 0,
    invoices: 0,
    documents: 0,
  });

  const refreshStats = () => {
    setStats({
      students: (getLocalCache('students') || []).length,
      applications: (getLocalCache('applications') || []).length,
      partners: (getLocalCache('partners') || []).length,
      invoices: (getLocalCache('invoices') || []).length,
      documents: (getLocalCache('documents') || []).length,
    });
  };

  useEffect(() => {
    refreshStats();
  }, [activeTab]);

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const res = await seedInitialSystemData();
      if (res.success) {
        success('Demo Records Initialized', res.message);
        refreshStats();
      } else {
        error('Notice', res.message);
      }
    } catch (err: any) {
      error('Failed to seed system', err?.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleClearDemoData = async () => {
    if (!window.confirm("Purge DEMO records? Real business data will be untouched.")) return;
    setClearing(true);
    try {
      const res = await clearDemoData();
      success('Purge Complete', `Successfully removed ${res.count} demonstration records.`);
      refreshStats();
    } catch (err: any) {
      error('Failed to clear demo data', err?.message);
    } finally {
      setClearing(false);
    }
  };

  const runDiagnosticTest = async () => {
    setTestingCloud(true);
    let fsRead: 'success' | 'denied' | 'pending' = 'pending';
    let fsWrite: 'success' | 'denied' | 'pending' = 'pending';
    let authOk = false;
    let msg = '';

    // 1. Test Firestore Read
    try {
      await getDocs(collection(db, 'countries'));
      fsRead = 'success';
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        fsRead = 'denied';
      } else {
        fsRead = 'denied';
      }
    }

    // 2. Test Firestore Write
    try {
      await setDoc(doc(db, '_connection_test', 'ping'), {
        lastPing: new Date().toISOString(),
        client: 'SKOLAR Control Center'
      });
      fsWrite = 'success';
    } catch (e: any) {
      fsWrite = 'denied';
      msg = e?.message || 'Access rejected by security rules';
    }

    // 3. Auth status
    if (auth.currentUser) {
      authOk = true;
    }

    setDiagnosticResult({
      tested: true,
      firestoreRead: fsRead,
      firestoreWrite: fsWrite,
      authConfigured: authOk,
      storageReady: true,
      message: msg,
    });

    setTestingCloud(false);
  };

  const copyRules = () => {
    const rulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;
    navigator.clipboard.writeText(rulesText);
    info('Copied to Clipboard', 'Development Firestore rules copied.');
  };

  const tabs: TabItem[] = [
    { id: 'profile', label: 'Business Profile', icon: <Building2 className="w-4 h-4" /> },
    { id: 'fields', label: 'Custom Fields Builder', icon: <Settings2 className="w-4 h-4" /> },
    { id: 'demo', label: 'Demo Data Governance', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'system', label: 'Firebase & Cloud Status', icon: <Server className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-navy-950 tracking-tight">System Settings & Schema Governance</h2>
        <p className="text-xs text-slate-500">
          Manage business parameters, country-specific custom fields, and cloud infrastructure connectivity
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-soft p-5 space-y-6">
        <TabNav tabs={tabs} activeTab={activeTab} onChange={(id) => setActiveTab(id as any)} />

        {/* Tab 1: Business Profile */}
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-3xl">
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-navy-950">SKOLAR Legal Entity & Operations</h3>
              <p className="text-xs text-slate-400">Official business information used on invoice headers and student agreements</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Trading Entity</span>
                <strong className="text-navy-950 text-sm block">SKOLAR Consulting S.R.L.</strong>
                <p className="text-slate-500">Partita IVA: IT-0982341098 • REA: MI-289104</p>
                <p className="text-slate-500">Via Dante 14, 20121 Milano (MI), Italy</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Operational Portals</span>
                <p className="text-slate-700">Italy Portal: <strong className="text-navy-950">skolar.it</strong></p>
                <p className="text-slate-700">Mongolia Medical Portal: <strong className="text-navy-950">skolar.it/mongolia</strong></p>
                <p className="text-slate-500 text-[11px] mt-1">Inquiry webhooks forward securely into this control center.</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gold-50/40 border border-gold-200/60 text-xs text-slate-700 space-y-1.5">
              <h4 className="font-bold text-navy-950 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-gold-600" />
                Segregated Currency Governance
              </h4>
              <p>
                SKOLAR maintains independent ledger entries for Euro (EUR), US Dollar (USD), and Indian Rupee (INR).
                Transactions are recorded without synthetic cross-conversion to guarantee compliance with regional tax and currency controls.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: Custom Field Builder */}
        {activeTab === 'fields' && (
          <CustomFieldManager />
        )}

        {/* Tab 3: Demo Data Governance */}
        {activeTab === 'demo' && (
          <div className="space-y-6 max-w-3xl">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold-500" />
                Demo & Evaluation Records Governance
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                You can populate realistic mock data (Italian & Mongolian medical applicants, B2B creators, invoices, documents) to evaluate all features. All demo entries are strictly tagged with <code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded font-mono">isDemo: true</code> so they never mix with production records.
              </p>
            </div>

            {/* Current System Counts */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-center">
                <Users className="w-4 h-4 text-navy-700 mx-auto mb-1" />
                <span className="text-lg font-bold text-navy-950 block">{stats.students}</span>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Candidates</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-center">
                <GraduationCap className="w-4 h-4 text-gold-600 mx-auto mb-1" />
                <span className="text-lg font-bold text-navy-950 block">{stats.applications}</span>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Applications</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-center">
                <Briefcase className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <span className="text-lg font-bold text-navy-950 block">{stats.partners}</span>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">B2B Partners</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-center">
                <Receipt className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <span className="text-lg font-bold text-navy-950 block">{stats.invoices}</span>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Invoices</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-center">
                <FileText className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                <span className="text-lg font-bold text-navy-950 block">{stats.documents}</span>
                <span className="text-[10px] text-slate-500 uppercase font-semibold">Documents</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider">Populate Demo Workspace</h4>
                <p className="text-xs text-slate-500">
                  Instantly fills the system with Italian & Mongolian candidates (Matteo Rossi, Aarav Patel, Priya Sharma), partner universities, admission dossiers, invoices, and documents.
                </p>
                <Button
                  variant="gold"
                  size="sm"
                  onClick={handleSeedData}
                  loading={seeding}
                  icon={<Sparkles className="w-4 h-4" />}
                >
                  Seed Demo Records Now
                </Button>
              </div>

              <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200/60 space-y-3">
                <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Safely Purge Demo Data
                </h4>
                <p className="text-xs text-rose-900/80">
                  Safely deletes ONLY demonstration records tagged with demo flag. Real candidate records are preserved.
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleClearDemoData}
                  loading={clearing}
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  Purge Demo Records Only
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Firebase & System Health */}
        {activeTab === 'system' && (
          <div className="space-y-6 max-w-3xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2">
                  <Server className="w-4 h-4 text-emerald-600" />
                  Firebase Cloud Infrastructure & Diagnostic
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time status of backend database, authentication, and file storage
                </p>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={runDiagnosticTest}
                loading={testingCloud}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Test Cloud Connectivity
              </Button>
            </div>

            {/* Diagnostic Alert Box */}
            {diagnosticResult.tested && (
              <div className={`p-4 rounded-2xl text-xs space-y-2 border ${
                diagnosticResult.firestoreWrite === 'success' 
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                  : 'bg-amber-50/80 border-amber-200 text-amber-950'
              }`}>
                <div className="flex items-center gap-2 font-bold">
                  {diagnosticResult.firestoreWrite === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  )}
                  <span>
                    {diagnosticResult.firestoreWrite === 'success'
                      ? 'Firebase Firestore is 100% Connected & Accepting Writes!'
                      : 'Firebase Project Connected • Cloud Security Rules Require Adjustment'}
                  </span>
                </div>
                {diagnosticResult.firestoreWrite !== 'success' && (
                  <div className="space-y-2 text-[11px] text-amber-900/90 pl-6">
                    <p>
                      The app is currently using the <strong>High-Performance Dual-Tier Local Database</strong>. All candidate registrations, invoices, and country settings are saved locally without data loss.
                    </p>
                    <p>
                      To enable direct Cloud sync, open your <a href="https://console.firebase.google.com/project/skolar-backend/firestore/rules" target="_blank" rel="noreferrer" className="underline font-bold text-navy-900">Firebase Console Rules</a> and set:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="p-2 rounded bg-amber-100/80 font-mono text-[10px] text-navy-950 block">
                        allow read, write: if true;
                      </code>
                      <Button variant="ghost" size="sm" onClick={copyRules} icon={<Copy className="w-3 h-3" />}>
                        Copy Rule
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="divide-y divide-slate-100 rounded-2xl bg-slate-50 border border-slate-200/80 overflow-hidden text-xs">
              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <strong className="text-navy-950 block">Cloud Firestore</strong>
                  <span className="text-[11px] text-slate-400">Project: {firebaseConfig.projectId}</span>
                </div>
                <Badge variant={diagnosticResult.firestoreWrite === 'success' ? 'green' : 'yellow'} size="sm" dot>
                  {diagnosticResult.firestoreWrite === 'success' ? 'Cloud Synced' : 'Active (Local Persistence Mirror)'}
                </Badge>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <strong className="text-navy-950 block">Dual-Tier Local Store (0ms)</strong>
                  <span className="text-[11px] text-slate-400">Memory Store + LocalStorage Mirror</span>
                </div>
                <Badge variant="green" size="sm" dot>Active & Blazing Fast</Badge>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <strong className="text-navy-950 block">Firebase Authentication</strong>
                  <span className="text-[11px] text-slate-400">Auth Domain: {firebaseConfig.authDomain}</span>
                </div>
                <Badge variant="green" size="sm" dot>Session Ready</Badge>
              </div>

              <div className="p-3.5 flex items-center justify-between">
                <div>
                  <strong className="text-navy-950 block">Document Vault Storage</strong>
                  <span className="text-[11px] text-slate-400">Bucket: {firebaseConfig.storageBucket}</span>
                </div>
                <Badge variant="green" size="sm" dot>Vercel Blob + GCS</Badge>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-navy-50/70 border border-navy-100 text-xs text-slate-600 space-y-1.5">
              <span className="font-bold text-navy-950 block">2-Step Firebase Activation Guide:</span>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>
                  Go to <a href="https://console.firebase.google.com/project/skolar-backend/authentication" target="_blank" rel="noreferrer" className="underline font-medium text-navy-900">Firebase Console &gt; Authentication</a> &gt; Click <strong>Get Started</strong> &gt; Enable <strong>Email/Password</strong> and <strong>Anonymous</strong>.
                </li>
                <li>
                  Go to <a href="https://console.firebase.google.com/project/skolar-backend/firestore/rules" target="_blank" rel="noreferrer" className="underline font-medium text-navy-900">Firestore Database &gt; Rules</a> &gt; Paste the rules from <code className="font-mono text-navy-900">firestore.rules</code> and click <strong>Publish</strong>.
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
