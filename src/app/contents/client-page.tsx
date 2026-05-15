"use client";

import { ContentsLayout } from "@/components/contents/ContentsLayout";
import { Suspense } from "react";

function ContentPageContent() {
    return <ContentsLayout initialTool="planner" />;
}

export default function ContentDashboardClient() {
    return (
        <ContentPageContent />
    );
}
