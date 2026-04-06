"use client";

import { use } from "react";
import { ContentsLayout } from "@/components/contents/ContentsLayout";
import { Suspense } from "react";

interface PageProps {
    params: Promise<{ tool: string }>;
}

function ContentPageContent({ params }: PageProps) {
    const { tool } = use(params);
    const initialTool = tool || "dashboard";

    return <ContentsLayout initialTool={initialTool} />;
}

export default function DynamicContentPage({ params }: PageProps) {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
            </div>
        }>
            <ContentPageContent params={params} />
        </Suspense>
    );
}
