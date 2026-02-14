"use client";

import { NavigationHeader } from "@/components/dom/NavigationHeader";
import { Background2D } from "@/components/Background2D/Background2D";
import { motion } from "framer-motion";
import { Monitor, Clock, Database, Search, Users, Download, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/utils/cn";

function FeatureCard(props: { icon: React.ReactNode, title: string, description: string, delay: number }) {
    const { icon, title, description, delay } = props;
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay }}
            className="group p-8 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 hover:bg-slate-900/60 transition-all duration-300"
        >
            <div className="mb-6 p-4 rounded-xl bg-slate-950 inline-block border border-slate-800 group-hover:border-slate-700 transition-colors">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                {title}
            </h3>
            <p className="text-slate-400 leading-relaxed text-sm">
                {description}
            </p>
        </motion.div>
    );
}

export default function DesktopAppPage() {
    return (
        <main className="relative min-h-screen bg-slate-950 overflow-x-hidden selection:bg-cyan-500/30 selection:text-cyan-200">
            {/* Background elements */}
            <div className="fixed inset-0 z-0">
                <Background2D />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-slate-950/80 to-slate-950 pointer-events-none" />
            </div>

            <NavigationHeader />

            <div className="relative z-10 pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto">

                {/* Hero Section */}
                <section className="flex flex-col items-center text-center mb-32">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-8"
                    >
                        <Monitor size={14} />
                        Nous Desktop v1.0
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.1 }}
                        className="text-5xl md:text-7xl font-black text-white tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/60"
                    >
                        El Centro de Comando<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Definitivo</span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed"
                    >
                        Potencia tu flujo de trabajo con la aplicación de escritorio nativa.
                        Gestión de tiempo, análisis de datos y navegación inteligente en una interfaz unificada.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="flex flex-col sm:flex-row gap-4"
                    >
                        <button className="group relative px-8 py-4 bg-white text-slate-950 rounded-xl font-bold text-sm tracking-wide flex items-center gap-3 hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                            <Download size={18} />
                            DESCARGAR PARA WINDOWS
                            <span className="absolute -top-2 -right-2 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500"></span>
                            </span>
                        </button>
                        <button className="px-8 py-4 bg-slate-900 border border-slate-800 text-slate-300 rounded-xl font-bold text-sm tracking-wide flex items-center gap-3 hover:bg-slate-800 hover:text-white transition-all">
                            DOCUMENTACIÓN
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                </section>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-32">
                    {/* Feature 1: Time & Task */}
                    <FeatureCard
                        icon={<Clock className="text-cyan-400" size={32} />}
                        title="Gestión de Tiempo y Tareas"
                        description="Seguimiento preciso de tu productividad con un gestor de tareas integrado. Optimiza tu flujo de trabajo diario."
                        delay={0.5}
                    />

                    {/* Feature 2: Scraping */}
                    <FeatureCard
                        icon={<Database className="text-purple-400" size={32} />}
                        title="Análisis de Datos y Scraping"
                        description="Extrae y procesa información de la web automáticamente con nuestras herramientas de scraping avanzadas."
                        delay={0.6}
                    />

                    {/* Feature 3: Web Search */}
                    <FeatureCard
                        icon={<Search className="text-blue-400" size={32} />}
                        title="Navegación Inteligente"
                        description="Búsqueda web integrada y navegación optimizada para investigación y desarrollo."
                        delay={0.7}
                    />
                </div>

                {/* Live Office Placeholder */}
                <motion.section
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/50 backdrop-blur-sm p-8 md:p-16 text-center"
                >
                    <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-6">
                            <Users className="text-slate-400" size={32} />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Oficina Virtual en Vivo</h2>
                        <p className="text-slate-400 max-w-lg mx-auto mb-8">
                            Colabora en tiempo real con tu equipo en un entorno virtual inmersivo.
                            Impulsado por LiveKit.
                        </p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 text-slate-400 text-sm font-medium">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            Próximamente
                        </div>
                    </div>
                </motion.section>

            </div>
        </main>
    );
}
