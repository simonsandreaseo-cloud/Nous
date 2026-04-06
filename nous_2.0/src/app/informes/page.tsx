"use client";

import { Suspense, useState } from "react";
import { ContentsSidebar } from "@/components/contents/ContentsSidebar";
import ReportGeneratorView from "@/components/contents/reports/ReportGeneratorView";

function ReportsPageContent() {
    return (
        <div className="flex h-screen w-full bg-white overflow-hidden">
            <ContentsSidebar activeTool="informes" onToolSelect={() => {}} />
            <main className="flex-1 h-full overflow-hidden">
                <ReportGeneratorView />
            </main>
        </div>
    );
}

export default function ReportsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
            </div>
        }>
            <ReportsPageContent />
        </Suspense>
    );
}
