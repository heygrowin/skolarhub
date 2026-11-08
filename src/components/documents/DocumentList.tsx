import React, { useState, useEffect, useCallback } from 'react';
import { DocumentRecord, Student } from '../../types';
import { getDocuments, deleteDocumentRecord, updateDocumentStatus } from '../../services/documentService';
import { getStudents } from '../../services/studentService';
import { useCountry } from '../../context/CountryContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { DocumentUploadModal } from './DocumentUploadModal';
import { 
  FolderLock, 
  Search, 
  Upload, 
  Download, 
  Eye, 
  Trash2, 
  FileText, 
  CheckCircle, 
  XCircle, 
  RefreshCw 
} from 'lucide-react';

export const DocumentList: React.FC = () => {
  const { countries, selectedCountryFilter, setSelectedCountryFilter } = useCountry();
  const { hasPermission } = useAuth();
  const { success, error } = useToast();

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState<boolean>(false);
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);
  const [previewingDoc, setPreviewingDoc] = useState<DocumentRecord | null>(null);

  const canUpload = hasPermission('document.upload');
  const canDelete = hasPermission('document.delete');
  const canReview = hasPermission('document.review');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [docs, studentRes] = await Promise.all([
        getDocuments({
          countryCode: selectedCountryFilter !== 'ALL' ? selectedCountryFilter : undefined,
          category: categoryFilter !== 'ALL' ? categoryFilter : undefined,
        }),
        getStudents(),
      ]);

      setDocuments(docs);
      setStudents(studentRes.students);
    } catch (err: any) {
      error('Failed to load documents', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCountryFilter, categoryFilter, error]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDelete = async (docRecord: DocumentRecord) => {
    if (!window.confirm(`Permanently delete ${docRecord.name}?`)) return;
    try {
      await deleteDocumentRecord(docRecord.id, docRecord.storagePath);
      success('Document Deleted', 'File removed from vault.');
      loadData();
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  const handleReviewStatus = async (docId: string, status: 'Approved' | 'Rejected') => {
    try {
      await updateDocumentStatus(docId, status);
      success('Review Recorded', `Document marked as ${status}.`);
      loadData();
    } catch (err: any) {
      error('Review Failed', err.message);
    }
  };

  const filteredDocs = documents.filter(d => {
    const matchesSearch = 
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.studentName && d.studentName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      d.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || d.reviewStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-950 tracking-tight">Compliance & Document Vault</h2>
          <p className="text-xs text-slate-500">
            {filteredDocs.length} archived student passports, educational certificates and visa dossiers
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

          {canUpload && (
            <Button
              variant="gold"
              size="sm"
              onClick={() => setUploadModalOpen(true)}
              icon={<Upload className="w-4 h-4" />}
            >
              Upload Document
            </Button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by file name, candidate name or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-600 bg-slate-50/50"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-600 bg-white font-medium text-navy-950"
            >
              <option value="ALL">All Categories</option>
              <option value="Passport">Passport</option>
              <option value="Academic Transcripts">Academic Transcripts</option>
              <option value="Language Certificate">Language Certificate</option>
              <option value="Visa">Visa Dossier</option>
              <option value="Financial Document">Financial Document</option>
              <option value="University Offer Letter">University Offer Letter</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-navy-600 bg-white font-medium text-navy-950"
            >
              <option value="ALL">All Review Statuses</option>
              <option value="Pending">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Documents Grid / Table */}
      {filteredDocs.length === 0 ? (
        <EmptyState
          icon={<FolderLock className="w-8 h-8" />}
          title="No Documents Found"
          description="Upload student passports or transcripts to start building candidate dossiers."
          actionText={canUpload ? "Upload First Document" : undefined}
          onAction={() => setUploadModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-soft hover:shadow-card flex flex-col justify-between transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-navy-50 text-navy-800 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-navy-950 truncate max-w-[180px]" title={doc.name}>
                        {doc.name}
                      </h4>
                      <Badge variant="navy" size="sm">
                        {doc.category}
                      </Badge>
                    </div>
                  </div>

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

                <div className="space-y-1 text-xs text-slate-500 mb-4">
                  <p>Candidate: <strong className="text-navy-950">{doc.studentName || 'Not Assigned'}</strong></p>
                  <p className="text-[11px] text-slate-400">
                    Country: {doc.countryCode === 'IT' ? '🇮🇹 Italy' : doc.countryCode === 'MN' ? '🇲🇳 Mongolia' : doc.countryCode} • Size: {(doc.fileSize / 1024).toFixed(0)} KB
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Uploaded: {new Date(doc.uploadDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {canReview && doc.reviewStatus === 'Pending' && (
                    <>
                      <button
                        onClick={() => handleReviewStatus(doc.id, 'Approved')}
                        title="Approve"
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReviewStatus(doc.id, 'Rejected')}
                        title="Reject"
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setPreviewingDoc(doc);
                      setPreviewModalOpen(true);
                    }}
                    title="Preview"
                    className="p-2 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={doc.name}
                    title="Download"
                    className="p-2 text-slate-500 hover:text-navy-950 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  {canDelete && (
                    <button
                      onClick={() => handleDelete(doc)}
                      title="Delete"
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <DocumentUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={loadData}
        students={students}
      />

      {/* Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        document={previewingDoc}
        onStatusChanged={loadData}
      />
    </div>
  );
};

