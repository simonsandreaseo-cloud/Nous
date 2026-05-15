import { Suspense } from "react";
import ContentDashboardClient from "./client-page";

export const maxDuration = 300; // 5 minutes timeout to prevent Vercel 10s hobby limit

export default function ContentDashboard() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
        </div>}>
            <ContentDashboardClient />
        </Suspense>
    );
}
