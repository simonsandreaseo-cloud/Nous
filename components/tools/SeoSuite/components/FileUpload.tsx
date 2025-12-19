
import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, Database, FileSpreadsheet, Plus } from 'lucide-react';
import { Language, DataSourceMode } from '../types';
import { processUploadedFiles } from '../services/csvProcessor';

interface FileUploadProps {
  onDataLoaded: (csvText: string) => void;
  lang: Language;
  mode: DataSourceMode;
  setMode: (mode: DataSourceMode) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ 
    onDataLoaded, 
    lang, 
    mode, 
    setMode,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const t = {
    uploadTitle: lang === 'es' ? 'Cargar Datos (GSC + GA)' : 'Upload Data (GSC + GA)',
    connectTitle: lang === 'es' ? 'Conectar Search Console' : 'Connect Search Console',
    dragDrop: lang === 'es' 
        ? 'Arrastra tus archivos CSV aquí. Puedes subir GSC y Google Analytics juntos para combinar datos.' 
        : 'Drag & Drop CSV files here. You can upload GSC and Google Analytics together to merge data.',
    selectFile: lang === 'es' ? 'Seleccionar Archivos' : 'Select Files',
    processing: lang === 'es' ? 'Procesando y Fusionando...' : 'Processing & Merging...',
    
    hintGsc: lang === 'es' ? 'GSC: Requiere columnas de Query, URL, Impresiones, Clics, Fecha.' : 'GSC: Requires Query, URL, Impressions, Clicks, Date.',
    hintGa: lang === 'es' ? 'GA: Requiere URL, Rebote, Duración y Fecha (Opcional).' : 'GA: Requires URL, Bounce Rate, Duration and Date (Optional).',
    
    tabCsv: 'CSV Upload',
    tabGsc: 'Google Search Console',
  };

  const processFiles = async (files: File[]) => {
      setIsProcessing(true);
      setError(null);
      try {
          // Process and merge files
          const resultCsv = await processUploadedFiles(files);
          onDataLoaded(resultCsv);
      } catch (err: any) {
          console.error(err);
          setError(lang === 'es' ? 'Error: ' + err.message : 'Error: ' + err.message);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    
    const validFiles: File[] = [];
    for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            validFiles.push(file);
        }
    }

    if (validFiles.length === 0) {
        setError(lang === 'es' ? 'Solo se permiten archivos CSV.' : 'Only CSV files are allowed.');
        return;
    }

    processFiles(validFiles);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-20 animate-in fade-in duration-500 px-4 space-y-8">
      
      {/* Tabs */}
      <div className="flex justify-center">
        <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 inline-flex">
          <button
            onClick={() => setMode('csv')}
            className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'csv' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {t.tabCsv}
          </button>
          <button
            onClick={() => setMode('gsc')}
            className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'gsc' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Database className="w-4 h-4 mr-2" />
            {t.tabGsc}
          </button>
        </div>
      </div>

      {mode === 'csv' ? (
        <>
          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            className={`
              border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ease-in-out
              flex flex-col items-center justify-center cursor-pointer bg-white shadow-sm relative overflow-hidden min-h-[300px]
              ${isDragging ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}
            `}
          >
            {isProcessing && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 backdrop-blur-sm">
                    <div className="text-indigo-600 font-bold flex flex-col items-center">
                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                        {t.processing}
                    </div>
                </div>
            )}

            <div className={`p-4 rounded-full mb-4 transition-colors ${isDragging ? 'bg-white' : 'bg-indigo-50'}`}>
              <Upload className={`w-10 h-10 ${isDragging ? 'text-indigo-600' : 'text-indigo-500'}`} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {t.uploadTitle}
            </h3>
            <p className="text-sm text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
              {t.dragDrop}
            </p>
            
            <input
              type="file"
              accept=".csv"
              multiple // Allow multiple files
              className="hidden"
              id="file-upload"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <label
              htmlFor="file-upload"
              className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer shadow-md hover:shadow-lg transform active:scale-95 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {t.selectFile}
            </label>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-center text-red-700 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-75">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-slate-600 flex items-start gap-2">
                <FileText className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <span>{t.hintGsc}</span>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs text-slate-600 flex items-start gap-2">
                <FileText className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>{t.hintGa}</span>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl p-10 shadow-sm border border-gray-200 text-center min-h-[300px] flex flex-col justify-center items-center">
            <div className="bg-indigo-50 p-4 rounded-full inline-flex mb-4">
                <Database className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{t.connectTitle}</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
                {lang === 'es' 
                    ? 'Esta función permitirá extraer datos directamente de tu propiedad de Search Console.' 
                    : 'This feature will allow fetching data directly from your Search Console property.'}
            </p>
            <div className="p-4 bg-amber-50 text-amber-800 rounded-lg text-sm border border-amber-100 inline-block">
                🚧 {lang === 'es' ? 'Próximamente' : 'Coming Soon'}
            </div>
        </div>
      )}

    </div>
  );
};

export default FileUpload;
