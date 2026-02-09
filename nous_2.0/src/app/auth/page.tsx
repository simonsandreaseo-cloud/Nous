"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    Chrome,
    ArrowRight,
    Check,
    X,
    ShieldCheck,
    Loader2
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function AuthPage() {
    const [mode, setMode] = useState<"login" | "register">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Password checks
    const hasMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasUpper = /[A-Z]/.test(password);

    const strength = [hasMinLength, hasNumber, hasSpecial, hasUpper].filter(Boolean).length;
    const strengthText = ["Débil", "Regular", "Buena", "Fuerte", "Excelente"][strength];
    const strengthColor = ["bg-slate-300", "bg-red-400", "bg-amber-400", "bg-emerald-400", "bg-cyan-500"][strength];

    const router = useRouter();
    const user = useAuthStore((state) => state.user);

    useEffect(() => {
        if (user) {
            router.push("/");
        }
    }, [user, router]);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (mode === "register") {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback`,
                    },
                });
                if (signUpError) throw signUpError;
                setSuccess("¡Registro exitoso! Por favor revisa tu correo para confirmar tu cuenta.");
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
                router.push("/");
            }
        } catch (err: any) {
            setError(err.message || "Ocurrió un error inesperado.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center bg-[#F5F7FA] overflow-hidden">
            {/* Background elements to match clinical tech aesthetic */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-200 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-100 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="relative z-10 w-full max-w-[450px] p-4"
            >
                <div className="bg-white/70 backdrop-blur-2xl border border-white rounded-[32px] p-10 shadow-[0_20px_50px_rgba(0,0,0,0.05)]">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <motion.h1
                            layoutId="auth-title"
                            className="text-4xl font-black text-slate-900 tracking-tighter"
                        >
                            {mode === "login" ? "Bienvenido" : "Únete a Nous"}
                        </motion.h1>
                        <p className="text-slate-500 text-sm mt-3 font-medium">
                            {mode === "login"
                                ? "Ingresa a tu santuario SEO inteligente"
                                : "Crea tu nodo en el ecosistema digital"}
                        </p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-semibold flex items-center gap-3"
                        >
                            <X size={16} />
                            {error}
                        </motion.div>
                    )}

                    {success && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-semibold flex items-center gap-3"
                        >
                            <Check size={16} />
                            {success}
                        </motion.div>
                    )}

                    <form onSubmit={handleEmailAuth} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-600 transition-colors">
                                    <Mail size={18} strokeWidth={1.5} />
                                </span>
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ejemplo@nous.tech"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-cyan-600 transition-colors">
                                    <Lock size={18} strokeWidth={1.5} />
                                </span>
                                <input
                                    required
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 pl-12 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Password Strength and Validation - Only in Register */}
                        <AnimatePresence>
                            {mode === "register" && password.length > 0 && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="space-y-4 overflow-hidden"
                                >
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center text-[10px] uppercase tracking-wider font-bold text-slate-400">
                                            <span>Seguridad: <span className={cn(
                                                strength >= 3 ? "text-emerald-500" : strength >= 2 ? "text-amber-500" : "text-red-500"
                                            )}>{strengthText}</span></span>
                                            <span>{strength * 25}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${strength * 25}%` }}
                                                className={cn("h-full transition-colors duration-500", strengthColor)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { label: "8+ caracteres", met: hasMinLength },
                                            { label: "Un número", met: hasNumber },
                                            { label: "Carácter especial", met: hasSpecial },
                                            { label: "Mayúscula", met: hasUpper },
                                        ].map((check, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className={cn(
                                                    "w-4 h-4 rounded-full flex items-center justify-center transition-colors",
                                                    check.met ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-300"
                                                )}>
                                                    <Check size={10} strokeWidth={4} />
                                                </div>
                                                <span className={cn("text-[10px] font-medium transition-colors", check.met ? "text-slate-600" : "text-slate-400")}>
                                                    {check.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            type="submit"
                            disabled={loading || (mode === "register" && strength < 3)}
                            className="group relative w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm tracking-widest overflow-hidden hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-900/10"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    {mode === "login" ? "ENTRAR" : "CREAR CUENTA"}
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </span>
                            )}
                        </button>
                    </form>

                    <div className="relative my-8 text-center">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                        <span className="relative px-4 bg-[#f8fafc] text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">O continuar con</span>
                    </div>

                    <button
                        onClick={handleGoogleLogin}
                        className="w-full flex items-center justify-center gap-3 py-4 border border-slate-200 rounded-2xl bg-white hover:bg-slate-50 transition-all font-semibold text-sm text-slate-700"
                    >
                        <Chrome size={20} className="text-blue-500" />
                        Google
                    </button>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => setMode(mode === "login" ? "register" : "login")}
                            className="text-xs font-bold text-slate-500 hover:text-cyan-600 transition-colors tracking-wide"
                        >
                            {mode === "login"
                                ? "¿No tienes cuenta? REGÍSTRATE"
                                : "¿Ya tienes cuenta? INICIA SESIÓN"}
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-[10px] font-mono font-medium text-slate-400 uppercase tracking-[0.3em]">Nous Clinical Tech • Neural System v2.0</p>
                </div>
            </motion.div>
        </div>
    );
}
