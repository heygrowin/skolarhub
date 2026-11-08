import React, { useState } from 'react';
import { Application, Student, ApplicationStatus } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { GraduationCap, Plus, Calendar, Building, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateApplicationStatus } from '../../services/applicationService';
import { useToast } from '../../context/ToastContext';

interface StudentApplicationsTabProps {
  student: Student;
  applications: Application[];
  onOpenCreateApplication: () => void;
  onRefresh: () => void;
}

export const StudentApplicationsTab: React.FC<StudentApplicationsTabProps> = ({
  student,
  applications,
  onOpenCreateApplication,
  onRefresh,
}) => {
  const { userProfile, hasPermission } = useAuth();
  const { success, error } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const canEditApps = hasPermission('application.edit') || hasPermission('application.change_status');

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

  const handleStatusChange = async (appId: string, newStatus: string) => {
    setUpdatingId(appId);
    try {
      await updateApplicationStatus(
        appId,
        newStatus as ApplicationStatus,
        { uid: userProfile?.uid || 'staff', displayName: userProfile?.displayName || 'Counsellor' },
        `Status updated to ${newStatus}`
      );
      success('Status Updated', `Application moved to ${newStatus}`);
      onRefresh();
    } catch (err: any) {
      error('Failed to update status', err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-navy-950">University Applications</h4>
          <p className="text-xs text-slate-400">Applications submitted for {student.fullName}</p>
        </div>
        {hasPermission('application.create') && (
          <Button
            variant="gold"
            size="sm"
            onClick={onOpenCreateApplication}
            icon={<Plus className="w-4 h-4" />}
          >
            Add Application
          </Button>
        )}
      </div>

      {applications.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="w-6 h-6" />}
          title="No Applications Recorded"
          description="Create the first university application dossier for this student."
          actionText="Create Application"
          onAction={onOpenCreateApplication}
        />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div
              key={app.id}
              className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-soft hover:shadow-card transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-navy-50 flex items-center justify-center text-navy-800 shrink-0 font-bold">
                    {app.countryCode === 'IT' ? '🇮🇹' : app.countryCode === 'MN' ? '🇲🇳' : '🌐'}
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-navy-950">{app.university}</h5>
                    <p className="text-xs text-slate-500 font-medium">{app.course}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canEditApps ? (
                    <select
                      value={app.status}
                      disabled={updatingId === app.id}
                      onChange={(e) => handleStatusChange(app.id, e.target.value)}
                      className="text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-navy-950 focus:outline-none focus:ring-2 focus:ring-gold-400 cursor-pointer"
                    >
                      {applicationStatuses.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Badge variant="navy">{app.status}</Badge>
                  )}
                </div>
              </div>

              {/* Status Timeline History Summary */}
              {app.statusHistory && app.statusHistory.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Last updated: {new Date(app.updatedAt).toLocaleDateString()}
                  </span>
                  {app.intake && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Intake: {app.intake}
                    </span>
                  )}
                  {app.statusHistory[app.statusHistory.length - 1]?.note && (
                    <span className="italic text-slate-500 truncate max-w-xs">
                      "{app.statusHistory[app.statusHistory.length - 1].note}"
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

