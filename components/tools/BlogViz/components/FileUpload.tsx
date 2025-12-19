import React, { useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, X } from 'lucide-react';

interface FileUploadProps {
  label: string;
  accept: string;
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  icon?: 'doc' | 'image';
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  label, 
  accept, 
  onFileSelect, 
  selectedFile, 
  onClear,
  icon = 'doc'
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />
      
      {!selectedFile ? (
        <div 
          onClick={handleClick}
          className="border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 rounded-xl p-6 transition-all cursor-pointer flex flex-col items-center justify-center gap-3 h-32"
        >
          <div className="p-3 bg-white rounded-full shadow-sm text-indigo-600">
            <Upload size={20} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">{label}</p>
            <p className="text-xs text-slate-400 mt-1">Click to browse</p>
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 bg-white rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={`p-2 rounded-lg ${icon === 'doc' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
              {icon === 'doc' ? <FileText size={20} /> : <ImageIcon size={20} />}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-slate-700 truncate w-48">{selectedFile.name}</span>
              <span className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
