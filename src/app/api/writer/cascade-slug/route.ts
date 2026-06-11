import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { projectId, oldSlug, newSlug, domain, blogPrefix } = body;

        if (!projectId || !oldSlug || !newSlug) {
            return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Fetch all tasks for this project that have content
        const { data: tasks, error } = await supabase
            .from("tasks")
            .select("id, content_body")
            .eq("project_id", projectId)
            .not("content_body", "is", null);

        if (error) throw error;
        
        let updatedCount = 0;
        let linksUpdated = 0;

        // Ensure proper slash formatting
        const prefix = blogPrefix ? (blogPrefix.startsWith('/') ? blogPrefix : `/${blogPrefix}`) : '';
        const cleanDomain = domain ? domain.replace(/^https?:\/\//, '').replace(/\/$/, '') : '';
        
        // Construct the URLs
        const oldUrl = `https://${cleanDomain}${prefix}/${oldSlug.replace(/^\//, '')}`;
        const newUrl = `https://${cleanDomain}${prefix}/${newSlug.replace(/^\//, '')}`;
        
        const oldRelative = `${prefix}/${oldSlug.replace(/^\//, '')}`;
        const newRelative = `${prefix}/${newSlug.replace(/^\//, '')}`;

        // Escape function for regex to handle special characters in URLs
        const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        for (const task of tasks) {
            if (!task.content_body) continue;
            let currentBody = task.content_body;
            let didChange = false;

            // Search for full URLs
            const exactFullRegex = new RegExp(`href=["']${escapeRegExp(oldUrl)}/?["']`, 'g');
            const matchesFull = currentBody.match(exactFullRegex);
            if (matchesFull) {
                currentBody = currentBody.replace(exactFullRegex, `href="${newUrl}"`);
                didChange = true;
                linksUpdated += matchesFull.length;
            }

            // Search for relative URLs
            if (oldRelative && oldRelative !== '/') {
                const exactRelRegex = new RegExp(`href=["']${escapeRegExp(oldRelative)}/?["']`, 'g');
                const matchesRel = currentBody.match(exactRelRegex);
                if (matchesRel) {
                    currentBody = currentBody.replace(exactRelRegex, `href="${newRelative}"`);
                    didChange = true;
                    linksUpdated += matchesRel.length;
                }
            }

            if (didChange) {
                const { error: updateError } = await supabase
                    .from("tasks")
                    .update({ content_body: currentBody })
                    .eq("id", task.id);
                
                if (!updateError) {
                    updatedCount++;
                } else {
                    console.error(`Failed to update task ${task.id}:`, updateError);
                }
            }
        }

        return NextResponse.json({ 
            success: true, 
            updatedContents: updatedCount,
            linksReplaced: linksUpdated
        });

    } catch (e: any) {
        console.error("Cascade slug error:", e);
        return NextResponse.json({ error: e.message || "An error occurred" }, { status: 500 });
    }
}
