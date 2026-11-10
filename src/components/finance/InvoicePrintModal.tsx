import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Invoice, Payment, Student } from '../../types';
import { Printer, CheckCircle2 } from 'lucide-react';

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  student?: Student | null;
  payments?: Payment[];
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  isOpen,
  onClose,
  invoice,
  student,
  payments = [],
}) => {
  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const currencySymbols: Record<string, string> = { EUR: '€', USD: '$', INR: '₹' };
  const sym = currencySymbols[invoice.currency] || invoice.currency;

  const computedItemsSubtotal = invoice.items?.reduce((acc, i) => acc + (Number(i.total) || 0), 0) || invoice.amount;
  const displaySubtotal = invoice.subtotal || computedItemsSubtotal;
  const displayDiscount = invoice.discount || 0;
  const displayTax = invoice.taxAmount || 0;
  const balanceDue = Math.max(0, invoice.amount - (invoice.paidAmount || 0));
  const linkedPayments = payments.filter(p => p.invoiceId === invoice.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Invoice ${invoice.invoiceNumber}`}
      subtitle="Official SKOLAR Educational Services Billing Statement"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            variant="gold"
            size="sm"
            onClick={handlePrint}
            icon={<Printer className="w-4 h-4" />}
          >
            Print / Save Official PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div id="printable-invoice" className="bg-white rounded-2xl border border-slate-200 text-slate-800 overflow-hidden shadow-soft">
        {/* Executive Top Gold & Navy Accent Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-[#101A32] via-[#17254D] to-[#C69A4B]" />

        <div className="p-6 sm:p-8 space-y-6">
          {/* Invoice Top Header with Official White-Background SKOLAR Logo */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-200 pb-6">
            <div className="flex items-start gap-4">
              <img
                src="/logo-white.png"
                alt="SKOLAR Logo"
                className="h-20 w-20 object-contain shrink-0 rounded-xl border border-slate-100 bg-white p-1"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-xl font-bold tracking-tight text-[#101A32]">
                    SKOLAR Consulting S.R.L.
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#C69A4B] bg-[#F2EBDD] px-2 py-0.5 rounded">
                    Global HQ
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium">International Education & Career Advisory</p>
                <p className="text-[11px] text-slate-400">Via Dante 14, 20121 Milano (MI), Italy • Partita IVA: IT-0982341098</p>
                <p className="text-[11px] text-slate-400">admissions@skolar.it • https://skolar.it</p>
              </div>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#C69A4B] block">Official Statement</span>
              <h2 className="text-2xl font-extrabold uppercase tracking-wider text-[#101A32]">INVOICE</h2>
              <p className="text-sm font-bold text-slate-700 mt-0.5 font-mono">{invoice.invoiceNumber}</p>
              <div className="mt-2 flex sm:justify-end gap-1.5">
                <Badge
                  variant={invoice.status === 'paid' ? 'green' : invoice.status === 'partial' ? 'yellow' : 'navy'}
                  size="md"
                >
                  {invoice.status.toUpperCase()}
                </Badge>
                {invoice.intakeYear && (
                  <Badge variant="gold" size="md">
                    {invoice.intakeYear} INTAKE
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Bill To & Statement Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#C69A4B] block mb-1.5">
                Billed To Candidate
              </span>
              <strong className="text-sm text-[#101A32] block">{invoice.studentName}</strong>
              {student?.address && <p className="text-slate-600 mt-1">{student.address}</p>}
              {student?.email && <p className="text-slate-600">{student.email}</p>}
              {student?.phone && <p className="text-slate-600">{student.phone}</p>}
              {student?.passportNumber && (
                <p className="text-slate-400 mt-1.5 font-mono text-[11px]">
                  Passport ID: {student.passportNumber}
                </p>
              )}
            </div>

            <div className="p-4 rounded-2xl border border-slate-200/70 bg-slate-50/70 flex flex-col justify-center space-y-1.5 sm:text-right">
              <div>
                <span className="text-slate-400">Issue Date:</span>{' '}
                <strong className="text-[#101A32] font-semibold">{invoice.invoiceDate}</strong>
              </div>
              <div>
                <span className="text-slate-400">Payment Due Date:</span>{' '}
                <strong className="text-[#101A32] font-semibold">{invoice.dueDate}</strong>
              </div>
              <div>
                <span className="text-slate-400">Currency Ledger:</span>{' '}
                <strong className="text-[#101A32] font-semibold">{invoice.currency} ({sym})</strong>
              </div>
              {invoice.countryCode && (
                <div>
                  <span className="text-slate-400">Study Destination:</span>{' '}
                  <strong className="text-[#101A32] font-semibold">
                    {invoice.countryCode === 'IT' ? 'Italy (IT)' : invoice.countryCode === 'MN' ? 'Mongolia (MN)' : invoice.countryCode}
                  </strong>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#101A32] text-white font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Service Deliverable</th>
                  <th className="py-3 px-3 text-center w-16">Qty</th>
                  <th className="py-3 px-3 text-right w-28">Unit Rate</th>
                  <th className="py-3 px-4 text-right w-32">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#101A32]">{item.description}</td>
                    <td className="py-3.5 px-3 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-3.5 px-3 text-right text-slate-600">{sym}{Number(item.unitPrice).toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-[#101A32]">{sym}{Number(item.total).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payment History (if any) & Totals Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start text-xs">
            {/* Left: Notes & Settled Payments Log */}
            <div className="space-y-4">
              {linkedPayments.length > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Recorded Payments Applied
                  </span>
                  <div className="divide-y divide-emerald-100">
                    {linkedPayments.map(p => (
                      <div key={p.id} className="py-1.5 flex items-center justify-between text-[11px]">
                        <div>
                          <strong className="text-navy-950">{p.paymentMethod}</strong>
                          <span className="text-slate-500 ml-1.5">({p.paymentDate} • {p.transactionReference})</span>
                        </div>
                        <span className="font-bold text-emerald-700">{sym}{p.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {invoice.notes && (
                <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/60">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gold-800 block mb-1">
                    Notes & Payment Terms
                  </span>
                  <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{invoice.notes}</p>
                </div>
              )}
            </div>

            {/* Right: Calculations Box */}
            <div className="w-full space-y-2 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
              <div className="flex justify-between text-slate-600">
                <span>Service Subtotal:</span>
                <span className="font-semibold">{sym}{displaySubtotal.toLocaleString()}</span>
              </div>

              {displayDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>
                    {invoice.discountReason || 'Discount Applied'}
                    {invoice.discountType === 'percentage' && invoice.discountValue ? ` (${invoice.discountValue}%)` : ''}:
                  </span>
                  <span>-{sym}{displayDiscount.toLocaleString()}</span>
                </div>
              )}

              {displayTax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>VAT / Tax ({invoice.taxRate}%):</span>
                  <span>+{sym}{displayTax.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between text-[#101A32] font-bold border-t border-slate-200 pt-2 text-sm">
                <span>Net Invoice Total:</span>
                <span>{sym}{invoice.amount.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>Amount Paid / Credited:</span>
                <span className="font-semibold text-emerald-600">
                  -{sym}{(invoice.paidAmount || 0).toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between text-base font-extrabold text-[#101A32] border-t-2 border-[#101A32] pt-2.5">
                <span>Balance Due:</span>
                <span className={balanceDue > 0 ? "text-amber-600" : "text-emerald-600"}>
                  {sym}{balanceDue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Bank & Authorized Footer */}
          <div className="pt-5 border-t border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4 text-[11px] text-slate-500">
            <div className="space-y-1">
              <p className="font-bold text-[#101A32] uppercase tracking-wider text-[10px]">
                Official Bank Remittance Details
              </p>
              <p>Beneficiary: <strong className="text-slate-700">SKOLAR CONSULTING S.R.L.</strong> • Bank: Intesa Sanpaolo S.p.A. (Milan, Italy)</p>
              <p>IBAN: <span className="font-mono text-slate-700">IT60X0542811101000000123456</span> • SWIFT/BIC: <span className="font-mono text-slate-700">BCITITMM</span></p>
              <p className="italic text-slate-400">Quote Candidate Name & Invoice #{invoice.invoiceNumber} in payment memo.</p>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <div className="inline-block border-t border-slate-300 pt-1.5 px-3">
                <span className="font-serif font-bold text-[#101A32] text-xs block">SKOLAR Authorized Signatory</span>
                <span className="text-[10px] text-slate-400">Digitally Verified Billing System</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
