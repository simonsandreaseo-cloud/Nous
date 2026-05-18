'use server';

import { createClient } from '@supabase/supabase-js';
import { LayoutService } from '@/lib/services/writer/LayoutService';
import { PatcherMaster } from '@/lib/services/images/PatcherMaster';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function finalizeContentAction(params: {
    taskId: string;
    projectId?: string;
}) {
    try {
        // 1. Fetch Task and Content
        const { data: task, error: taskError } = await supabaseAdmin
            .from('tasks')
            .select('*')
            .eq('id', params.taskId)
            .single();

        if (taskError || !task) throw new Error("Task not found");

        // 2. Fetch Assets
        const { data: assets, error: assetsError } = await supabaseAdmin
            .from('task_images')
            .select('*')
            .eq('task_id', params.taskId);

        if (assetsError) throw assetsError;

        // 3. Fetch Project Settings for Patcher
        let patcherRules = [];
        let supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        let customDomain = '';

        if (params.projectId) {
            const { data: project } = await supabaseAdmin
                .from('projects')
                .select('settings')
                .eq('id', params.projectId)
                .single();
            
            if (project?.settings?.images?.rules) {
                patcherRules = project.settings.images.rules;
            }
            if (project?.settings?.images?.custom_domain) {
                customDomain = project.settings.images.custom_domain;
            }
        }

        // 4. Layout Injection & Patching
        // Map DB records to ImageAsset type
        const formattedAssets = assets.map(a => ({
            id: a.id,
            url: a.url,
            role: a.type,
            alt: a.alt_text || '',
            title: a.title || '',
            design: {
                width: '100%',
                align: 'center',
                wrapping: 'break',
                aspectRatio: '16:9'
            },
            positioning: {
                paragraphIndex: a.paragraph_index || 0,
                // The anchor is stored in the prompt or can be recovered from the plan
                // For now, we use the paragraph index fallback if semanticAnchor is missing
            }
        }));

        const finalHtml = LayoutService.injectAssets(task.content_body || '', formattedAssets, patcherRules);

        // 5. Update Task status and save final HTML
        const { error: updateError } = await supabaseAdmin
            .from('tasks')
            .update({ 
                status: 'publicado',
                content_body: finalHtml // We overwrite the body with the layouted version for final export
            })
            .eq('id', params.taskId);

        if (updateError) throw updateError;

        return { success: true, finalHtml };
    } catch (error: any) {
        console.error("[FinalizeAction] Error:", error);
        return { success: false, error: error.message };
    }
}
