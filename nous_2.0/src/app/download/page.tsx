"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Download, Monitor, Shield, Cpu, Zap, ArrowLeft, Globe, HardDrive } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { NousOrb } from '@/components/canvas/NousOrb';

const SceneLayout = dynamic(
    () => import("@/components/canvas/SceneLayout"),
    { ssr: false }
);

export default function DownloadPage() {
    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans relative overflow-hidden">
            {/* Ambient background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white" />

            {/* 3D Visual Element */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
                <SceneLayout>
                    <group position={[0, -1, -5]} scale={2}>
                        <NousOrb />
                    </group>
                </SceneLayout>
            </div>

            {/* Header */}
            <header className="relative z-10 p-8 flex justify-between items-center max-w-7xl mx-auto w-full">
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-xs group-hover:scale-110 transition-transform">N</div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-900 transition-colors">Volver al inicio</span>
                </Link>
                <div className="text-[10px] font-mono text-slate-300">v0.1.0-STABLE</div>
            </header>

            <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-24">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    {/* Left: Content */}
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-6 shadow-xl shadow-blue-200">
                                <Monitor className="text-white" size={24} />
                            </div>
                            <h1 className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight mb-6">
                                Potencia Neural <br />
                                <span className="text-blue-600">En Tu Escritorio</span>
                            </h1>
                            <p className="text-lg text-slate-500 font-light mb-10 leading-relaxed max-w-md">
                                Descarga el motor local de Nous para ejecutar procesos de IA, rastreadores y refinería de datos con velocidad nativa y 100% privacidad.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <a 
                                    href="/nous-local-setup.exe"
                                    className="flex items-center justify-center gap-3 bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-lg font-bold transition-all shadow-2xl hover:scale-[1.02]"
                                >
                                    <Download size={20} />
                                    Descargar para Windows
                                </a>
                                <a 
                                    href="#" 
                                    className="flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-600 px-8 py-4 rounded-lg font-bold hover:bg-slate-50 transition-all opacity-50 cursor-not-allowed"
                                >
                                    <Globe size={20} />
                                    macOS (Próximamente)
                                </a>
                            </div>
                            <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Shield size={12} className="text-emerald-500" /> Instalador firmado y verificado
                            </p>
                        </motion.div>
                    </div>

                    {/* Right: Features Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FeatureCard 
                            icon={<Zap size={20} className="text-amber-500" />}
                            title="Zero-Lag IA"
                            desc="Ejecuta modelos LLM localmente sin latencia de red."
                            delay={0.2}
                        />
                        <FeatureCard 
                            icon={<HardDrive size={20} className="text-blue-500" />}
                            title="Privacidad Total"
                            desc="Tus datos nunca salen de tu máquina durante el procesamiento."
                            delay={0.3}
                        />
                        <FeatureCard 
                            icon={<Cpu size={20} className="text-purple-500" />}
                            title="Nativo AVX2"
                            desc="Optimizado para procesadores Intel y AMD modernos."
                            delay={0.4}
                        />
                        <FeatureCard 
                            icon={<Shield size={20} className="text-emerald-500" />}
                            title="Uplink Seguro"
                            desc="Puente cifrado entre tu navegador y el motor de escritorio."
                            delay={0.5}
                        />
                    </div>
                </div>

                {/* Requirements Section */}
                <motion.div 
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.6 }}
                    className="mt-24 pt-12 border-t border-slate-100"
                >
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em] mb-8 text-center">Requisitos del Sistema</h3>
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16">
                        <Requirement text="Windows 10/11 64-bit" />
                        <Requirement text="16GB RAM (Mínimo)" />
                        <Requirement text="8GB Espacio en Disco" />
                        <Requirement text="CPU con AVX2" />
                    </div>
                </motion.div>
            </main>

            {/* Footer Branding */}
            <div className="absolute bottom-10 left-10 flex items-center gap-3 opacity-20 select-none grayscale invisible md:visible">
                <div className="w-8 h-8 rounded-lg bg-slate-900" />
                <span className="text-sm font-bold tracking-widest text-slate-900 uppercase">Nous Clinical Technology</span>
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, desc, delay }: { icon: React.ReactNode, title: string, desc: string, delay: number }) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay }}
            className="bg-white/50 backdrop-blur-sm border border-slate-100 p-6 rounded-lg hover:border-blue-100 hover:shadow-xl hover:shadow-blue-50/50 transition-all group"
        >
            <div className="w-10 h-10 rounded-md bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h4 className="font-bold text-slate-900 mb-2">{title}</h4>
            <p className="text-xs text-slate-500 leading-relaxed font-light">{desc}</p>
        </motion.div>
    );
}

function Requirement({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-xs font-bold text-slate-600">{text}</span>
        </div>
    );
}
