"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Download, Zap, Shield, Blocks, ArrowRight, Check } from "lucide-react";
import { useState, useRef } from "react";
import ParticleBackground from "./components/ParticleBackground";
import FeatureCard from "./components/FeatureCard";
import TutorialStep from "./components/TutorialStep";
import DownloadButton from "./components/DownloadButton";

export default function MaquetadoresPage() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });

    const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
    const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

    const features = [
        {
            icon: Zap,
            title: "Distribución Automática",
            description: "Publica tu contenido enriquecido desde Nous directamente a WordPress con un solo clic. Sin copiar y pegar."
        },
        {
            icon: Shield,
            title: "Autenticación Segura",
            description: "Sistema de tokens personalizado que garantiza que solo tus proyectos autorizados puedan publicar contenido."
        },
        {
            icon: Blocks,
            title: "Bloques Gutenberg Nativos",
            description: "El contenido se mapea automáticamente a bloques editables de WordPress para máxima flexibilidad post-publicación."
        }
    ];

    const tutorialSteps = [
        {
            title: "Instala el Plugin",
            description: "Descarga el archivo ZIP y súbelo a tu WordPress desde Plugins > Añadir nuevo > Subir plugin.",
            code: `// Ruta en WordPress
wp-content/plugins/nous-bridge/`
        },
        {
            title: "Configura el Token",
            description: "Ve a Ajustes > Nous Bridge en tu panel de WordPress y genera un token de seguridad único.",
            code: `// Ejemplo de token
nous_bridge_token: "sk_live_abc123xyz789"`
        },
        {
            title: "Conecta tu Proyecto",
            description: "En Nous, ve a Configuración del Proyecto y añade la URL de tu sitio WordPress y el token que generaste.",
            code: `// Configuración en Nous
WP URL: https://tusitio.com
Token: sk_live_abc123xyz789`
        },
        {
            title: "¡Publica Contenido!",
            description: "Desde el Redactor IA, haz clic en 'Distribuir a WordPress' y tu artículo se publicará como borrador automáticamente.",
            code: `// El contenido incluye:
- Título y contenido HTML
- Imágenes subidas a Media Library
- Bloques Gutenberg mapeados`
        }
    ];

    return (
        <div ref={containerRef} className="relative min-h-screen bg-[#0A0E1A] text-white overflow-hidden">
            <ParticleBackground />

            {/* Hero Section */}
            <motion.section
                style={{ opacity: heroOpacity, scale: heroScale }}
                className="relative min-h-screen flex items-center justify-center px-6"
            >
                <div className="max-w-5xl mx-auto text-center z-10">
                    {/* Animated Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-8"
                    >
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-xs font-black uppercase tracking-widest text-cyan-400">Nous Bridge Plugin</span>
                    </motion.div>

                    {/* Main Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-6xl md:text-8xl font-black tracking-tighter mb-6 leading-none"
                    >
                        <span className="bg-gradient-to-r from-white via-cyan-200 to-cyan-400 bg-clip-text text-transparent">
                            Maquetación
                        </span>
                        <br />
                        <span className="text-white">Automática en WordPress</span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-xl md:text-2xl text-slate-400 mb-12 max-w-3xl mx-auto font-light"
                    >
                        Conecta Nous con tu sitio WordPress y publica contenido enriquecido con imágenes, bloques Gutenberg y SEO optimizado en segundos.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                    >
                        <DownloadButton />
                        <a
                            href="#tutorial"
                            className="group px-8 py-4 rounded-2xl border-2 border-slate-700 hover:border-cyan-500 transition-all duration-300 flex items-center gap-2 font-bold"
                        >
                            Ver Tutorial
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </a>
                    </motion.div>

                    {/* Scroll Indicator */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 1.2 }}
                        className="absolute bottom-12 left-1/2 -translate-x-1/2"
                    >
                        <div className="w-6 h-10 rounded-full border-2 border-slate-700 flex items-start justify-center p-2">
                            <motion.div
                                animate={{ y: [0, 12, 0] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                            />
                        </div>
                    </motion.div>
                </div>

                {/* Gradient Orbs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </motion.section>

            {/* Value Proposition Section */}
            <section className="relative py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-6">
                            <span className="text-cyan-400">Tres Pilares</span> de Eficiencia
                        </h2>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                            Nous Bridge elimina la fricción entre la creación de contenido y su publicación en WordPress.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {features.map((feature, index) => (
                            <FeatureCard
                                key={index}
                                icon={feature.icon}
                                title={feature.title}
                                description={feature.description}
                                index={index}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* Tutorial Section */}
            <section id="tutorial" className="relative py-32 px-6 bg-gradient-to-b from-transparent via-slate-900/20 to-transparent">
                <div className="max-w-5xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-5xl md:text-6xl font-black tracking-tighter mb-6">
                            Configuración en <span className="text-cyan-400">4 Pasos</span>
                        </h2>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                            Desde la instalación hasta tu primera publicación en menos de 5 minutos.
                        </p>
                    </motion.div>

                    <div className="space-y-12">
                        {tutorialSteps.map((step, index) => (
                            <TutorialStep
                                key={index}
                                stepNumber={index + 1}
                                title={step.title}
                                description={step.description}
                                code={step.code}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* Download Section */}
            <section className="relative py-32 px-6">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="relative p-12 rounded-3xl bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/50 backdrop-blur-xl overflow-hidden"
                    >
                        {/* Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                                    <Download className="w-8 h-8 text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black tracking-tight">Nous Bridge Plugin</h3>
                                    <p className="text-slate-400">Versión 1.0.0 • Compatible con WordPress 5.8+</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold">REST API Segura</p>
                                        <p className="text-sm text-slate-400">Autenticación por token personalizado</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold">Media Library Integration</p>
                                        <p className="text-sm text-slate-400">Subida automática de imágenes</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold">Gutenberg Blocks</p>
                                        <p className="text-sm text-slate-400">Mapeo nativo de bloques editables</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="w-5 h-5 text-cyan-400 mt-1 flex-shrink-0" />
                                    <div>
                                        <p className="font-bold">Zero Dependencies</p>
                                        <p className="text-sm text-slate-400">Solo requiere WordPress core</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <DownloadButton variant="primary" />
                                <a
                                    href="https://github.com/nous-clinical/nous-bridge"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-8 py-4 rounded-2xl border-2 border-slate-700 hover:border-cyan-500 transition-all duration-300 flex items-center justify-center gap-2 font-bold"
                                >
                                    Ver en GitHub
                                    <ArrowRight className="w-5 h-5" />
                                </a>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="relative py-12 px-6 border-t border-slate-800">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-center md:text-left">
                        <p className="text-slate-400 text-sm">
                            © 2026 Nous Clinical Tech. Powered by Antigravity AI.
                        </p>
                    </div>
                    <div className="flex gap-6">
                        <a href="/docs" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm font-medium">
                            Documentación
                        </a>
                        <a href="/support" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm font-medium">
                            Soporte
                        </a>
                        <a href="/changelog" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm font-medium">
                            Changelog
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
