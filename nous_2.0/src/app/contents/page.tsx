"use client";

import { useSearchParams } from "next/navigation";
import { ContentsLayout } from "@/components/contents/ContentsLayout";
import { Suspense } from "react";

function ContentPageContent() {
    const searchParams = useSearchParams();
    const tool = searchParams?.get("tool") || "dashboard";

    return <ContentsLayout initialTool={tool} />;
}

export default function ContentDashboard() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
        </div>}>
            <ContentPageContent />
        </Suspense>
    );
}
