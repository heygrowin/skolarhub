import React from 'react';
import { 
  UserPlus, 
  Coins, 
  FileCheck2, 
  ArrowRightCircle, 
  Clock 
} from 'lucide-react';
import { Student, Payment, DocumentRecord, Application } from '../../types';
import { Badge } from '../common/Badge';

interface RecentActivityFeedProps {
  recentStudents: Student[];
  recentPayments: Payment[];
  recentDocuments: DocumentRecord[];
  recentApplications: Application[];
  onNavigate: (section: any) => void;
}

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  recentStudents,
  recentPayments,
  recentDocuments,
  recentApplications,
  onNavigate,
}) => {
  // Aggregate unified activity items
  const activities: Array<{
    id: string;
    type: 'student' | 'payment' | 'document' | 'application';
    title: string;
    subtitle: string;
    time: string;
    badgeText?: string;
    badgeVariant?: 'gold' | 'green' | 'blue' | 'purple' | 'navy';
  }> = [];

  recentStudents.slice(0, 3).forEach(s => {
    activities.push({
      id: `act_student_${s.id}`,
      type: 'student',
      title: s.fullName,
      subtitle: `Registered for ${s.countryOfInterest === 'IT' ? 'Italy 🇮🇹' : s.countryOfInterest === 'MN' ? 'Mongolia 🇲🇳' : s.countryOfInterest} (${s.acquisitionType})`,
      time: new Date(s.createdAt).toLocaleDateString(),
      badgeText: s.acquisitionType,
      badgeVariant: s.acquisitionType === 'B2B' ? 'gold' : 'blue',
    });
  });

  recentPayments.slice(0, 3).forEach(p => {
    activities.push({
      id: `act_payment_${p.id}`,
      type: 'payment',
      title: `${p.currency === 'EUR' ? '€' : p.currency === 'USD' ? '$' : '₹'}${p.amount.toLocaleString()} Received`,
      subtitle: `Payment from ${p.studentName} (${p.paymentMethod})`,
      time: new Date(p.createdAt).toLocaleDateString(),
      badgeText: 'Paid',
      badgeVariant: 'green',
    });
  });

  recentDocuments.slice(0, 2).forEach(d => {
    activities.push({
      id: `act_doc_${d.id}`,
      type: 'document',
      title: d.name,
      subtitle: `Category: ${d.category} (${d.studentName || 'Student Document'})`,
      time: new Date(d.createdAt).toLocaleDateString(),
      badgeText: d.reviewStatus,
      badgeVariant: d.reviewStatus === 'Approved' ? 'green' : 'gold',
    });
  });

  recentApplications.slice(0, 3).forEach(a => {
    activities.push({
      id: `act_app_${a.id}`,
      type: 'application',
      title: `${a.studentName} → ${a.university}`,
      subtitle: `Course: ${a.course}`,
      time: new Date(a.updatedAt).toLocaleDateString(),
      badgeText: a.status,
      badgeVariant: 'purple',
    });
  });

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-soft">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gold-500" />
            Live Activity Stream
          </h3>
          <p className="text-xs text-slate-400">Real-time system events, updates & payments</p>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No recent activity recorded yet.
          </div>
        ) : (
          activities.map((item) => (
            <div key={item.id} className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60 rounded-xl px-2 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  item.type === 'student' ? 'bg-navy-50 text-navy-800' :
                  item.type === 'payment' ? 'bg-emerald-50 text-emerald-600' :
                  item.type === 'document' ? 'bg-sky-50 text-sky-600' :
                  'bg-purple-50 text-purple-600'
                }`}>
                  {item.type === 'student' && <UserPlus className="w-4 h-4" />}
                  {item.type === 'payment' && <Coins className="w-4 h-4" />}
                  {item.type === 'document' && <FileCheck2 className="w-4 h-4" />}
                  {item.type === 'application' && <ArrowRightCircle className="w-4 h-4" />}
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-bold text-navy-950 truncate">{item.title}</p>
                  <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {item.badgeText && (
                  <Badge variant={item.badgeVariant || 'slate'} size="sm">
                    {item.badgeText}
                  </Badge>
                )}
                <span className="text-[10px] text-slate-400 font-medium">{item.time}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

