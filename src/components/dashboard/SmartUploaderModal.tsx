import React, { useState, useRef } from 'react';
import { Upload, Loader2, X, FileSpreadsheet, Check, ArrowRight, AlertTriangle } from 'lucide-react';
import { parseSpreadsheet, ParsedData } from '@/lib/utils/excel-parser';
import { NotificationService } from '@/lib/services/notifications';
import { Task } from '@/types/project';
import { supabase } from '@/lib/supabase';

interface SmartUploaderModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    onImportComplete: (tasks: any[]) => void;
}

const parseSmartDate = (val: any): string | null => {
    if (!val) return null;
    let str = String(val).toLowerCase().trim();
    
    // 1. Try regex for "Mes Año" or "Mes de Año" (e.g. "junio 2026")
    const monthNames: Record<string, number> = {
        'enero': 0, 'january': 0, 'jan': 0,
        'febrero': 1, 'february': 1, 'feb': 1,
        'marzo': 2, 'march': 2, 'mar': 2,
        'abril': 3, 'april': 3, 'apr': 3,
        'mayo': 4, 'may': 4,
        'junio': 5, 'june': 5, 'jun': 5,
        'julio': 6, 'july': 6, 'jul': 6,
        'agosto': 7, 'august': 7, 'aug': 7,
        'septiembre': 8, 'setiembre': 8, 'september': 8, 'sep': 8,
        'octubre': 9, 'october': 9, 'oct': 9,
        'noviembre': 10, 'november': 10, 'nov': 10,
        'diciembre': 11, 'december': 11, 'dec': 11
    };

    const monthYearRegex = /^([a-z]+)[\sde]+(\d{4}|\d{2})$/i;
    const match = str.match(monthYearRegex);
    if (match) {
        const monthStr = match[1];
        let year = parseInt(match[2], 10);
        if (year < 100) year += 2000;
        
        const monthIndex = monthNames[monthStr];
        if (monthIndex !== undefined) {
            // Asignamos el día 1 del mes para mantener el formato válido en la BD (YYYY-MM-DD)
            const d = new Date(Date.UTC(year, monthIndex, 1));
            return d.toISOString().split('T')[0];
        }
    }

    // 2. Try regex for MM/YYYY or MM-YYYY
    const mmYyyyRegex = /^(\d{1,2})[\/\-](\d{4})$/;
    const mmMatch = str.match(mmYyyyRegex);
    if (mmMatch) {
        const monthIndex = parseInt(mmMatch[1], 10) - 1;
        const year = parseInt(mmMatch[2], 10);
        if (monthIndex >= 0 && monthIndex <= 11) {
            const d = new Date(Date.UTC(year, monthIndex, 1));
            return d.toISOString().split('T')[0];
        }
    }
    
    // 3. Try regex for DD/MM/YYYY or DD-MM-YYYY
    const ddMmYyyyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
    const ddMmMatch = str.match(ddMmYyyyRegex);
    if (ddMmMatch) {
        const day = parseInt(ddMmMatch[1], 10);
        const monthIndex = parseInt(ddMmMatch[2], 10) - 1;
        const year = parseInt(ddMmMatch[3], 10);
        if (monthIndex >= 0 && monthIndex <= 11) {
            const d = new Date(Date.UTC(year, monthIndex, day));
            return d.toISOString().split('T')[0];
        }
    }

    // 4. Excel numeric dates
    if (!isNaN(Number(str)) && Number(str) > 30000) {
         const serial = Number(str);
         // Excel's epoch is Dec 30, 1899
         const excelEpoch = new Date(Date.UTC(1899, 11, 30));
         const parsedDate = new Date(excelEpoch.getTime() + serial * 86400000);
         return parsedDate.toISOString().split('T')[0];
    }
    
    // 5. Standard JS parse (YYYY-MM-DD, ISO, etc)
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
    }
    
    return null;
};

