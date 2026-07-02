"use client";

import { ContentsLayout } from "@/components/contents/ContentsLayout";
import { Suspense } from "react";
import { useParams } from "next/navigation";

function ContentPageContent() {
    const params = useParams();
    const tool = params?.tool as string;
    const initialTool = tool || "dashboard";

    return <ContentsLayout initialTool={initialTool} />;
}

export default function DynamicContentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin" />
            </div>
        }>
            <ContentPageContent />
        </Suspense>
    );
}
