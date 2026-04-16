import { 
    ImagePlan, 
    ProcessingStatus,
    ImageAsset
} from '@/types/images';
import { ImagePreset } from '@/types/project';
import { PollinationsService } from '@/lib/services/pollinationsService';
import { ImagePlanningService } from '@/lib/services/imagePlanningService';
import { PostProcessingService } from '@/lib/services/images/PostProcessingService';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// This service is intended for server-side execution only.
// It uses libraries like Sharp and Supabase Admin which are not available in the client.

export interface VisualEngineOptions {
    instructions: string;
    language: 'es' | 'en';
    masterPrompt?: string;
    portadaPreset?: ImagePreset;
    bodyPresets?: ImagePreset[];
    taskId: string;
    projectId?: string; 
    onStatusChange?: (status: ProcessingStatus, message: string) => void;
}

/**
 * VisualEngine V3
 * The unified orchestrator for editorial design and image generation.
 */
export const VisualEngine = {
    /**
     * Executes the complete visual strategy: Analysis -> Generation -> Optimization -> Persistence.
     */
    async executeFullPipeline(paragraphs: string[], options: VisualEngineOptions) {
        const { 
            onStatusChange = () => {}, 
            instructions, language, 
            masterPrompt = "", portadaPreset, bodyPresets = [],
            taskId
        } = options;

        try {
            // 1. TACTICAL PLANNING (Single AI Call)
            onStatusChange(ProcessingStatus.ANALYZING_TEXT, "Director de Arte analizando contenido...");
            const plan = await ImagePlanningService.planImages(
                paragraphs, instructions, language, 
                bodyPresets.length > 0 ? bodyPresets.length : 'auto', 'hyperrealistic'
            );

            const pendingAssets: ImageAsset[] = [];

            // 2. PREPARE ASSETS BASED ON PLAN
            // Portada
            if (portadaPreset && plan.featuredImage) {
                const pPrompt = `${plan.featuredImage.prompt}, ${portadaPreset.mini_prompt}, ${masterPrompt}`.replace(/, ,/g, ',').trim();
                const url = PollinationsService.generateImageUrl(pPrompt, { 
                    width: 1280, height: 720, model: portadaPreset.model || 'flux', enhance: true 
                });

                pendingAssets.push(this.createAssetObject(taskId, 'hero', url, pPrompt, plan.featuredImage, portadaPreset.ratio || '16:9', '100%'));
            }

            // Body Images
            plan.inlineImages.forEach((img, i) => {
                const preset = bodyPresets[i % bodyPresets.length] || bodyPresets[0];
                const combinedPrompt = `${img.prompt}, ${preset?.mini_prompt || ""}, ${masterPrompt}`.replace(/, ,/g, ',').trim();
                const url = PollinationsService.generateImageUrl(combinedPrompt, { 
                    width: 1024, height: 576, model: preset?.model || 'flux', enhance: true 
                });

                pendingAssets.push(this.createAssetObject(
                    taskId, 'feature', url, combinedPrompt, img, 
                    preset?.ratio || '16:9', preset?.width ? `${preset.width}px` : '100%'
                ));
            });

            // 3. GENERATION & PERSISTENCE
            onStatusChange(ProcessingStatus.GENERATING_IMAGES, `Renderizando ${pendingAssets.length} activos editoriales...`);
            const finalAssets = await this.persistAssets(pendingAssets, taskId);
            
            onStatusChange(ProcessingStatus.COMPLETED, "Maquetación visual finalizada con éxito.");
            return { success: true, assets: finalAssets };

        } catch (error) {
            console.error("[VisualEngine] Critical Failure:", error);
            onStatusChange(ProcessingStatus.ERROR, "Error en el motor visual.");
            throw error;
        }
    },

    /**
     * Regenerates a single image asset based on an existing one and optional refinement.
     */
    async regenerateImage(asset: ImageAsset, taskId: string, options: any = {}, refinement: string = "") {
        try {
            const combinedPrompt = `${asset.prompt}, ${refinement}`.replace(/, ,/g, ',').trim();
            
            const url = PollinationsService.generateImageUrl(combinedPrompt, {
                model: options.sourceModel || 'flux',
                width: options.customDimensions?.width || 1024,
                height: options.customDimensions?.height || 576,
                enhance: true
            });

            const updatedAsset = { ...asset, url, prompt: combinedPrompt };
            const persisted = await this.persistAssets([updatedAsset], taskId);
            return persisted[0];
        } catch (error) {
            console.error("[VisualEngine] Regeneration Error:", error);
            throw error;
        }
    },

    private createAssetObject(taskId: string, role: string, url: string, prompt: string, aiPlan: any, ratio: string, width: string): ImageAsset {
        return {
            id: crypto.randomUUID(),
            status: 'final',
            type: 'image',
            role: (aiPlan.role || role) as any,
            url,
            prompt,
            alt: aiPlan.alt || '',
            title: aiPlan.title || '',
            rationale: aiPlan.rationale,
            design: { width, align: 'center', wrapping: 'break', aspectRatio: ratio },
            positioning: { paragraphIndex: 0, semanticAnchor: aiPlan.semanticAnchor }
        };
    },

    async persistAssets(assets: ImageAsset[], taskId: string): Promise<ImageAsset[]> {
        const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        
        const processPromises = assets.map(async (asset) => {
            try {
                // Optimization to WebP via Sharp
                const result = await (PostProcessingService as any).processAndUpload({
                    url: asset.url,
                    fileName: `${taskId}/${asset.id}.webp`,
                    width: 1024,
                    bucket: 'content-images',
                });

                if (result.success && result.url) {
                    // Record in Database
                    await supabaseAdmin.from('task_images').insert({
                        id: asset.id,
                        task_id: taskId,
                        storage_path: result.storage_path,
                        url: result.url,
                        prompt: asset.prompt,
                        alt_text: asset.alt,
                        title: asset.title,
                        type: asset.role,
                        paragraph_index: asset.positioning.paragraphIndex
                    });

                    return { ...asset, url: result.url, storagePath: result.storage_path };
                }
                return asset;
            } catch (e) {
                console.error(`[VisualEngine] Failed to persist asset ${asset.id}:`, e);
                return asset; 
            }
        });

        const results = await Promise.allSettled(processPromises);
        return results.map(res => res.status === 'fulfilled' ? res.value : {}) as ImageAsset[];
    }
};
