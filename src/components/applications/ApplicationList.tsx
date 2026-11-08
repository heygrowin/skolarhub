import React, { useState, useEffect, useCallback } from 'react';
import { Application, ApplicationStatus, Student } from '../../types';
import { getApplications, updateApplicationStatus, createApplication, deleteApplication } from '../../services/applicationService';
import { getStudents } from '../../services/studentService';
import { useCountry } from '../../context/CountryContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { ApplicationFormModal } from './ApplicationFormModal';
import {
  GraduationCap,
  Search,
  Plus,
  Trash2,
  Calendar,
  Clock,
  RefreshCw,
  ArrowRight,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export const ApplicationList: React.FC = () => {
  const { countries, selectedCountryFilter, setSelectedCountryFilter } = useCountry();
  const { userProfile, hasPermission } = useAuth();
  const { success, error } = useToast();

  const [applications, setApplications] = useState<Application[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const canCreate = hasPermission('application.create');
  const canEdit = hasPermission('application.edit') || hasPermission('application.change_status');
  const canDelete = hasPermission('application.delete');

  const applicationStatuses: ApplicationStatus[] = [
    'New Enquiry',
    'Profile Review',
    'Documents Pending',
    'Application Preparation',
    'Application Submitted',
    'Awaiting University Response',
    'Admission Received',
    'Visa Process',
    'Completed',
    'Rejected',
    'Withdrawn',
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [apps, studentRes] = await Promise.all([
        getApplications({
          countryCode: selectedCountryFilter !== 'ALL' ? selectedCountryFilter : undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
        }),
        getStudents(),
      ]);

      setApplications(apps);
      setStudents(studentRes.students);
    } catch (err: any) {
      error('Failed to load applications', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCountryFilter, statusFilter, error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateApplication = async (appData: any) => {
    try {
      await createApplication(
        appData,
        userProfile?.uid || 'user',
        userProfile?.displayName || 'Counsellor'
      );
      success('Application Created', `Dossier submitted for ${appData.studentName}.`);
      loadData();
    } catch (err: any) {
      error('Creation Failed', err.message);
      throw err;
    }
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    setUpdatingId(appId);
    try {
      await updateApplicationStatus(
        appId,
        newStatus as ApplicationStatus,
        { uid: userProfile?.uid || 'user', displayName: userProfile?.displayName || 'Counsellor' },
        `Status updated to ${newStatus}`
      );
      success('Status Updated', `Dossier transitioned to ${newStatus}`);
      loadData();
    } catch (err: any) {
      error('Status Update Failed', err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (app: Application) => {
    if (!window.confirm(`Are you sure you want to delete application for ${app.studentName} at ${app.university}?`)) return;
    try {
      await deleteApplication(app.id);
      success('Application Deleted', 'Dossier removed.');
      loadData();
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  // Client search filter
  const filteredApps = applications.filter(a => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.studentName.toLowerCase().includes(term) ||
      a.university.toLowerCase().includes(term) ||
      a.course.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-950 tracking-tight">Admissions Pipeline</h2>
          <p className="text-xs text-slate-500">
            {filteredApps.length} global applications in preparation, review or process
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadData}
            loading={loading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          {canCreate && (
            <Button
              variant="gold"
              size="sm"
              onClick={() => setModalOpen(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              New Application
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate, university or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-600 bg-slate-50/50"
            />
          </div>

          <div>
            <select
              value={selectedCountryFilter}
              onChange={(e) => setSelectedCountryFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-600 bg-white font-medium text-navy-950"
            >
              <option value="ALL">🌐 All Countries</option>
              {countries.map(c => (
                <option key={c.id} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-600 bg-white font-medium text-navy-950"
            >
              <option value="ALL">All Application Stages</option>
              {applicationStatuses.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Applications Cards / List */}
      {filteredApps.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-8 h-8" />}
          title="No Applications Found"
          description="No application records match your current criteria. Create an application for an enrolled student."
          actionText={canCreate ? "Create Application" : undefined}
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-soft hover:shadow-card transition-all"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: Info */}
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-navy-50 border border-navy-100/60 flex items-center justify-center text-xl shrink-0">
                    {app.countryCode === 'IT' ? '🇮🇹' : app.countryCode === 'MN' ? '🇲🇳' : '🌐'}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-navy-950">{app.university}</h4>
                      <Badge variant="navy" size="sm">{app.countryName}</Badge>
                      {app.isDemo && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          DEMO
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold text-gold-600 mt-0.5">{app.course}</p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span>Candidate: <strong className="text-navy-900">{app.studentName}</strong></span>
                      {app.intake && <span>• Intake: {app.intake}</span>}
                      <span>• Created: {new Date(app.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Status Changer & Actions */}
                <div className="flex flex-wrap items-center gap-3 self-end lg:self-center">
                  {canEdit ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-semibold hidden sm:inline">Stage:</span>
                      <select
                        value={app.status}
                        disabled={updatingId === app.id}
                        onChange={(e) => handleStatusChange(app.id, e.target.value)}
                        className={`text-xs font-bold rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold-400 cursor-pointer shadow-sm ${app.status === 'Admission Received' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                            app.status === 'Visa Process' ? 'bg-sky-50 text-sky-800 border-sky-300' :
                              app.status === 'Completed' ? 'bg-purple-50 text-purple-800 border-purple-300' :
                                app.status === 'Rejected' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                                  'bg-slate-50 text-navy-950 border-slate-200'
                          }`}
                      >
                        {applicationStatuses.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <Badge variant="navy">{app.status}</Badge>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => handleDelete(app)}
                      title="Delete Application"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Status History Timeline Snippet */}
              {app.statusHistory && app.statusHistory.length > 1 && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500 overflow-x-auto">
                  <span className="font-semibold text-slate-400 shrink-0">Stage Flow:</span>
                  {app.statusHistory.slice(-3).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 shrink-0">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium text-slate-700">
                        {item.status}
                      </span>
                      {idx < Math.min(app.statusHistory.length - 1, 2) && (
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Application Form Modal */}
      <ApplicationFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreateApplication}
        students={students}
      />
    </div>
  );
};

