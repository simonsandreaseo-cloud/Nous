import React, { useState, useRef } from 'react';
import { Upload, FileUp } from 'lucide-react';
import { styles } from '../styles';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (content: string) => void;
}

export const UploadContentModal = ({ isOpen, onClose, onSave }: UploadModalProps) => {
    const [text, setText] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => setText(ev.target?.result as string || '');
        reader.readAsText(file);
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <div style={{ backgroundColor: 'white', padding: '32px', borderRadius: '20px', width: '600px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px', fontFamily: 'Outfit, sans-serif', fontWeight: 800 }}>
                        <FileUp /> Cargar Artículo Existente
                    </h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}>✕</button>
                </div>
                <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px', lineHeight: '1.5' }}>
                    Pega el contenido HTML/Texto de tu artículo o sube un archivo (.html, .txt, .md).
                </p>

                <div style={{ marginBottom: '16px', display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        style={{ ...styles.button, backgroundColor: '#F1F5F9', color: '#475569' } as any}
                    >
                        <Upload size={16} /> Subir Archivo
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept=".html,.txt,.md"
                        onChange={handleFile}
                    />
                </div>

                <textarea
                    style={{
                        width: '100%',
                        padding: '16px',
                        fontSize: '13px',
                        borderRadius: '12px',
                        border: '2px solid #F1F5F9',
                        outline: 'none',
                        backgroundColor: '#F8FAFC',
                        color: '#0F172A',
                        marginBottom: '24px',
                        height: '300px',
                        fontFamily: 'monospace',
                        transition: 'border-color 0.2s',
                        resize: 'none'
                    }}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="<h1>Título...</h1><p>Contenido...</p>"
                />
                <div style={{ display: 'flex', justifyContent: 'end', gap: '12px' }}>
                    <button style={{ ...styles.button, padding: '12px 20px' } as any} onClick={onClose}>Cancelar</button>
                    <button
                        style={{ ...styles.button, backgroundColor: '#6366F1', color: 'white', border: 'none', padding: '12px 24px', fontWeight: 700 } as any}
                        onClick={() => onSave(text)}
                        disabled={!text.trim()}
                    >
                        Cargar al Editor
                    </button>
                </div>
            </div>
        </div>
    );
};
