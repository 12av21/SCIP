// Template Card Component
import React from 'react';
import { ReportTemplate } from './types';

interface TemplateCardProps {
  template: ReportTemplate;
  onEdit: (template: ReportTemplate) => void;
  onDelete: (id: string) => void;
  typeInfo: any;
  formatInfo: any;
  frequencyInfo: any;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({ template, onEdit, onDelete, typeInfo, formatInfo, frequencyInfo }) => {
  const TypeIcon = typeInfo.icon;
  const FormatIcon = formatInfo.icon;
  const FrequencyIcon = frequencyInfo.icon;
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
          <TypeIcon className="w-6 h-6" />
        </div>
        <span className={`px-2 py-1 text-xs rounded-full ${template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
          {template.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>
      <h4 className="font-semibold text-gray-900 mb-2">{template.name}</h4>
      <p className="text-sm text-gray-500 mb-4 line-clamp-2">{template.description}</p>
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
          <FormatIcon className="w-3 h-3" />
          {formatInfo.label}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
          <FrequencyIcon className="w-3 h-3" />
          {frequencyInfo.label}
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mb-4">
        {template.recipients.map((r: string) => (
          <span key={r} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded">{r}</span>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
        <button onClick={() => onEdit(template)} className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          Edit
        </button>
        <button onClick={() => onDelete(template.id)} className="px-3 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-lg hover:bg-red-50 transition-colors">
          Delete
        </button>
      </div>
    </div>
  );
};