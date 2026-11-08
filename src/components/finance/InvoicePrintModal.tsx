import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Invoice, Student } from '../../types';
import { Printer, Download, CheckCircle } from 'lucide-react';

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  student?: Student | null;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  isOpen,
  onClose,
  invoice,
  student,
}) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const currencySymbols = { EUR: '€', USD: '$', INR: '₹' };
  const sym = currencySymbols[invoice.currency] || invoice.currency;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invoice ${invoice.invoiceNumber}`}
      subtitle="Official SKOLAR Educational Services Billing Document"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="gold"
            size="sm"
            onClick={handlePrint}
            icon={<Printer className="w-4 h-4" />}
          >
            Print / Save as PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div id="printable-invoice" className="p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 text-slate-800 space-y-6">
        {/* Invoice Top Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-serif text-2xl font-bold tracking-tight text-[#101A32]">SKOLAR</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#C69A4B] bg-[#F2EBDD] px-2 py-0.5 rounded">
                HQ
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">SKOLAR International Education Consultancy</p>
            <p className="text-[11px] text-slate-400">Via Dante 14, 20121 Milano (MI), Italy • VAT IT-0982341098</p>
            <p className="text-[11px] text-slate-400">support@skolar.it • https://skolar.it</p>
          </div>

          <div className="text-right">
            <h2 className="text-xl font-extrabold uppercase tracking-wider text-[#101A32]">INVOICE</h2>
            <p className="text-sm font-bold text-slate-700 mt-1">{invoice.invoiceNumber}</p>
            <div className="mt-2">
              <Badge
                variant={invoice.status === 'paid' ? 'green' : invoice.status === 'partial' ? 'yellow' : 'navy'}
                size="md"
              >
                {invoice.status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Invoice Metadata & Bill-To */}
        <div className="grid grid-cols-2 gap-6 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Billed To Candidate:
            </span>
            <strong className="text-sm text-navy-950 block">{invoice.studentName}</strong>
            {student?.address && <p className="text-slate-600 mt-0.5">{student.address}</p>}
            {student?.email && <p className="text-slate-600">{student.email}</p>}
            {student?.passportNumber && (
              <p className="text-slate-400 mt-1">Passport ID: {student.passportNumber}</p>
            )}
          </div>

          <div className="space-y-1 text-right">
            <div>
              <span className="text-slate-400">Invoice Date:</span>{' '}
              <strong className="text-navy-950">{invoice.invoiceDate}</strong>
            </div>
            <div>
              <span className="text-slate-400">Payment Due:</span>{' '}
              <strong className="text-navy-950">{invoice.dueDate}</strong>
            </div>
            <div>
              <span className="text-slate-400">Billing Currency:</span>{' '}
              <strong className="text-navy-950">{invoice.currency}</strong>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-3 text-center w-16">Qty</th>
                <th className="py-2.5 px-3 text-right w-24">Unit Price</th>
                <th className="py-2.5 px-4 text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-3 px-4 font-medium text-navy-950">{item.description}</td>
                  <td className="py-3 px-3 text-center text-slate-600">{item.quantity}</td>
                  <td className="py-3 px-3 text-right text-slate-600">{sym}{item.unitPrice.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-bold text-navy-950">{sym}{item.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="flex justify-end text-xs">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold">{sym}{invoice.amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Amount Received / Paid:</span>
              <span className="font-semibold text-emerald-600">
                {sym}{(invoice.paidAmount || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm font-extrabold text-[#101A32] border-t-2 border-slate-200 pt-2">
              <span>Total Remaining Due:</span>
              <span className="text-gold-600">
                {sym}{Math.max(0, invoice.amount - (invoice.paidAmount || 0)).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Bank & Remittance Instructions */}
        <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
          <p className="font-bold text-navy-950 uppercase tracking-wider text-[10px]">Wire Remittance Instructions:</p>
          <p>Bank: Intesa Sanpaolo S.p.A. (Milan, Italy) • SWIFT/BIC: BCITITMM</p>
          <p>Beneficiary: SKOLAR CONSULTING S.R.L. • IBAN: IT60X0542811101000000123456</p>
          <p className="italic text-slate-400">Please quote candidate name and invoice {invoice.invoiceNumber} in transfer memo.</p>
        </div>
      </div>
    </Modal>
  );
};

