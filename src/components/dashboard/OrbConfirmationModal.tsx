"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Search,
    Sparkles,
    Zap,
    Globe,
    RotateCcw,
    AlertTriangle,
    Coins,
    CheckCircle2,
    Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/utils/cn";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OrbPipelinePlan {
    /** Tasks that will be researched (status=idea, no research yet) */
    toResearch: { id: string; title: string }[];
    /** Tasks that need an outline generated */
    toOutline: { id: string; title: string }[];
    /** Tasks that will be drafted for the first time (no content in DB) */
    toDraft: { id: string; title: string }[];
    /** Tasks with existing content that will be REWRITTEN (manual override) */
    toRewrite: { id: string; title: string }[];
    /** Tasks that will be humanized */
    toHumanize: { id: string; title: string }[];
    /** How many translation languages are configured */
    translateLanguages: number;
    /** Total tasks that will be translated */
    toTranslate: { id: string; title: string }[];
    /** Whether image generation is enabled in the pipeline */
    generateImages: boolean;
}

// ─── Credit Rates (informational only — no backend deduction yet) ────────────

const CREDIT_RATES = {
    research: 20,
    outline: 5,
    draft: 10,
    rewrite: 10,
    humanize: 15,
    translate: 5,   // per language
    image: 12,
} as const;

