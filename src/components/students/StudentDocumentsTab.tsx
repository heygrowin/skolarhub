import React, { useState } from 'react';
import { Student, DocumentRecord, DocumentCategory } from '../../types';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { FolderLock, Upload, Download, Trash2, Eye, FileText, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { uploadDocumentFile } from '../../lib/storageService';
import { createDocumentRecord, deleteDocumentRecord, updateDocumentStatus } from '../../services/documentService';
import { useToast } from '../../context/ToastContext';

interface StudentDocumentsTabProps {
  student: Student;
  documents: DocumentRecord[];
  onRefresh: () => void;
  onPreviewDocument: (doc: DocumentRecord) => void;
}

export const StudentDocumentsTab: React.FC<StudentDocumentsTabProps> = ({
  student,
  documents,
  onRefresh,
  onPreviewDocument,
}) => {
  const { userProfile, hasPermission } = useAuth();
  const { success, error } = useToast();
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('Academic Transcripts');

  const canUpload = hasPermission('document.upload');
  const canDelete = hasPermission('document.delete');
  const canReview = hasPermission('document.review');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(10);
    try {
      const uploadRes = await uploadDocumentFile(file, `students/${student.id}`, (pct) => {
        setUploadProgress(pct);
      });

      await createDocumentRecord({
        name: file.name,
        studentId: student.id,
        studentName: student.fullName,
        countryCode: student.countryOfInterest,
        category: selectedCategory,
        uploadedBy: userProfile?.uid || 'user',
        uploadedByName: userProfile?.displayName || 'Counsellor',
        uploadDate: new Date().toISOString(),
        storagePath: uploadRes.storagePath,
        fileUrl: uploadRes.url,
        fileSize: uploadRes.fileSize,
        fileType: uploadRes.contentType,
        reviewStatus: 'Pending',
      });

      success('File Uploaded', `${file.name} saved securely in cloud storage.`);
      onRefresh();
    } catch (err: any) {
      error('Upload Failed', err?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  const handleDelete = async (docRecord: DocumentRecord) => {
    if (!window.confirm(`Are you sure you want to delete ${docRecord.name}?`)) return;
    try {
      await deleteDocumentRecord(docRecord.id, docRecord.storagePath);
      success('Document Deleted', 'Record and file removed.');
      onRefresh();
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  const handleStatusChange = async (docId: string, status: 'Approved' | 'Rejected') => {
    try {
      await updateDocumentStatus(docId, status);
      success('Compliance Status Updated', `Document marked as ${status}`);
      onRefresh();
    } catch (err: any) {
      error('Status Update Failed', err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
        <div>
          <h4 className="text-sm font-bold text-navy-950">Document Repository</h4>
          <p className="text-xs text-slate-400">Passports, marksheets, legalization & visa files</p>
        </div>

        {canUpload && (
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="text-xs rounded-xl border border-slate-300 bg-white px-2.5 py-2 font-medium text-navy-950 focus:outline-none"
            >
              <option value="Passport">Passport</option>
              <option value="Academic Transcripts">Academic Transcripts</option>
              <option value="Language Certificate">Language Certificate</option>
              <option value="Visa">Visa Dossier</option>
              <option value="Financial Document">Financial Document</option>
              <option value="University Offer Letter">Offer Letter</option>
              <option value="Other">Other Document</option>
            </select>

            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <Button
                variant="gold"
                size="sm"
                loading={uploading}
                icon={<Upload className="w-4 h-4" />}
                type="button"
                onClick={() => {}}
              >
                {uploading ? `Uploading ${uploadProgress}%` : 'Upload File'}
              </Button>
            </label>
          </div>
        )}
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <EmptyState
          icon={<FolderLock className="w-6 h-6" />}
          title="No Documents Uploaded"
          description="Upload student passport, marksheets, or admission certificates."
        />
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl bg-white border border-slate-200/80 overflow-hidden">
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-navy-50 text-navy-800 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-bold text-navy-950 truncate max-w-sm">{doc.name}</h5>
                    <Badge
                      variant={
                        doc.reviewStatus === 'Approved' ? 'green' :
                        doc.reviewStatus === 'Rejected' ? 'red' : 'yellow'
                      }
                      size="sm"
                    >
                      {doc.reviewStatus}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Category: <span className="font-medium text-slate-600">{doc.category}</span> • Uploaded on {new Date(doc.uploadDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                {canReview && doc.reviewStatus === 'Pending' && (
                  <>
                    <button
                      onClick={() => handleStatusChange(doc.id, 'Approved')}
                      title="Approve Document"
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleStatusChange(doc.id, 'Rejected')}
                      title="Reject Document"
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </>
                )}

                <button
                  onClick={() => onPreviewDocument(doc)}
                  title="Preview"
                  className="p-1.5 text-slate-500 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>

                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  download={doc.name}
                  title="Download File"
                  className="p-1.5 text-slate-500 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                </a>

                {canDelete && (
                  <button
                    onClick={() => handleDelete(doc)}
                    title="Delete"
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

