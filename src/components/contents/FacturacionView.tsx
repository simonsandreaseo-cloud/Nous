"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import {
    DollarSign,
    Activity,
    BarChart3,
    TrendingUp,
    TrendingDown,
    Cpu,
    Calendar,
    Loader2,
    ReceiptText,
} from "lucide-react";
import { cn } from "@/utils/cn";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface DailyBucket {
    date: string;           // YYYY-MM-DD
    totalTokens: number;
    costUsd: number;
    taskCount: number;
}

interface TaskRecord {
    id: string;
    title: string;
    type: string;
    status: string;
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    cost_usd: number;
    created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric Card
// ─────────────────────────────────────────────────────────────────────────────
function MetricCard({
    label,
    value,
    sub,
    icon: Icon,
    trend,
    color,
}: {
    label: string;
    value: string;
    sub?: string;
    icon: any;
    trend?: "up" | "down" | "neutral";
    color: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3 relative overflow-hidden"
        >
            <div className={cn("absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 blur-2xl", color)} />
            <div className="flex items-start justify-between">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", color.replace("bg-", "bg-").replace("/10", "/10 border-") + "100")}>
                    <Icon size={18} className={color.replace("bg-", "text-").replace("/10", "")} />
                </div>
                {trend && trend !== "neutral" && (
                    <span className={cn(
                        "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full",
                        trend === "up" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                        {trend === "up" ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {trend === "up" ? "Subió" : "Bajó"}
                    </span>
                )}
            </div>
            <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
                <p className="text-2xl font-black text-slate-800 leading-none">{value}</p>
                {sub && <p className="text-xs text-slate-400 font-medium mt-1">{sub}</p>}
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dual-axis Line Chart using Chart.js native canvas
// ─────────────────────────────────────────────────────────────────────────────
function BillingLineChart({ data }: { data: DailyBucket[] }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<any>(null);

    useEffect(() => {
        if (!canvasRef.current || data.length === 0) return;

        const initChart = async () => {
            const { Chart, registerables } = await import("chart.js");
            Chart.register(...registerables);

            if (chartRef.current) {
                chartRef.current.destroy();
            }

            const labels = data.map((d) => {
                const date = new Date(d.date + "T00:00:00");
                return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
            });

            const ctx = canvasRef.current!.getContext("2d");
            if (!ctx) return;

            // Gradient fill for tokens
            const tokensGrad = ctx.createLinearGradient(0, 0, 0, 300);
            tokensGrad.addColorStop(0, "rgba(99,102,241,0.25)");
            tokensGrad.addColorStop(1, "rgba(99,102,241,0.00)");

            // Gradient fill for cost
            const costGrad = ctx.createLinearGradient(0, 0, 0, 300);
            costGrad.addColorStop(0, "rgba(16,185,129,0.25)");
            costGrad.addColorStop(1, "rgba(16,185,129,0.00)");

            chartRef.current = new Chart(ctx, {
                type: "line",
                data: {
                    labels,
                    datasets: [
                        {
                            label: "Tokens consumidos",
                            data: data.map((d) => d.totalTokens),
                            borderColor: "#6366f1",
                            backgroundColor: tokensGrad,
                            borderWidth: 2.5,
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: "#6366f1",
                            pointBorderColor: "#fff",
                            pointBorderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            yAxisID: "yTokens",
                        },
                        {
                            label: "Costo USD ($)",
                            data: data.map((d) => d.costUsd),
                            borderColor: "#10b981",
                            backgroundColor: costGrad,
                            borderWidth: 2.5,
                            tension: 0.4,
                            fill: true,
                            pointBackgroundColor: "#10b981",
                            pointBorderColor: "#fff",
                            pointBorderWidth: 2,
                            pointRadius: 4,
                            pointHoverRadius: 6,
                            yAxisID: "yCost",
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: "index",
                        intersect: false,
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: "top",
                            labels: {
                                font: { family: "Inter, sans-serif", weight: "bold", size: 11 },
                                color: "#64748b",
                                boxWidth: 12,
                                boxHeight: 12,
                                borderRadius: 3,
                                padding: 16,
                            },
                        },
                        tooltip: {
                            backgroundColor: "#0f172a",
                            titleColor: "#e2e8f0",
                            bodyColor: "#94a3b8",
                            borderColor: "#1e293b",
                            borderWidth: 1,
                            padding: 12,
                            callbacks: {
                                label: (ctx) => {
                                    if (ctx.datasetIndex === 0) {
                                        return ` ${ctx.parsed.y.toLocaleString()} tokens`;
                                    }
                                    return ` $${ctx.parsed.y.toFixed(4)} USD`;
                                },
                            },
                        },
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                font: { family: "Inter, sans-serif", size: 11 },
                                color: "#94a3b8",
                            },
                        },
                        yTokens: {
                            position: "left",
                            grid: { color: "#f1f5f9" },
                            ticks: {
                                font: { family: "Inter, sans-serif", size: 11 },
                                color: "#6366f1",
                                callback: (v: any) => v.toLocaleString(),
                            },
                        },
                        yCost: {
                            position: "right",
                            grid: { drawOnChartArea: false },
                            ticks: {
                                font: { family: "Inter, sans-serif", size: 11 },
                                color: "#10b981",
                                callback: (v: any) => `$${Number(v).toFixed(3)}`,
                            },
                        },
                    },
                },
            });
        };

        initChart();

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, [data]);

    if (data.length === 0) {
        return (
            <div className="h-[340px] flex items-center justify-center text-slate-400 text-sm flex-col gap-3">
                <BarChart3 size={40} className="text-slate-200" />
                <span className="font-bold">Sin datos aún — ejecutá una tarea para ver el historial</span>
            </div>
        );
    }

    return <canvas ref={canvasRef} className="w-full" style={{ height: "340px" }} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Task Row
// ─────────────────────────────────────────────────────────────────────────────
function TaskRow({ task }: { task: TaskRecord }) {
    const statusColors: Record<string, string> = {
        completed: "bg-emerald-50 text-emerald-600 border-emerald-100",
        error: "bg-rose-50 text-rose-600 border-rose-100",
        pending: "bg-amber-50 text-amber-600 border-amber-100",
        processing: "bg-indigo-50 text-indigo-600 border-indigo-100",
    };

    return (
        <tr className="group hover:bg-slate-50/80 transition-colors border-b border-slate-50 last:border-0">
            <td className="py-3 px-4">
                <div>
                    <p className="text-[12px] font-bold text-slate-800 truncate max-w-[200px]">{task.title}</p>
                    <p className="text-[10px] text-slate-400 font-mono uppercase">{task.type}</p>
                </div>
            </td>
            <td className="py-3 px-4">
                <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border", statusColors[task.status] || statusColors.pending)}>
                    {task.status}
                </span>
            </td>
            <td className="py-3 px-4 text-right">
                <span className="text-[12px] font-bold text-violet-600 font-mono">
                    {(task.total_tokens || 0).toLocaleString()}
                </span>
                <p className="text-[10px] text-slate-400 font-mono">
                    {task.prompt_tokens || 0} in / {task.completion_tokens || 0} out
                </p>
            </td>
            <td className="py-3 px-4 text-right">
                <span className="text-[13px] font-black text-emerald-600 font-mono">
                    ${(task.cost_usd || 0).toFixed(4)}
                </span>
            </td>
            <td className="py-3 px-4 text-right text-[11px] text-slate-400 font-medium">
                {new Date(task.created_at).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                })}
            </td>
        </tr>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// RANGE FILTER
// ─────────────────────────────────────────────────────────────────────────────
const RANGES = [
    { id: "7d", label: "7 días" },
    { id: "30d", label: "30 días" },
    { id: "90d", label: "90 días" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────
export default function FacturacionView() {
    const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
    const [tasks, setTasks] = useState<TaskRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dailyData, setDailyData] = useState<DailyBucket[]>([]);

    useEffect(() => {
        fetchData();
    }, [range]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const daysBack = range === "7d" ? 7 : range === "30d" ? 30 : 90;
            const since = new Date();
            since.setDate(since.getDate() - daysBack);

            const { data, error } = await supabase
                .from("queue_tasks")
                .select("id, title, type, status, total_tokens, prompt_tokens, completion_tokens, cost_usd, created_at")
                .gte("created_at", since.toISOString())
                .order("created_at", { ascending: false })
                .limit(200);

            if (error) throw error;

            setTasks(data || []);

            // Aggregate by day for the chart
            const buckets: Record<string, DailyBucket> = {};
            (data || []).forEach((t: TaskRecord) => {
                const date = t.created_at.slice(0, 10);
                if (!buckets[date]) {
                    buckets[date] = { date, totalTokens: 0, costUsd: 0, taskCount: 0 };
                }
                buckets[date].totalTokens += Number(t.total_tokens) || 0;
                buckets[date].costUsd += Number(t.cost_usd) || 0;
                buckets[date].taskCount += 1;
            });

            // Sort ascending for the chart
            const sorted = Object.values(buckets).sort((a, b) => a.date.localeCompare(b.date));
            setDailyData(sorted);
        } catch (e) {
            console.error("[FacturacionView]", e);
        } finally {
            setIsLoading(false);
        }
    };

    // Summary metrics
    const totalCost = tasks.reduce((s, t) => s + (Number(t.cost_usd) || 0), 0);
    const totalTokens = tasks.reduce((s, t) => s + (Number(t.total_tokens) || 0), 0);
    const totalTasks = tasks.length;
    const avgCostPerTask = totalTasks > 0 ? totalCost / totalTasks : 0;

    // Top 50 costliest tasks for the table
    const sortedByTasks = [...tasks].sort((a, b) => (b.cost_usd || 0) - (a.cost_usd || 0)).slice(0, 50);

    return (
        <div className="flex-1 flex flex-col bg-slate-50 h-full overflow-y-auto">
            {/* Header */}
            <div className="h-16 border-b border-slate-200 flex items-center justify-between px-8 shrink-0 bg-white">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-100 shadow-sm">
                        <ReceiptText size={20} className="text-rose-600" />
                    </div>
                    <div>
                        <h1 className="text-base font-black text-slate-800">Facturación & Consumo</h1>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                            Tokens · Costos · Historial
                        </p>
                    </div>
                </div>

                {/* Range selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    {RANGES.map((r) => (
                        <button
                            key={r.id}
                            onClick={() => setRange(r.id as any)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all",
                                range === r.id
                                    ? "bg-white text-indigo-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="animate-spin text-indigo-400 w-8 h-8" />
                </div>
            ) : (
                <div className="p-8 space-y-8">
                    {/* Metric Cards */}
                    <div className="grid grid-cols-4 gap-4">
                        <MetricCard
                            label="Costo Total"
                            value={`$${totalCost.toFixed(4)}`}
                            sub={`últimos ${range}`}
                            icon={DollarSign}
                            color="bg-emerald-400/10"
                        />
                        <MetricCard
                            label="Tokens Totales"
                            value={totalTokens.toLocaleString()}
                            sub="prompt + completion"
                            icon={Activity}
                            color="bg-violet-400/10"
                        />
                        <MetricCard
                            label="Tareas Ejecutadas"
                            value={totalTasks.toString()}
                            sub={`en ${range}`}
                            icon={Cpu}
                            color="bg-indigo-400/10"
                        />
                        <MetricCard
                            label="Costo x Tarea"
                            value={`$${avgCostPerTask.toFixed(4)}`}
                            sub="promedio"
                            icon={TrendingUp}
                            color="bg-amber-400/10"
                        />
                    </div>

                    {/* Line Chart */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                                    <BarChart3 size={18} className="text-indigo-500" />
                                    Consumo Histórico
                                </h2>
                                <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                                    Tokens y costo por día en los últimos {range}
                                </p>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] font-bold">
                                <span className="flex items-center gap-1.5 text-indigo-500">
                                    <span className="w-3 h-0.5 bg-indigo-500 rounded-full inline-block" />
                                    Tokens
                                </span>
                                <span className="flex items-center gap-1.5 text-emerald-500">
                                    <span className="w-3 h-0.5 bg-emerald-500 rounded-full inline-block" />
                                    Costo USD
                                </span>
                            </div>
                        </div>
                        <BillingLineChart data={dailyData} />
                    </div>

                    {/* Top Tasks Table */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                <Calendar size={16} className="text-indigo-500" />
                                Detalle por Tarea
                            </h2>
                            <span className="text-[11px] text-slate-400 font-bold">
                                {sortedByTasks.length} tareas · ordenadas por costo
                            </span>
                        </div>

                        {sortedByTasks.length === 0 ? (
                            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
                                <ReceiptText size={32} className="text-slate-200" />
                                <p className="text-sm font-bold">No hay tareas con datos de facturación aún</p>
                                <p className="text-xs text-slate-300">Las tareas nuevas registrarán automáticamente su consumo</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/50">
                                            <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Tarea</th>
                                            <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                                            <th className="py-3 px-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Tokens</th>
                                            <th className="py-3 px-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Costo</th>
                                            <th className="py-3 px-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedByTasks.map((task) => (
                                            <TaskRow key={task.id} task={task} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
