import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../../types';
import { getTeamMembers, createOrUpdateUserProfile, toggleUserActive } from '../../services/teamService';
import { getRecentActivity } from '../../services/auditService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { TeamMemberModal } from './TeamMemberModal';
import { 
  ShieldCheck, 
  UserPlus, 
  Edit3, 
  Lock, 
  Unlock, 
  History, 
  RefreshCw, 
  Mail, 
  Phone, 
  Globe 
} from 'lucide-react';

export const TeamList: React.FC = () => {
  const { userProfile, hasPermission } = useAuth();
  const { success, error } = useToast();

  const [members, setMembers] = useState<UserProfile[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<UserProfile | null>(null);

  const canManageTeam = hasPermission('team.manage');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [memberList, logs] = await Promise.all([
        getTeamMembers(),
        getRecentActivity(15),
      ]);
      setMembers(memberList);
      setActivityLogs(logs);
    } catch (err: any) {
      error('Failed to load team data', err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveMember = async (userData: any) => {
    try {
      await createOrUpdateUserProfile(userData, {
        uid: userProfile?.uid || 'admin',
        displayName: userProfile?.displayName || 'Admin',
        email: userProfile?.email || 'admin@skolar.it',
      });
      success('Team Member Saved', `${userData.displayName}'s permissions were updated.`);
      loadData();
    } catch (err: any) {
      error('Operation Failed', err.message);
      throw err;
    }
  };

  const handleToggleActive = async (member: UserProfile) => {
    try {
      const newStatus = !member.isActive;
      await toggleUserActive(member.uid, newStatus, {
        uid: userProfile?.uid || 'admin',
        displayName: userProfile?.displayName || 'Admin',
        email: userProfile?.email || 'admin@skolar.it',
      });
      success('Status Changed', `${member.displayName} is now ${newStatus ? 'Active' : 'Deactivated'}.`);
      loadData();
    } catch (err: any) {
      error('Failed to change status', err.message);
    }
  };

  const roleColors: Record<string, 'gold' | 'purple' | 'blue' | 'green' | 'navy'> = {
    super_admin: 'gold',
    admin: 'purple',
    manager: 'blue',
    counsellor: 'green',
    finance: 'gold',
    custom: 'navy',
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-950 tracking-tight">Team Members & Access Governance</h2>
          <p className="text-xs text-slate-500">
            {members.length} provisioned staff accounts with granular role & destination permissions
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

          {canManageTeam && (
            <Button
              variant="gold"
              size="sm"
              onClick={() => {
                setEditingMember(null);
                setModalOpen(true);
              }}
              icon={<UserPlus className="w-4 h-4" />}
            >
              Provision Account
            </Button>
          )}
        </div>
      </div>

      {/* Team Members Grid */}
      {members.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="w-8 h-8" />}
          title="No Team Accounts Found"
          description="Provision internal counsellor and administrator accounts."
          actionText={canManageTeam ? "Provision First Account" : undefined}
          onAction={() => {
            setEditingMember(null);
            setModalOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {members.map((member) => (
            <div
              key={member.uid}
              className={`p-5 rounded-3xl bg-white border shadow-soft flex flex-col justify-between transition-all ${
                member.isActive ? 'border-slate-200/90 hover:shadow-card' : 'border-slate-200/50 opacity-60 bg-slate-50/50'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-navy-100 text-navy-900 font-extrabold flex items-center justify-center shrink-0">
                      {member.displayName?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-navy-950">{member.displayName}</h4>
                        {!member.isActive && (
                          <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.2 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <Badge variant={roleColors[member.role] || 'navy'} size="sm">
                        {member.role.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {canManageTeam && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingMember(member);
                          setModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-gold-600 hover:bg-gold-50 transition-colors"
                        title="Edit Permissions"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(member)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          member.isActive
                            ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={member.isActive ? "Deactivate Account" : "Activate Account"}
                      >
                        {member.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                  {member.title && <p className="font-semibold text-slate-700">{member.title}</p>}
                  <p className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{member.email}</span>
                  </p>
                  {member.phone && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{member.phone}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Destination Restrictions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  Destinations:
                </span>
                <span className="font-bold text-navy-950">
                  {member.assignedCountries?.includes('*')
                    ? '🌐 Global (All)'
                    : member.assignedCountries?.join(', ') || 'None'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Security Audit Trail Log */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2">
            <History className="w-4 h-4 text-gold-500" />
            Security & Permission Audit Trail
          </h3>
          <span className="text-xs text-slate-400">Immutable ledger records</span>
        </div>

        {activityLogs.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">No security audit logs recorded yet.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {activityLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                <div className="min-w-0">
                  <span className="font-bold text-navy-950 mr-2">{log.action}</span>
                  <span className="text-slate-500 truncate">{log.details}</span>
                  <span className="text-slate-400 text-[11px] block mt-0.5">by {log.userName || log.userEmail}</span>
                </div>
                <span className="text-slate-400 text-[11px] shrink-0">
                  {new Date(log.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Member Modal */}
      <TeamMemberModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSaveMember}
        initialData={editingMember}
      />
    </div>
  );
};

