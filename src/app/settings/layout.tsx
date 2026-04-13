"use client";
import { SettingsSidebar } from "@/components/settings/SettingsSidebar";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, loading, initialized } = useAuthStore();
    const router = useRouter();

    useEffect(() => {
        if (initialized && !loading && !user) {
            router.push("/auth");
        }
    }, [user, loading, initialized, router]);

    if (!initialized || loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-white">
                <div className="text-center animate-in fade-in duration-700">
                    <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Autenticando...</p>
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="flex h-screen w-full overflow-hidden bg-[#F8FAFC]">
            {/* Full Vertical Sidebar */}
            <SettingsSidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar relative">
                {/* Minimalist Background Deco */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-indigo-50/20 to-transparent pointer-events-none -mr-48 -mt-48 opacity-60" />
                
                <main className="relative z-10 p-8 md:p-12 lg:p-16 max-w-[1200px]">
                    {children}
                </main>
            </div>
        </div>
    );
}
