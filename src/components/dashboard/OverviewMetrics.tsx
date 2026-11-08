import React from 'react';
import { Users, GraduationCap, Globe2, Handshake, Clock, AlertCircle } from 'lucide-react';
import { StatCard } from '../common/StatCard';

interface OverviewMetricsProps {
  totalStudents: number;
  totalApplications: number;
  activeCountries: number;
  b2bPartners: number;
  pendingApplications: number;
  pendingInvoicesCount: number;
  onNavigate: (section: any) => void;
}

export const OverviewMetrics: React.FC<OverviewMetricsProps> = ({
  totalStudents,
  totalApplications,
  activeCountries,
  b2bPartners,
  pendingApplications,
  pendingInvoicesCount,
  onNavigate,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard
        title="Total Students"
        value={totalStudents}
        subtitle="Registered candidates"
        icon={<Users className="w-5 h-5" />}
        accentColor="navy"
        onClick={() => onNavigate('students')}
      />

      <StatCard
        title="Applications"
        value={totalApplications}
        subtitle="Global dossiers"
        icon={<GraduationCap className="w-5 h-5" />}
        accentColor="blue"
        onClick={() => onNavigate('applications')}
      />

      <StatCard
        title="Active Countries"
        value={activeCountries}
        subtitle="Italy, Mongolia, +"
        icon={<Globe2 className="w-5 h-5" />}
        accentColor="purple"
        onClick={() => onNavigate('countries')}
      />

      <StatCard
        title="B2B Partners"
        value={b2bPartners}
        subtitle="Agents & Creators"
        icon={<Handshake className="w-5 h-5" />}
        accentColor="gold"
        onClick={() => onNavigate('partners')}
      />

      <StatCard
        title="In Progress"
        value={pendingApplications}
        subtitle="Awaiting actions"
        icon={<Clock className="w-5 h-5" />}
        accentColor="green"
        onClick={() => onNavigate('applications')}
      />

      <StatCard
        title="Pending Fees"
        value={pendingInvoicesCount}
        subtitle="Unpaid invoices"
        icon={<AlertCircle className="w-5 h-5" />}
        accentColor="gold"
        onClick={() => onNavigate('finance')}
      />
    </div>
  );
};

