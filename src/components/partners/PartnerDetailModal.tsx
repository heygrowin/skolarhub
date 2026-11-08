import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Partner, Student, PartnerMetrics } from '../../types';
import { getPartnerMetrics, getPartnerReferredStudents } from '../../services/partnerService';
import { Users, GraduationCap, Coins, CheckCircle, Clock, Mail, Phone, Building } from 'lucide-react';

interface PartnerDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner: Partner | null;
  onOpenRecordPayout: (partner: Partner) => void;
  onSelectStudent: (student: Student) => void;
}

export const PartnerDetailModal: React.FC<PartnerDetailModalProps> = ({
  isOpen,
  onClose,
  partner,
  onOpenRecordPayout,
  onSelectStudent,
}) => {
  const [metrics, setMetrics] = useState<PartnerMetrics | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPartnerData = useCallback(async () => {
    if (!partner) return;
    setLoading(true);
    try {
      const [m, stList] = await Promise.all([
        getPartnerMetrics(partner.id, partner),
        getPartnerReferredStudents(partner.id),
      ]);
      setMetrics(m);
      setStudents(stList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [partner]);

  useEffect(() => {
    if (isOpen && partner) {
      loadPartnerData();
    }
  }, [isOpen, partner, loadPartnerData]);

  if (!partner) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={partner.name}
      subtitle={`${partner.partnerType} • Operating in ${partner.country}`}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="gold"
            size="sm"
            onClick={() => onOpenRecordPayout(partner)}
            icon={<Coins className="w-4 h-4" />}
          >
            Record Commission Payment
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Partner Header Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-deep-navy to-midnight text-white shadow-soft">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">{partner.name}</h3>
              <Badge variant="gold" size="sm">{partner.partnerType}</Badge>
              <Badge variant={partner.status === 'active' ? 'green' : 'slate'} size="sm">
                {partner.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1.5">
              {partner.contactPerson && <span>Contact: {partner.contactPerson}</span>}
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-gold-400" />{partner.email}</span>
              {partner.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-gold-400" />{partner.phone}</span>}
            </div>
          </div>

          <div className="text-right self-start sm:self-center">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Commission Model</span>
            <span className="text-sm font-extrabold text-gold-400">
              {partner.commissionType === 'percentage'
                ? `${partner.commissionRate}% of Revenue`
                : `${partner.currency} ${partner.commissionRate} Flat Fee`}
            </span>
          </div>
        </div>

        {/* Operational Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">Referred Students</span>
              <strong className="text-xl font-extrabold text-navy-950 mt-1 block">{metrics.totalReferredStudents}</strong>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">Active Pipeline</span>
              <strong className="text-xl font-extrabold text-blue-600 mt-1 block">{metrics.activeApplications}</strong>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wider block">Admitted & Converted</span>
              <strong className="text-xl font-extrabold text-emerald-600 mt-1 block">{metrics.convertedStudents}</strong>
            </div>

            {/* Commission Balances */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/60">
              <span className="text-[11px] text-emerald-900 uppercase font-bold tracking-wider block">Commission Paid</span>
              <strong className="text-lg font-extrabold text-emerald-700 mt-1 block">
                {Object.entries(metrics.commissionPaid)
                  .map(([c, amt]) => `${c} ${(amt as number).toLocaleString()}`)
                  .join(' | ') || '0'}
              </strong>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/60 sm:col-span-2">
              <span className="text-[11px] text-amber-900 uppercase font-bold tracking-wider block">Commission Due / Owed</span>
              <strong className="text-lg font-extrabold text-amber-700 mt-1 block">
                {Object.entries(metrics.commissionOwed)
                  .map(([c, amt]) => `${c} ${(amt as number).toLocaleString()}`)
                  .join(' | ') || 'Settled'}
              </strong>
            </div>
          </div>
        )}

        {/* Referred Students List */}
        <div>
          <h4 className="text-xs font-bold text-navy-950 uppercase tracking-wider mb-2.5">
            Referred Candidates ({students.length})
          </h4>

          {students.length === 0 ? (
            <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-xl">
              No students have been connected to this partner yet.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 rounded-2xl bg-white border border-slate-200/80 overflow-hidden">
              {students.map((st) => (
                <div
                  key={st.id}
                  onClick={() => {
                    onClose();
                    onSelectStudent(st);
                  }}
                  className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-navy-100 text-navy-900 font-bold flex items-center justify-center">
                      {st.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h5 className="font-bold text-navy-950">{st.fullName}</h5>
                      <span className="text-[11px] text-slate-400">{st.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="navy" size="sm">
                      {st.countryOfInterest === 'IT' ? '🇮🇹 Italy' : st.countryOfInterest === 'MN' ? '🇲🇳 Mongolia' : st.countryOfInterest}
                    </Badge>
                    <span className="text-slate-400 text-[10px]">{new Date(st.registrationDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contract & Notes */}
        {partner.agreementDetails && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
            <h5 className="font-bold text-navy-950 uppercase tracking-wider mb-1">Contractual Terms</h5>
            <p className="text-slate-600 leading-relaxed">{partner.agreementDetails}</p>
          </div>
        )}
      </div>
    </Modal>
  );
};
