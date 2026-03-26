"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { HomeHeader } from "@/components/home/HomeHeader";

const plans = [
    {
        name: "Starter",
        price: "$0",
        period: "Para siempre",
        description: "Para probar el ecosistema con uso limitado y descubrir el poder de Nous.",
        features: [
            { name: "10,000 Tokens IA mensuales", included: true },
            { name: "Redactor IA (Conexión LLM Local)", included: true },
            { name: "1 Proyecto activo", included: true },
            { name: "SEO On Page Básico", included: true },
            { name: "Automatización Nous Bridge WP", included: false },
            { name: "BlogViz AI (Generador de Imágenes)", included: false },
            { name: "Refinería IA (Humanizador 0%)", included: false },
            { name: "Auditoría Helios IA", included: false },
        ],
        ctaText: "Empezar Gratis",
        ctaVariant: "outline"
    },
    {
        name: "Pro",
        price: "$29",
        period: "por usuario / mes",
        description: "La suite completa para creadores de contenido y especialistas SEO.",
        features: [
            { name: "500,000 Tokens IA mensuales", included: true },
            { name: "Redactor IA Local Ilimitado", included: true },
            { name: "Hasta 5 Proyectos activos", included: true },
            { name: "Refinería IA (Humanizador 0%)", included: true },
            { name: "Automatización Nous Bridge WP", included: true },
            { name: "BlogViz AI (Generador de Imágenes)", included: true },
            { name: "Informes IA (Deep Report Generator)", included: true },
            { name: "Gestión de Múltiples Equipos (Oficina)", included: false },
        ],
        ctaText: "Prueba 14 Días Gratis",
        ctaVariant: "gradient",
        popular: true
    },
    {
        name: "Agency",
        price: "$99",
        period: "por equipo / mes",
        description: "Máxima potencia corporativa con gestión de equipos y límites amplios.",
        features: [
            { name: "2,000,000 Tokens IA mensuales", included: true },
            { name: "Proyectos Ilimitados", included: true },
            { name: "Gestión de Equipos (Oficina)", included: true },
            { name: "Auditoría Neural Profunda (Helios IA)", included: true },
            { name: "Reportes SEO Marca Blanca", included: true },
            { name: "Automatización y Distribución Max", included: true },
            { name: "Modelos Locales Exclusivos (Tauri)", included: true },
            { name: "Soporte Técnico Prioritario", included: true },
        ],
        ctaText: "Contactar a Ventas",
        ctaVariant: "solid"
    }
];

export default function PricingPage() {
    return (
        <main className="relative w-full min-h-screen bg-[url('/Fondo_Nous.webp')] bg-cover bg-center bg-no-repeat selection:bg-blue-100 flex flex-col">
            <HomeHeader />

            <div className="flex-1 w-full max-w-7xl mx-auto px-6 md:px-12 pt-36 pb-24 z-10 flex flex-col items-center justify-center">
                
                <div className="text-center max-w-3xl mb-16">
                    <h1 className="text-4xl md:text-5xl font-medium text-slate-900 tracking-tight mb-6">
                        Elige tu ecosistema SEO
                    </h1>
                    <p className="text-lg text-slate-600">
                        Potencia tu flujo de trabajo desde un solo redactor hasta el corazón neuronal de tu agencia de marketing.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
                    {plans.map((plan, idx) => (
                        <div 
                            key={plan.name} 
                            className={`relative rounded-3xl p-8 bg-white/70 backdrop-blur-xl border flex flex-col transition-all duration-300 ${
                                plan.popular ? 'border-sky-300 shadow-[0_8px_30px_-5px_rgba(56,189,248,0.3)] scale-105 z-10' : 'border-slate-200/60 shadow-lg'
                            }`}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 right-8 -translate-y-1/2 bg-gradient-to-r from-cyan-400 to-blue-500 text-white text-xs font-bold uppercase tracking-wider py-1.5 px-4 rounded-full">
                                    Recomendado
                                </div>
                            )}
                            
                            <h3 className="text-xl font-semibold text-slate-800 mb-2">{plan.name}</h3>
                            <div className="flex items-end gap-2 mb-4">
                                <span className="text-5xl font-bold text-slate-900 tracking-tighter">{plan.price}</span>
                                <span className="text-sm font-medium text-slate-500 mb-1">{plan.period}</span>
                            </div>
                            
                            <p className="text-sm text-slate-600 mb-8 border-b border-slate-200/50 pb-8">
                                {plan.description}
                            </p>

                            <ul className="space-y-4 mb-10 flex-1">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex flex-start gap-4">
                                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${feature.included ? 'bg-cyan-100/50' : ''}`}>
                                            {feature.included ? (
                                                <Check size={14} className="text-cyan-600" />
                                            ) : (
                                                <X size={14} className="text-slate-300" />
                                            )}
                                        </div>
                                        <span className={`text-sm ${feature.included ? 'text-slate-700' : 'text-slate-400 decoration-slate-300'}`}>
                                            {feature.name}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <Link
                                href="/auth"
                                className={`w-full py-3.5 rounded-full text-center text-sm font-bold tracking-wide transition-all ${
                                    plan.ctaVariant === 'gradient'
                                        ? 'bg-gradient-to-r from-[#62cff4] to-[#3b82f6] text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                                        : plan.ctaVariant === 'solid'
                                            ? 'bg-slate-900 text-white hover:bg-slate-800'
                                            : 'bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                {plan.ctaText}
                            </Link>
                        </div>
                    ))}
                </div>

            </div>
        </main>
    );
}
