// Report Card Component
import React from 'react';
import { GeneratedReport, ReportTemplate } from './types';
import { FileType, FileSpreadsheet, FileCode, Eye, Download, Trash2, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface ReportCardProps {
  report: GeneratedReport;
  template: ReportTemplate | undefined;
  onPreview: (report: GeneratedReport) => void;
  onDownload: (report: GeneratedReport) => void;
  onDelete: (id: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-700';
    case 'generating': return 'bg-blue-100 text-blue-700';
    case 'pending': return 'bg-yellow-100 text-yellow-700';
    case 'failed': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();

export const ReportCard: React.FC<ReportCardProps> = ({ report, template, onPreview, onDownload, onDelete }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-gray-100 text-gray-600 rounded-lg">
          {report.format === 'pdf' && <FileType className="w-6 h-6" />}
          {report.format === 'csv' && <FileSpreadsheet className="w-6 h-6" />}
          {report.format === 'html' && <FileCode className="w-6 h-6" />}
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(report.status)}`}>
          {report.status}
        </span>
      </div>
      <h4 className="font-semibold text-gray-900 mb-2">{report.name}</h4>
      <p className="text-sm text-gray-500 mb-3">{template?.name || 'Unknown template'}</p>
      <div className="space-y-1 text-sm text-gray-500 mb-4">
        <div>Generated: {formatDate(report.generatedAt)}</div>
        {report.completedAt && <div>Completed: {formatDate(report.completedAt)}</div>}
        {report.error && <div className="text-red-600">Error: {report.error}</div>}
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        {report.status === 'completed' && (
          <button onClick={() => onPreview(report)} className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Eye className="w-4 h-4 mr-1" /> Preview
          </button>
        )}
        {report.status === 'completed' && (
          <button onClick={() => onDownload(report)} className="flex-1 px-3 py-2 text-sm font-medium text-green-600 bg-white border border-green-300 rounded-lg hover:bg-green-50 transition-colors">
            <Download className="w-4 h-4 mr-1" /> Download
          </button>
        )}
        <button onClick={() => onDelete(report.id)} className="px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};