const NOUS_FIELDS = [
    { value: 'title', label: 'Título del Artículo (H1)' },
    { value: 'project_name', label: 'Proyecto al que pertenece' },
    { value: 'target_keyword', label: 'Keyword Principal' },
    { value: 'associated_url', label: 'Interlinking' },
    { value: 'refs', label: 'Referencias (URLs a scrapear/investigar)' },
    { value: 'status', label: 'Estado (e.g. idea, en_redaccion)' },
    { value: 'volume', label: 'Volumen de Búsqueda' },
    { value: 'target_word_count', label: 'Nº de Palabras ideal / Extensión' },
    { value: 'brief', label: 'Brief / Intención / Resumen' },
    { value: 'scheduled_date', label: 'Fecha de Publicación' },
    { value: 'target_url_slug', label: 'Slug (URL)' },
    { value: 'content_type', label: 'Tipo de Contenido' },
    { value: 'priority', label: 'Prioridad' },
    { value: 'viability', label: 'Viabilidad' },
    { value: 'docs_url', label: 'URL de Google Docs/Drive' },
    { value: 'layout_status', label: 'Status de Maquetación (TRUE/FALSE)' },
    { value: 'assigned_to', label: 'Asignado a (Nombre o Correo)' },
    { value: 'lsi_keywords', label: 'Keywords LSI' },
    { value: 'seo_title', label: 'SEO Title (Meta)' },
    { value: 'meta_description', label: 'Meta Descripción' },
    { value: 'h1', label: 'H1 Específico' },
    { value: 'excerpt', label: 'Extracto / Excerpt' },
    { value: 'language', label: 'Idioma (ISO)' },
    { value: 'observaciones', label: 'Observaciones / Enfoque' },
    { value: 'ignore', label: '-- Ignorar esta columna --' }
];