function computeTotalCredits(plan: OrbPipelinePlan): number {
    return (
        plan.toResearch.length * CREDIT_RATES.research +
        plan.toOutline.length * CREDIT_RATES.outline +
        plan.toDraft.length * CREDIT_RATES.draft +
        plan.toRewrite.length * CREDIT_RATES.rewrite +
        plan.toHumanize.length * CREDIT_RATES.humanize +
        plan.toTranslate.length * plan.translateLanguages * CREDIT_RATES.translate +
        (plan.generateImages ? plan.toDraft.length * CREDIT_RATES.image : 0)
    );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface ActionRowProps {
    icon: React.ElementType;
    label: string;
    count: number;
    color: "indigo" | "rose" | "amber" | "emerald" | "purple" | "cyan";
    credits?: number;
    badge?: string;
}

function ActionRow({ icon: Icon, label, count, color, credits, badge }: ActionRowProps) {
    const colorMap: Record<string, string> = {
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
        rose:   "bg-rose-50   text-rose-600   border-rose-100",
        amber:  "bg-amber-50  text-amber-600  border-amber-100",
        emerald:"bg-emerald-50 text-emerald-600 border-emerald-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
        cyan:   "bg-cyan-50   text-cyan-600   border-cyan-100",
    };

    return (
        <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center border shrink-0", colorMap[color])}>
                <Icon size={15} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 leading-none">
                        {label}
                    </span>
                    {badge && (
                        <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 border border-amber-200">
                            {badge}
                        </span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                {credits !== undefined && credits > 0 && (
                    <span className="text-[9px] font-bold text-slate-400 tabular-nums">
                        {credits} cr.
                    </span>
                )}
                <span className={cn(
                    "text-[13px] font-black tabular-nums px-2 py-0.5 rounded-lg",
                    colorMap[color]
                )}>
                    ×{count}
                </span>
            </div>
        </div>
    );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────

interface OrbConfirmationModalProps {
    isOpen: boolean;
    plan: OrbPipelinePlan | null;
    isLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function OrbConfirmationModal({
    isOpen,
    plan,
    isLoading = false,
    onConfirm,
    onCancel,
}: OrbConfirmationModalProps) {
    const totalCredits = plan ? computeTotalCredits(plan) : 0;
    const totalArticles =
        (plan?.toResearch.length ?? 0) +
        (plan?.toOutline.length ?? 0) +
        (plan?.toDraft.length ?? 0) +
        (plan?.toRewrite.length ?? 0) +
        (plan?.toHumanize.length ?? 0);

    const hasAnything =
        (plan?.toResearch.length ?? 0) > 0 ||
        (plan?.toOutline.length ?? 0) > 0 ||
        (plan?.toDraft.length ?? 0) > 0 ||
        (plan?.toRewrite.length ?? 0) > 0 ||
        (plan?.toHumanize.length ?? 0) > 0 ||
        (plan?.toTranslate.length ?? 0) > 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[400]"
                        onClick={onCancel}
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.94, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: 16 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="fixed inset-0 flex items-center justify-center z-[401] p-4 pointer-events-none"
                    >
                        <div className="pointer-events-auto w-full max-w-[480px] bg-white/95 backdrop-blur-2xl border border-white/60 rounded-[32px] shadow-[0_32px_80px_rgba(79,70,229,0.18)] overflow-hidden">

                            {/* Header */}
                            <div className="px-7 pt-7 pb-5 border-b border-slate-100 flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-[13px] font-black uppercase tracking-[0.2em] text-slate-900">
                                        Plan de Ejecución
                                    </h2>
                                    <p className="text-[10px] font-medium text-slate-400 mt-1 leading-relaxed">
                                        Revisá qué hará Nous antes de confirmar.
                                    </p>
                                </div>
                                <button
                                    onClick={onCancel}
                                    className="p-2 rounded-xl bg-slate-100/70 hover:bg-slate-200/70 text-slate-500 hover:text-slate-800 transition-all shrink-0"
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="px-7 py-5 space-y-4">

                                {/* Loading state */}
                                {isLoading && (
                                    <div className="flex flex-col items-center justify-center py-8 gap-3 opacity-60">
                                        <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                            Calculando plan...
                                        </span>
                                    </div>
                                )}

                                {/* Actions summary */}
                                {!isLoading && plan && (
                                    <>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
                                                Acciones planificadas
                                            </p>
                                            <div className="bg-slate-50/80 rounded-2xl px-4 border border-slate-100">
                                                {plan.toResearch.length > 0 && (
                                                    <ActionRow
                                                        icon={Search}
                                                        label="Investigar artículos"
                                                        count={plan.toResearch.length}
                                                        color="indigo"
                                                        credits={plan.toResearch.length * CREDIT_RATES.research}
                                                    />
                                                )}
                                                {plan.toOutline.length > 0 && (
                                                    <ActionRow
                                                        icon={Sparkles}
                                                        label="Generar outlines"
                                                        count={plan.toOutline.length}
                                                        color="cyan"
                                                        credits={plan.toOutline.length * CREDIT_RATES.outline}
                                                    />
                                                )}
                                                {plan.toDraft.length > 0 && (
                                                    <ActionRow
                                                        icon={Sparkles}
                                                        label="Redactar contenidos"
                                                        count={plan.toDraft.length}
                                                        color="rose"
                                                        credits={plan.toDraft.length * CREDIT_RATES.draft}
                                                    />
                                                )}
                                                {plan.toRewrite.length > 0 && (
                                                    <ActionRow
                                                        icon={RotateCcw}
                                                        label="Reescribir contenidos"
                                                        count={plan.toRewrite.length}
                                                        color="amber"
                                                        credits={plan.toRewrite.length * CREDIT_RATES.rewrite}
                                                        badge="Override manual"
                                                    />
                                                )}
                                                {plan.toHumanize.length > 0 && (
                                                    <ActionRow
                                                        icon={Zap}
                                                        label="Humanizar artículos"
                                                        count={plan.toHumanize.length}
                                                        color="emerald"
                                                        credits={plan.toHumanize.length * CREDIT_RATES.humanize}
                                                    />
                                                )}
                                                {plan.toTranslate.length > 0 && plan.translateLanguages > 0 && (
                                                    <ActionRow
                                                        icon={Globe}
                                                        label={`Traducir a ${plan.translateLanguages} idioma${plan.translateLanguages > 1 ? "s" : ""}`}
                                                        count={plan.toTranslate.length * plan.translateLanguages}
                                                        color="purple"
                                                        credits={plan.toTranslate.length * plan.translateLanguages * CREDIT_RATES.translate}
                                                    />
                                                )}
                                                {plan.generateImages && plan.toDraft.length > 0 && (
                                                    <ActionRow
                                                        icon={ImageIcon}
                                                        label="Generar imágenes"
                                                        count={plan.toDraft.length}
                                                        color="indigo"
                                                        credits={plan.toDraft.length * CREDIT_RATES.image}
                                                    />
                                                )}

                                                {!hasAnything && (
                                                    <div className="flex items-center gap-3 py-4">
                                                        <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                                                        <span className="text-[11px] font-bold text-slate-500">
                                                            No hay artículos que necesiten procesamiento con la configuración seleccionada.
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Credit summary */}
                                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50/50 rounded-2xl p-4 border border-indigo-100/50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Coins size={15} className="text-indigo-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                                                        Costo estimado
                                                    </span>
                                                </div>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-[24px] font-black text-indigo-700 leading-none tabular-nums">
                                                        {totalCredits.toLocaleString()}
                                                    </span>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">
                                                        créditos
                                                    </span>
                                                </div>
                                            </div>
                                            {totalCredits === 0 && hasAnything && (
                                                <p className="text-[9px] text-indigo-400 font-medium mt-1.5">
                                                    Las acciones de investigación y outline son gratuitas.
                                                </p>
                                            )}
                                            <p className="text-[8px] font-medium text-indigo-300 mt-2">
                                                * Solo informativo. El sistema de créditos se activará próximamente.
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-7 pb-7 flex gap-3">
                                <button
                                    onClick={onCancel}
                                    className="flex-1 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-black uppercase tracking-widest transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={onConfirm}
                                    disabled={!hasAnything || isLoading}
                                    className={cn(
                                        "flex-[2] py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all relative overflow-hidden flex items-center justify-center gap-2",
                                        hasAnything && !isLoading
                                            ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-[0_4px_20px_rgba(79,70,229,0.35)] hover:shadow-[0_6px_28px_rgba(79,70,229,0.45)] hover:-translate-y-0.5"
                                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                    )}
                                >
                                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent hover:translate-x-full transition-transform duration-700 ease-in-out" />
                                    <CheckCircle2 size={14} className="relative z-10" />
                                    <span className="relative z-10">
                                        {totalArticles > 0
                                            ? `Ejecutar — ${totalArticles} artículo${totalArticles > 1 ? "s" : ""}`
                                            : "Ejecutar"}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
