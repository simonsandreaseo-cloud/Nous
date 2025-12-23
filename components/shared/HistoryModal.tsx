import React, { useEffect, useState } from 'react';
import { VersioningService, HistoryVersion } from '../../lib/VersioningService';
import { styles } from '../tools/ContentWriter2/styles'; // Reusing styles for consistency
import { LoadingSpinner, IconRefresh, IconCheck, IconTrash } from '../tools/ContentWriter2/components';

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    resourceType: string;
    resourceId: string | number;
    onRestore: (content: any) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({
    isOpen,
    onClose,
    resourceType,
    resourceId,
    onRestore
}) => {
    const [history, setHistory] = useState<HistoryVersion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && resourceId) {
            loadHistory();
        }
    }, [isOpen, resourceId]);

    const loadHistory = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await VersioningService.getHistory(resourceType, resourceId);
            setHistory(data);
        } catch (err: any) {
            setError(err.message || "Error al cargar historial");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.75)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '32px',
                borderRadius: '24px',
                width: '600px',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                border: '1px solid #E2E8F0'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px'
                }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: '22px',
                        fontFamily: 'Outfit, sans-serif',
                        fontWeight: 800,
                        color: '#1E293B'
                    }}>
                        Historial de Versiones
                    </h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94A3B8',
                            fontSize: '24px'
                        }}
                    >
                        ×
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                            <LoadingSpinner />
                        </div>
                    ) : error ? (
                        <div style={{ color: '#EF4444', textAlign: 'center', padding: '20px' }}>
                            {error}
                        </div>
                    ) : history.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
                            No hay versiones guardadas para este elemento.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {history.map((v) => (
                                <div
                                    key={v.id}
                                    style={{
                                        padding: '16px',
                                        borderRadius: '16px',
                                        border: '1px solid #F1F5F9',
                                        backgroundColor: '#F8FAFC',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        transition: 'all 0.2s',
                                        cursor: 'default'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#334155', fontSize: '14px' }}>
                                            {v.version_label || (v.is_autosave ? 'Auto-guardado' : 'Versión manual')}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
                                            {new Date(v.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (confirm("¿Estás seguro de que deseas restaurar esta versión? Se perderán los cambios no guardados en la versión actual.")) {
                                                onRestore(v.content);
                                                onClose();
                                            }
                                        }}
                                        style={{
                                            ...styles.button,
                                            padding: '8px 16px',
                                            fontSize: '12px',
                                            backgroundColor: '#6366F1',
                                            color: 'white',
                                            border: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px'
                                        } as any}
                                    >
                                        <IconRefresh /> Restaurar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            ...styles.button,
                            padding: '10px 20px',
                            backgroundColor: '#F1F5F9',
                            color: '#475569',
                            border: 'none',
                            fontWeight: 600
                        } as any}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HistoryModal;
