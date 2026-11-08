import React from 'react';
import { Modal } from '../common/Modal';
import { UserPlus, Globe2, Handshake, ReceiptText, CreditCard } from 'lucide-react';
import { NavigationSection } from '../layout/Sidebar';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerAction: (actionKey: 'add_student' | 'add_country' | 'add_partner' | 'create_invoice' | 'record_expense') => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  onTriggerAction,
}) => {
  const actions = [
    {
      key: 'add_student' as const,
      title: 'Add New Student',
      description: 'Register candidate (B2C direct or B2B partner referred)',
      icon: <UserPlus className="w-5 h-5 text-navy-800" />,
      bg: 'bg-navy-50 group-hover:bg-navy-100',
    },
    {
      key: 'create_invoice' as const,
      title: 'Create Invoice',
      description: 'Issue consultancy fee invoice linked to student dossier',
      icon: <ReceiptText className="w-5 h-5 text-gold-600" />,
      bg: 'bg-gold-50 group-hover:bg-gold-100',
    },
    {
      key: 'record_expense' as const,
      title: 'Record Business Expense',
      description: 'Log university fee, translation, or partner commission',
      icon: <CreditCard className="w-5 h-5 text-rose-600" />,
      bg: 'bg-rose-50 group-hover:bg-rose-100',
    },
    {
      key: 'add_partner' as const,
      title: 'Add B2B Partner',
      description: 'Onboard education agent, content creator or referral entity',
      icon: <Handshake className="w-5 h-5 text-emerald-600" />,
      bg: 'bg-emerald-50 group-hover:bg-emerald-100',
    },
    {
      key: 'add_country' as const,
      title: 'Configure New Country',
      description: 'Expand destination portfolio without code modifications',
      icon: <Globe2 className="w-5 h-5 text-sky-600" />,
      bg: 'bg-sky-50 group-hover:bg-sky-100',
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Execution Center"
      subtitle="Select an operational action to execute immediately"
      size="md"
    >
      <div className="space-y-3">
        {actions.map((act) => (
          <button
            key={act.key}
            onClick={() => {
              onClose();
              onTriggerAction(act.key);
            }}
            className="w-full group flex items-start gap-4 p-3.5 rounded-xl border border-slate-200/80 hover:border-gold-400 bg-white hover:bg-slate-50/80 transition-all text-left shadow-sm hover:shadow-soft"
          >
            <div className={`p-3 rounded-xl ${act.bg} shrink-0 transition-colors`}>
              {act.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-navy-950 group-hover:text-gold-600 transition-colors">
                {act.title}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">{act.description}</p>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  );
};

