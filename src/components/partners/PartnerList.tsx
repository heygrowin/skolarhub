import React, { useState, useEffect, useCallback } from 'react';
import { Partner, Student, PartnerType } from '../../types';
import { getPartners, createPartner, updatePartner, deletePartner } from '../../services/partnerService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { PartnerFormModal } from './PartnerFormModal';
import { PartnerDetailModal } from './PartnerDetailModal';
import { 
  Handshake, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  Mail, 
  Phone, 
  Coins, 
  Building,
  RefreshCw 
} from 'lucide-react';

interface PartnerListProps {
  onSelectStudent?: (student: Student) => void;
  onOpenRecordPayout?: (partner: Partner) => void;
}

export const PartnerList: React.FC<PartnerListProps> = ({
  onSelectStudent = () => {},
  onOpenRecordPayout = () => {},
}) => {
  const { hasPermission } = useAuth();
  const { success, error } = useToast();

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modals
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [viewingPartner, setViewingPartner] = useState<Partner | null>(null);

  const canManagePartners = hasPermission('partner.manage');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getPartners();
      setPartners(list);
    } catch (err: any) {
      error('Failed to load partners', err.message);
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSavePartner = async (data: any) => {
    try {
      if (editingPartner) {
        await updatePartner(editingPartner.id, data);
        success('Partner Updated', `${data.name}'s profile has been updated.`);
      } else {
        await createPartner(data);
        success('Partner Onboarded', `${data.name} is now registered in the B2B network.`);
      }
      loadData();
    } catch (err: any) {
      error('Operation Failed', err.message);
      throw err;
    }
  };

  const handleDelete = async (p: Partner) => {
    if (!window.confirm(`Are you sure you want to remove partner ${p.name}?`)) return;
    try {
      await deletePartner(p.id);
      success('Partner Deleted', `${p.name} was removed.`);
      loadData();
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  const filteredPartners = partners.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.company && p.company.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'ALL' || p.partnerType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-950 tracking-tight">B2B Partner & Creator Network</h2>
          <p className="text-xs text-slate-500">
            {partners.length} education agents, content creators, and institutional referral partners
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

          {canManagePartners && (
            <Button
              variant="gold"
              size="sm"
              onClick={() => {
                setEditingPartner(null);
                setFormOpen(true);
              }}
              icon={<Plus className="w-4 h-4" />}
            >
              Add B2B Partner
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search partner name, creator channel, contact person, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-600 bg-slate-50/50"
            />
          </div>

          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-600 bg-white font-medium text-navy-950"
            >
              <option value="ALL">All Partner Categories</option>
              <option value="Content Creator">Content Creator</option>
              <option value="Education Agent">Education Agent</option>
              <option value="Referral Partner">Referral Partner</option>
              <option value="Business Partner">Business Partner</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Partners Cards */}
      {filteredPartners.length === 0 ? (
        <EmptyState
          icon={<Handshake className="w-8 h-8" />}
          title="No Partners Found"
          description="Onboard agents or YouTube content creators to begin tracking referrals and commissions."
          actionText={canManagePartners ? "Add First Partner" : undefined}
          onAction={() => {
            setEditingPartner(null);
            setFormOpen(true);
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPartners.map((p) => (
            <div
              key={p.id}
              onClick={() => {
                setViewingPartner(p);
                setDetailOpen(true);
              }}
              className="group rounded-3xl bg-white border border-slate-200/90 shadow-soft hover:shadow-card p-5 flex flex-col justify-between transition-all cursor-pointer"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gold-50 border border-gold-200/60 flex items-center justify-center text-gold-600 font-extrabold text-sm shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-navy-950 group-hover:text-gold-600 transition-colors">
                        {p.name}
                      </h4>
                      <Badge variant="navy" size="sm">
                        {p.partnerType}
                      </Badge>
                    </div>
                  </div>

                  {canManagePartners && (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setEditingPartner(p);
                          setFormOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-gold-600 hover:bg-gold-50 transition-colors"
                        title="Edit Partner"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Partner"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Contact & Company Details */}
                <div className="space-y-1.5 text-xs text-slate-500 mb-4">
                  {p.company && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-700">{p.company}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{p.email}</span>
                  </p>
                  {p.phone && (
                    <p className="flex items-center gap-1.5 truncate">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{p.phone}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Commission Arrangement Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Commission Structure</span>
                  <span className="text-xs font-extrabold text-navy-950">
                    {p.commissionType === 'percentage'
                      ? `${p.commissionRate}% of Revenue`
                      : `${p.currency} ${p.commissionRate} Flat`}
                  </span>
                </div>

                <span className="text-xs font-bold text-gold-600 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  View Analytics →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      <PartnerFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSavePartner}
        initialData={editingPartner}
      />

      {/* Detail Modal */}
      <PartnerDetailModal
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        partner={viewingPartner}
        onOpenRecordPayout={onOpenRecordPayout}
        onSelectStudent={onSelectStudent}
      />
    </div>
  );
};

