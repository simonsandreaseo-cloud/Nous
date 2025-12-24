import React from 'react';
import { motion } from 'framer-motion';
import { Download, Shield, Zap, Clock, MousePointer2, LayoutDashboard } from 'lucide-react';
import { ANIMATION_CONFIG } from '../../constants';

const TimeTrackerPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-brand-white pt-24 pb-20">
            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-32">
                <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={ANIMATION_CONFIG.transition}
                >
                    <span className="inline-block px-4 py-1 rounded-full bg-brand-accent/20 text-brand-power text-xs font-bold uppercase tracking-widest mb-6">
                        Nueva Herramienta Lab
                    </span>
                    <h1 className="text-5xl md:text-7xl font-bold text-brand-power mb-8 leading-tight">
                        Seguimiento <span className="text-brand-accent">Inteligente</span> y Ético.
                    </h1>
                    <p className="text-xl text-brand-power/70 mb-10 max-w-lg leading-relaxed">
                        Controla tu tiempo sin sacrificar tu privacidad. Una App de escritorio diseñada para equipos de alto rendimiento que valoran la transparencia.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <motion.a
                            href="/Tracker-Portable.zip"
                            download
                            className="bg-brand-power text-brand-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-brand-accent hover:text-brand-power transition-all group shadow-xl hover:shadow-2xl"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Download className="w-5 h-5 group-hover:bounce" />
                            Descargar para Windows
                        </motion.a>
                        <a
                            href="#features"
                            className="border-2 border-brand-soft bg-brand-soft/30 text-brand-power px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-brand-soft/50 transition-all"
                        >
                            Ver Características
                        </a>
                    </div>
                    <p className="mt-4 text-xs text-brand-power/40">
                        Versión 0.1.0 Beta • Disponible para Windows 10/11
                    </p>
                </motion.div>

                {/* App Mockup Representation */}
                <motion.div
                    className="relative"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ ...ANIMATION_CONFIG.transition, delay: 0.2 }}
                >
                    <div className="relative z-10 bg-gray-900 rounded-2xl shadow-2xl p-6 border border-white/10 overflow-hidden aspect-[4/3] flex flex-col items-center justify-center">
                        <div className="absolute top-0 left-0 w-full h-8 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500/50" />
                            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                            <div className="w-2 h-2 rounded-full bg-green-500/50" />
                        </div>

                        <div className="text-center">
                            <Clock className="w-16 h-16 text-brand-accent mb-4 mx-auto opacity-50" />
                            <div className="text-6xl font-mono font-bold text-white mb-8 tracking-tighter">
                                02:45:10
                            </div>
                            <div className="bg-brand-accent text-brand-power px-8 py-3 rounded-full font-black text-lg shadow-lg shadow-brand-accent/20">
                                STOP TRACKING
                            </div>
                        </div>

                        {/* Blurred Screenshot Preview */}
                        <div className="absolute bottom-6 left-6 right-6 h-20 bg-white/5 rounded-lg overflow-hidden flex items-center px-4 gap-4">
                            <div className="w-12 h-12 bg-white/10 rounded overflow-hidden blur-[2px]">
                                <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-purple-500/20" />
                            </div>
                            <div className="flex-1">
                                <div className="h-2 w-24 bg-white/20 rounded mb-2" />
                                <div className="h-1.5 w-40 bg-white/10 rounded" />
                            </div>
                            <Shield className="w-5 h-5 text-green-400" />
                        </div>
                    </div>
                    <div className="absolute -inset-4 bg-brand-accent/20 blur-[60px] rounded-full -z-10 animate-pulse" />
                </motion.div>
            </section>

            {/* Values / Features */}
            <section id="features" className="bg-brand-soft py-32">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl font-bold text-brand-power mb-4">¿Por qué usar nuestro Tracker?</h2>
                        <p className="text-brand-power/60 max-w-2xl mx-auto">Diseñado bajo la filosofía de "Privacidad Primero". No vigilamos al empleado, registramos el valor aportado.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <Shield className="w-8 h-8 text-brand-accent" />,
                                title: "Privacidad con Blur",
                                desc: "Nuestro motor aplica un desenfoque automático a las capturas antes de que salgan de tu ordenador. Nadie verá tus contraseñas o datos personales."
                            },
                            {
                                icon: <Zap className="w-8 h-8 text-brand-accent" />,
                                title: "Modo Inteligente",
                                desc: "Detecta automáticamente el proyecto en el que estás trabajando según la ventana activa y tu navegación. Carga tu tiempo sin clics manuales."
                            },
                            {
                                icon: <LayoutDashboard className="w-8 h-8 text-brand-accent" />,
                                title: "Dashboard Unificado",
                                desc: "Toda la actividad se sincroniza con tu panel web de Simón Sandrea SEO, permitiendo ver KPIs de productividad en tiempo real."
                            },
                            {
                                icon: <MousePointer2 className="w-8 h-8 text-brand-accent" />,
                                title: "Medición de Actividad",
                                desc: "Calculamos el porcentaje de actividad basándonos en la frecuencia de teclado y ratón, sin registrar NUNCA qué escribes."
                            },
                            {
                                icon: <Download className="w-8 h-8 text-brand-accent" />,
                                title: "Sincronización Offline",
                                desc: "¿Sin internet? No hay problema. La app guarda localmente y sincroniza cuando detecta conexión estable."
                            }
                        ].map((feature, idx) => (
                            <motion.div
                                key={idx}
                                className="bg-brand-white p-8 rounded-2xl shadow-sm border border-brand-white hover:border-brand-accent/30 transition-all group"
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <div className="mb-6 group-hover:scale-110 transition-transform">{feature.icon}</div>
                                <h3 className="text-xl font-bold text-brand-power mb-3">{feature.title}</h3>
                                <p className="text-brand-power/60 leading-relaxed text-sm">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-32 text-center max-w-4xl mx-auto px-6">
                <h2 className="text-4xl font-bold text-brand-power mb-8">¿Listo para escalar tu productividad?</h2>
                <p className="text-xl text-brand-power/60 mb-12">
                    Únete a los equipos que han dejado de adivinar sus horas y han empezado a medirlas con precisión técnica.
                </p>
                <div className="inline-flex items-center gap-4 bg-brand-white p-2 rounded-2xl shadow-xl border border-brand-soft">
                    <span className="px-6 py-3 font-bold text-brand-power">v0.1.0 Beta</span>
                    <a
                        href="/Tracker-Portable.zip"
                        download
                        className="bg-brand-power text-brand-white px-10 py-4 rounded-xl font-bold hover:bg-brand-accent hover:text-brand-power transition-all shadow-lg block"
                    >
                        Comenzar Descarga
                    </a>
                </div>
            </section>
        </div>
    );
};

export default TimeTrackerPage;
