"use client";

import { ContentsLayout } from "@/components/contents/ContentsLayout";
import { Suspense } from "react";

function ContentPageContent() {
    return <ContentsLayout initialTool="planner" />;
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