export const SmartUploaderModal: React.FC<SmartUploaderModalProps> = ({ isOpen, onClose, projectId, onImportComplete }) => {
    const [step, setStep] = useState<'upload' | 'analyzing' | 'mapping'>('upload');
    const [parsedData, setParsedData] = useState<ParsedData | null>(null);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [isImporting, setIsImporting] = useState(false);
    const [autoCreateProjects, setAutoCreateProjects] = useState(true);
    const [autoCreateMembers, setAutoCreateMembers] = useState(true);
    const [userProjects, setUserProjects] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isOpen) {
            supabase.from('projects').select('id, name').then(({ data }) => {
                if (data) setUserProjects(data);
            });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStep('analyzing');
        try {
            const data = await parseSpreadsheet(file);
            if (data.rows.length === 0) {
                throw new Error("El archivo está vacío o no se pudo leer correctamente.");
            }
            setParsedData(data);

            // Preparar payload para la IA (Solo 5 filas de muestra)
            const sampleRows = data.rows.slice(0, 5);

            const res = await fetch('/api/ai/map-columns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    headers: data.headers,
                    sampleRows
                })
            });

            const responseData = await res.json();
            
            if (!res.ok) {
                throw new Error(responseData.error || "Error al analizar con la IA");
            }

            // Normalizar el mapeo para que use 'ignore' en lugar de null
            const initialMapping: Record<string, string> = {};
            for (const header of data.headers) {
                const aiSuggestion = responseData.mapping[header];
                initialMapping[header] = aiSuggestion ? aiSuggestion : 'ignore';
            }

            setMapping(initialMapping);
            setStep('mapping');
            NotificationService.success("Análisis completado", "La IA ha sugerido un mapeo. Por favor, revísalo.");

        } catch (error: any) {
            console.error("Error upload:", error);
            NotificationService.error("Error al procesar", error.message || "Error desconocido");
            setStep('upload');
        }
    };

    const handleMappingChange = (header: string, internalField: string) => {
        setMapping(prev => ({ ...prev, [header]: internalField }));
    };

    const handleConfirmImport = async () => {
        if (!parsedData) return;
        setIsImporting(true);

        try {
            // Check if user mapped a column to project_name
            const projectCol = Object.keys(mapping).find(k => mapping[k] === 'project_name');
            let resolvedProjectsMapping: Record<string, string> = {};

            if (projectCol) {
                NotificationService.success("Analizando proyectos", "La IA está emparejando los proyectos del archivo con tu base de datos...");
                const uniqueCsvProjects = [...new Set(parsedData.rows.map(r => String(r[projectCol]).trim()).filter(Boolean))];
                
                try {
                    const res = await fetch('/api/ai/match-projects', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ csvProjects: uniqueCsvProjects, existingProjects: userProjects })
                    });
                    const responseData = await res.json();
                    if (res.ok && responseData.mapping) {
                        resolvedProjectsMapping = responseData.mapping;
                        
                        // Create missing projects if autoCreate is ON
                        if (autoCreateProjects) {
                            const { data: { session } } = await supabase.auth.getSession();
                            const userId = session?.user?.id;
                            
                            for (const csvName of Object.keys(resolvedProjectsMapping)) {
                                if (resolvedProjectsMapping[csvName] === 'NEW') {
                                    if (userId) {
                                        const { data: newProj } = await supabase.from('projects').insert({
                                            name: csvName,
                                            user_id: userId
                                        }).select('id').single();
                                        
                                        if (newProj) {
                                            resolvedProjectsMapping[csvName] = newProj.id;
                                        }
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error("Error matching projects via AI:", e);
                }
            }

            // Check if user mapped a column to assigned_to
            const assignedCol = Object.keys(mapping).find(k => mapping[k] === 'assigned_to');
            let resolvedMembersMapping: Record<string, string> = {};

            if (assignedCol) {
                const uniqueCsvMembers = [...new Set(parsedData.rows.map(r => String(r[assignedCol]).trim()).filter(Boolean))];
                
                // Fetch current team members
                const { data: teamMembersData } = await supabase
                    .from('team_members')
                    .select('user_id, profile:profiles(id, full_name, email)');

                const existingMembers = teamMembersData || [];
                
                for (const csvMember of uniqueCsvMembers) {
                    const match = existingMembers.find((m: any) => 
                        m.profile?.full_name?.toLowerCase() === csvMember.toLowerCase() || 
                        m.profile?.email?.toLowerCase() === csvMember.toLowerCase()
                    );
                    
                    if (match) {
                        resolvedMembersMapping[csvMember] = match.user_id;
                    } else if (autoCreateMembers) {
                        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(csvMember);
                        if (isEmail) {
                            try {
                                // Buscamos el primer team id disponible para el usuario actual
                                const { data: { session } } = await supabase.auth.getSession();
                                if (session?.user?.id) {
                                    const { data: teamData } = await supabase.from('team_members')
                                        .select('team_id').eq('user_id', session.user.id).limit(1).single();
                                    
                                    if (teamData?.team_id) {
                                        const { error: inviteError } = await supabase.rpc('invite_user_to_team', {
                                            p_team_id: teamData.team_id,
                                            p_email: csvMember,
                                            p_role: 'specialist'
                                        });
                                        if (inviteError) {
                                            console.error(`Error invitando a ${csvMember}:`, inviteError);
                                        } else {
                                            console.log(`Invitación enviada exitosamente a ${csvMember}`);
                                        }
                                    }
                                }
                            } catch (e) {
                                console.error(`Failed to invite member ${csvMember}:`, e);
                            }
                        } else {
                            console.warn(`El miembro "${csvMember}" no es un correo electrónico. La invitación requiere un correo. Se ignoró.`);
                        }
                    }
                }
            }

            // Transformar filas crudas en objetos de tarea de Nous
            // Consolidate rows by title/keyword
            const tasksMap = new Map();

            parsedData.rows.forEach(row => {
                const task: any = {
                    id: crypto.randomUUID(),
                    project_id: projectId, // Default fallback
                    status: 'idea', // default
                    created_at: new Date().toISOString()
                };

                for (const header of parsedData.headers) {
                    const targetField = mapping[header];
                    if (targetField && targetField !== 'ignore') {
                        let value = row[header];
                        if (!value) continue;

                        // Transformaciones de limpieza y Consolidación
                        if (targetField === 'volume' || targetField === 'target_word_count') {
                            const parsedNum = parseInt(String(value).replace(/\D/g, ''), 10) || 0;
                            if (task[targetField] !== undefined) {
                                task[targetField] = Math.max(task[targetField], parsedNum); // Usar el mayor en vez de sumar para no distorsionar
                            } else {
                                task[targetField] = parsedNum;
                            }
                        } else if (targetField === 'refs') {
                            const refsArray = String(value).split(/[\r\n,]+/).map((v: string) => v.trim()).filter((v: string) => v);
                            if (!task.refs) task.refs = [];
                            task.refs.push(...refsArray);
                        } else if (targetField === 'project_name') {
                            const pName = String(value).trim();
                            const matchedId = resolvedProjectsMapping[pName];
                            if (matchedId && matchedId !== 'NEW') {
                                task.project_id = matchedId;
                            }
                        } else if (targetField === 'status') {
                            const rawStatus = String(value).toLowerCase().trim().replace(/ /g, '_');
                            const validStatuses = ['idea', 'en_investigacion', 'por_redactar', 'en_redaccion', 'por_humanizar', 'por_corregir', 'por_revisar', 'por_maquetar', 'publicado'];
                            task[targetField] = validStatuses.includes(rawStatus) ? rawStatus : 'idea';
                        } else if (targetField === 'assigned_to') {
                            const memberNameOrEmail = String(value).trim();
                            if (resolvedMembersMapping[memberNameOrEmail]) {
                                task.assigned_to = resolvedMembersMapping[memberNameOrEmail];
                            }
                        } else if (targetField === 'layout_status') {
                            const strVal = String(value).toLowerCase().trim();
                            task[targetField] = ['true', 'yes', 'si', '1', 'verdadero'].includes(strVal);
                        } else if (targetField === 'lsi_keywords') {
                            task[targetField] = String(value).split(/[\r\n,]+/).map((v: string) => v.trim()).filter(Boolean);
                        } else if (['associated_url', 'brief', 'title', 'target_keyword', 'observaciones'].includes(targetField)) {
                            // Consolidar concatenando para campos de texto clave
                            if (task[targetField]) {
                                task[targetField] = `${task[targetField]}\n${String(value).trim()}`;
                            } else {
                                task[targetField] = String(value).trim();
                            }
                        } else if (targetField === 'scheduled_date') {
                            task[targetField] = parseSmartDate(value);
                        } else {
                            task[targetField] = value;
                        }
                    }
                }

                // Asegurar campos obligatorios
                if (!task.title && task.target_keyword) {
                    task.title = task.target_keyword;
                } else if (!task.title) {
                    task.title = "Nuevo Contenido Importado";
                }

                const key = (task.title || '').toLowerCase().trim();
                if (tasksMap.has(key)) {
                    const existing = tasksMap.get(key);
                    // Consolidate with existing row
                    if (task.target_word_count) existing.target_word_count = Math.max(existing.target_word_count || 0, task.target_word_count);
                    if (task.volume) existing.volume = Math.max(existing.volume || 0, task.volume);
                    if (task.refs) {
                        existing.refs = existing.refs || [];
                        existing.refs.push(...task.refs);
                        existing.refs = Array.from(new Set(existing.refs));
                    }
                    if (task.associated_url) existing.associated_url = existing.associated_url ? `${existing.associated_url}\n${task.associated_url}` : task.associated_url;
                    if (task.target_keyword && !existing.target_keyword?.includes(task.target_keyword)) {
                         existing.target_keyword = existing.target_keyword ? `${existing.target_keyword}, ${task.target_keyword}` : task.target_keyword;
                    }
                } else {
                    tasksMap.set(key, task);
                }
            });

            const tasksToImport = Array.from(tasksMap.values());

            // --- AUTO CREATE CUSTOM CONTENT TYPES ---
            try {
                const importedTypes = [...new Set(tasksToImport.map(t => typeof t.content_type === 'string' ? t.content_type.trim() : null).filter(Boolean))] as string[];
                const defaultTypes = ['Blog Post', 'Landing Transaccional', 'Review / Reseña', 'Guía Definitiva', 'Pilar Page'];
                
                if (importedTypes.length > 0) {
                    const { data: projectData } = await supabase.from('projects').select('settings').eq('id', projectId).single();
                    if (projectData) {
                        const currentCustomTypes: string[] = projectData.settings?.content_preferences?.custom_content_types || [];
                        const newTypes = importedTypes.filter(t => !defaultTypes.includes(t) && !currentCustomTypes.includes(t));
                        
                        if (newTypes.length > 0) {
                            const updatedCustomTypes = [...currentCustomTypes, ...newTypes];
                            const updatedSettings = {
                                ...(projectData.settings || {}),
                                content_preferences: {
                                    ...(projectData.settings?.content_preferences || {}),
                                    custom_content_types: updatedCustomTypes
                                }
                            };
                            await supabase.from('projects').update({ settings: updatedSettings }).eq('id', projectId);
                            console.log("Añadidos nuevos tipos de contenido desde CSV:", newTypes);
                        }
                    }
                }
            } catch (err) {
                console.error("Error auto-creando content types:", err);
            }
            // ----------------------------------------

            onImportComplete(tasksToImport);
            NotificationService.success("Importación exitosa", `Se procesaron ${tasksToImport.length} filas.`);
            onClose();

        } catch (error: any) {
            console.error("Import error:", error);
            NotificationService.error("Error al importar", error.message);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                            <FileSpreadsheet size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800">Carga Inteligente de CSV / Excel</h2>
                            <p className="text-xs text-slate-500">La IA mapeará automáticamente tus columnas al formato de Nous.</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {step === 'upload' && (
                        <div 
                            className="border-2 border-dashed border-indigo-100 bg-white rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input 
                                type="file" 
                                className="hidden" 
                                accept=".csv, .xls, .xlsx" 
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />
                            <div className="h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-500 mb-4">
                                <Upload size={28} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-700 mb-2">Haz clic para subir un archivo</h3>
                            <p className="text-sm text-slate-500 max-w-sm">Sube tu Excel o CSV. No importa cómo se llamen tus columnas, la Inteligencia Artificial deducirá dónde va cada dato leyendo las primeras filas.</p>
                        </div>
                    )}

                    {step === 'analyzing' && (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                            <Loader2 size={40} className="text-indigo-500 animate-spin mb-6" />
                            <h3 className="text-xl font-bold text-slate-700 mb-2">Analizando la estructura...</h3>
                            <p className="text-slate-500">Gemini 3.5 Flash está analizando tus encabezados y contenido para encontrar la mejor coincidencia.</p>
                        </div>
                    )}

                    {step === 'mapping' && parsedData && (
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-slate-100 bg-amber-50/50 flex items-start gap-3">
                                <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-amber-800">Revisa la propuesta de la IA</h4>
                                    <p className="text-xs text-amber-700">Asegúrate de que los campos que necesitas (como Título o Keyword) apunten al lugar correcto. Si no quieres importar una columna, déjala en "-- Ignorar esta columna --".</p>
                                </div>
                            </div>
                            
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                                    <tr>
                                        <th className="px-6 py-4 w-1/3">Tu Columna (Excel)</th>
                                        <th className="px-6 py-4 w-1/6 text-center"></th>
                                        <th className="px-6 py-4 w-1/2">Campo en Nous</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {parsedData.headers.map((header, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-800 mb-1">{header}</div>
                                                <div className="text-xs text-slate-400 font-mono truncate max-w-[200px]">
                                                    Ej: {String(parsedData.rows[0]?.[header] || 'N/A').slice(0, 30)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <ArrowRight size={16} className="text-slate-300 mx-auto" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <select 
                                                    value={mapping[header] || 'ignore'}
                                                    onChange={(e) => handleMappingChange(header, e.target.value)}
                                                    className={`w-full p-2.5 rounded-xl border ${mapping[header] && mapping[header] !== 'ignore' ? 'border-indigo-300 bg-indigo-50/30 text-indigo-800 font-medium' : 'border-slate-200 bg-slate-50 text-slate-600'} text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all`}
                                                >
                                                    {NOUS_FIELDS.map(f => (
                                                        <option key={f.value} value={f.value}>{f.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step === 'mapping' && (
                    <div className="p-6 border-t border-slate-100 bg-white flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm text-slate-500 font-medium">
                                {parsedData?.rows.length} filas listas para importar
                            </span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={autoCreateMembers}
                                    onChange={(e) => setAutoCreateMembers(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-xs text-slate-600 font-medium">Crear miembros faltantes</span>
                            </label>
                        </div>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={() => setStep('upload')}
                                disabled={isImporting}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
                            >
                                Volver
                            </button>
                            <button 
                                onClick={handleConfirmImport}
                                disabled={isImporting}
                                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-200"
                            >
                                {isImporting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                Confirmar e Importar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
