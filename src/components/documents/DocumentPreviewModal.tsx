import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { DocumentRecord } from '../../types';
import { Download, ExternalLink, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { updateDocumentStatus } from '../../services/documentService';
import { useToast } from '../../context/ToastContext';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentRecord | null;
  onStatusChanged?: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  document,
  onStatusChanged,
}) => {
  const { hasPermission } = useAuth();
  const { success, error } = useToast();

  if (!document) return null;

  const canReview = hasPermission('document.review');
  const isImage = document.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(document.name);
  const isPdf = document.fileType === 'application/pdf' || /\.pdf$/i.test(document.name);

  const handleUpdateStatus = async (status: 'Approved' | 'Rejected') => {
    try {
      await updateDocumentStatus(document.id, status);
      success('Review Status Updated', `Document marked as ${status}`);
      if (onStatusChanged) onStatusChanged();
    } catch (err: any) {
      error('Failed to update status', err.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={document.name}
      subtitle={`Category: ${document.category} • Student: ${document.studentName || 'Not Assigned'}`}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          {canReview ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUpdateStatus('Approved')}
                icon={<CheckCircle className="w-4 h-4 text-emerald-600" />}
              >
                Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleUpdateStatus('Rejected')}
                icon={<XCircle className="w-4 h-4 text-rose-600" />}
              >
                Reject
              </Button>
            </div>
          ) : <div />}

          <div className="flex items-center gap-2">
            <a
              href={document.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-navy-950 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open Original
            </a>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Compliance Status Ribbon */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Compliance Status:</span>
            <Badge
              variant={
                document.reviewStatus === 'Approved' ? 'green' :
                document.reviewStatus === 'Rejected' ? 'red' : 'yellow'
              }
              size="sm"
            >
              {document.reviewStatus}
            </Badge>
          </div>
          <span className="text-slate-400">
            Uploaded: {new Date(document.uploadDate).toLocaleString()}
          </span>
        </div>

        {/* Preview Frame */}
        <div className="w-full min-h-[400px] max-h-[600px] flex items-center justify-center bg-slate-900/5 rounded-2xl border border-slate-200 overflow-hidden">
          {isImage ? (
            <img
              src={document.fileUrl}
              alt={document.name}
              className="max-h-[550px] max-w-full object-contain p-2"
            />
          ) : isPdf ? (
            <iframe
              src={`${document.fileUrl}#toolbar=0`}
              title={document.name}
              className="w-full h-[550px] border-0"
            />
          ) : (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <FileText className="w-12 h-12 mx-auto text-slate-400" />
              <p className="text-xs font-medium">Direct preview not supported for this file type.</p>
              <a
                href={document.fileUrl}
                download={document.name}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-navy-900 hover:bg-navy-800"
              >
                <Download className="w-4 h-4" />
                Download Document
              </a>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

