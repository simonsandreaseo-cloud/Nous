import { 
    ImagePlan, 
    GeneratedImage, 
    ProcessingStatus 
} from '@/types/images';
import { ImagePreset } from '@/types/project';
import { PollinationsService } from '@/lib/services/pollinationsService';
import { VertexImageService } from '@/lib/services/images/vertexService';
import { ImagePlanningService } from '@/lib/services/imagePlanningService';
import { uploadGeneratedImage } from '@/lib/actions/imageActions';

export interface WorkflowOptions {
    instructions: string;
    language: 'es' | 'en';
    // The new preset-driven options
    masterPrompt?: string;
    portadaPreset?: ImagePreset;
    bodyPresets?: ImagePreset[];
    taskId: string;
    projectId?: string; // needed to fetch watermark/max_kb settings in Server Action
    projectLogoUrl?: string;
    onStatusChange: (status: ProcessingStatus, message: string) => void;
    onImageGenerated: (images: GeneratedImage[]) => void;
}

/**
 * Image Workflow Service (V3)
 * Orchestrates the full process using dynamic slots and multiple AI models.
 */
export const ImageWorkflowService = {
    /**
     * Executes the full image generation pipeline using Presets.
     */
    async executeFullPipeline(paragraphs: string[], options: WorkflowOptions) {
        const { 
            onStatusChange, 
            onImageGenerated, 
            instructions, 
            language, 
            masterPrompt = "",
            portadaPreset,
            bodyPresets = [],
            taskId,
            projectId,
            projectLogoUrl
        } = options;

        try {
            // Count how many non-anchored slots we have for Gemini to plan
            const availableBodySlots = bodyPresets.filter(p => p.manualIndex == null);
            const anchoredSlots = bodyPresets.filter(p => p.manualIndex != null);

            onStatusChange(ProcessingStatus.ANALYZING_TEXT, "Planificando visuales con IA...");
            const plan = await ImagePlanningService.planImages(
                paragraphs, 
                instructions, 
                language, 
                // Instruct Gemini to only plan for slots that aren't anchored manually
                availableBodySlots.length > 0 ? availableBodySlots.length : 'auto',
                // Standard realism, models will handle the heavy lifting
                'hyperrealistic'
            );

            const imagesStore: GeneratedImage[] = [];

            // ==========================================
            // 1. PORTADA (HERO) GENERATION
            // ==========================================
            if (portadaPreset) {
                onStatusChange(ProcessingStatus.GENERATING_IMAGES, "Renderizando Portada Magistral...");
                const pPrompt = `${plan.featuredImage.prompt}, ${portadaPreset.mini_prompt}, ${masterPrompt}`.replace(/, ,/g, ',').trim();
                
                let featuredUrl = '';
                
                if (portadaPreset.model.includes('imagen')) {
                    // Use Vertex AI
                    featuredUrl = await VertexImageService.generateImage({
                        prompt: pPrompt,
                        model: portadaPreset.model,
                        aspectRatio: portadaPreset.ratio as any || '16:9'
                    });
                } else {
                    // Use Pollinations
                    const pNorm = PollinationsService.getNormalizedDimensions(portadaPreset.width, portadaPreset.height);
                    featuredUrl = PollinationsService.generateImageUrl(pPrompt, {
                        width: pNorm.width,
                        height: pNorm.height,
                        model: portadaPreset.model,
                        enhance: true
                    });
                }

                const featuredImg: GeneratedImage = {
                    id: Math.random().toString(36).substr(2, 9),
                    url: featuredUrl,
                    prompt: pPrompt,
                    filename: plan.featuredImage.filename,
                    type: 'featured',
                    altText: plan.featuredImage.altText,
                    title: plan.featuredImage.title,
                    width: portadaPreset.width,
                    height: portadaPreset.height
                };
                imagesStore.push(featuredImg);
                onImageGenerated([...imagesStore]);
            }

            // ==========================================
            // 2. BODY SLOTS GENERATION
            // ==========================================
            // We combine Gemini's suggestions with our physical slots
            const finalBodyTasks = [];
            
            // Add anchored slots first (they ignore Gemini's position, but we still need a prompt. 
            // We'll just ask Gemini to summarize that specific paragraph later, but for now we use the general instructions)
            for (const slot of anchoredSlots) {
                // If it's anchored, we extract the paragraph text to build a context prompt
                const pText = paragraphs[slot.manualIndex!] || instructions;
                finalBodyTasks.push({
                    slot,
                    paragraphIndex: slot.manualIndex!,
                    basePrompt: `Context: ${pText}. Image requirement: Highly detailed visual representation.`
                });
            }

            // Add Gemini's planned slots mapping them to available body slots
            for (let i = 0; i < plan.inlineImages.length; i++) {
                const aiSuggestion = plan.inlineImages[i];
                // Cycle through available slots if Gemini suggests more images than slots we have
                const slot = availableBodySlots[i % availableBodySlots.length] || bodyPresets[0]; 
                
                if (slot) {
                    finalBodyTasks.push({
                        slot,
                        paragraphIndex: aiSuggestion.paragraphIndex,
                        basePrompt: aiSuggestion.prompt,
                        filename: aiSuggestion.filename,
                        altText: aiSuggestion.altText,
                        title: aiSuggestion.title
                    });
                }
            }

            // Execute Body Tasks
            for (let i = 0; i < finalBodyTasks.length; i++) {
                const task = finalBodyTasks[i];
                onStatusChange(ProcessingStatus.GENERATING_IMAGES, `Renderizando imagen de cuerpo ${i + 1} de ${finalBodyTasks.length}...`);
                
                const combinedPrompt = `${task.basePrompt}, ${task.slot.mini_prompt}, ${masterPrompt}`.replace(/, ,/g, ',').trim();
                let url = '';

                if (task.slot.model.includes('imagen')) {
                    // Use Vertex AI
                    url = await VertexImageService.generateImage({
                        prompt: combinedPrompt,
                        model: task.slot.model,
                        aspectRatio: (task.slot.ratio !== 'auto' && task.slot.ratio !== 'custom') ? task.slot.ratio as any : '16:9'
                    });
                } else {
                    // Use Pollinations
                    const iNorm = PollinationsService.getNormalizedDimensions(task.slot.width, task.slot.height);
                    url = PollinationsService.generateImageUrl(combinedPrompt, {
                        width: iNorm.width,
                        height: iNorm.height,
                        model: task.slot.model,
                        enhance: true
                    });
                }

                imagesStore.push({
                    id: Math.random().toString(36).substr(2, 9),
                    url,
                    prompt: combinedPrompt,
                    filename: task.filename || `inline-${i}.jpg`,
                    type: 'inline',
                    paragraphIndex: task.paragraphIndex,
                    altText: task.altText || "Imagen descriptiva",
                    title: task.title || "Apoyo Visual",
                    width: task.slot.width,
                    height: task.slot.height
                });
                onImageGenerated([...imagesStore]);
            }

            // ==========================================
            // 3. PERSISTENCE PHASE (Supabase + Sharp)
            // ==========================================
            onStatusChange(ProcessingStatus.SAVING, "Optimizando y guardando en la nube...");
            const finalImages = await this.persistImages(imagesStore, taskId, projectId, projectLogoUrl);
            
            onImageGenerated(finalImages);
            onStatusChange(ProcessingStatus.COMPLETED, "¡Diseño Editorial Completado!");
            return { success: true, images: finalImages };

        } catch (error) {
            console.error("[ImageWorkflowService] Error:", error);
            onStatusChange(ProcessingStatus.ERROR, "Error en el pipeline de diseño.");
            throw error;
        }
    },

    /**
     * Persists a list of generated images to Supabase via Server Actions.
     */
    async persistImages(images: GeneratedImage[], taskId: string, projectId?: string, projectLogoUrl?: string): Promise<GeneratedImage[]> {
        const persistedImages: GeneratedImage[] = [];

        for (const img of images) {
            try {
                const result = await uploadGeneratedImage({
                    url: img.url,
                    taskId: taskId,
                    imageId: img.id,
                    prompt: img.prompt,
                    altText: img.altText || '',
                    title: img.title || '',
                    type: img.type,
                    paragraphIndex: img.paragraphIndex,
                    width: img.width,
                    height: img.height,
                    logoUrl: projectLogoUrl,
                    projectId: projectId
                });

                if (result.success && result.publicUrl) {
                    persistedImages.push({
                        ...img,
                        url: result.publicUrl,
                        storage_path: result.storagePath
                    });
                } else {
                    console.error(`Failed to persist image ${img.id}:`, result.error);
                    persistedImages.push(img); // Keep original (Base64 or Pollinations URL) if upload fails
                }
            } catch (e) {
                console.error(`Error in persistImages for ${img.id}:`, e);
                persistedImages.push(img);
            }
        }

        return persistedImages;
    },

    /**
     * Handles regeneration of a specific image using the new preset flow.
     */
    async regenerateImage(
        image: GeneratedImage, 
        options: { model: string, width: number, height: number, ratio: string, taskId: string, projectId?: string, projectLogoUrl?: string },
        refinement?: string
    ): Promise<GeneratedImage> {
        
        let activePrompt = image.prompt;
        if (refinement) activePrompt = `${activePrompt}. ${refinement}`;
        
        let newUrl = '';

        if (options.model.includes('imagen')) {
            // Vertex AI
            newUrl = await VertexImageService.generateImage({
                prompt: activePrompt,
                model: options.model,
                aspectRatio: (options.ratio !== 'auto' && options.ratio !== 'custom') ? options.ratio as any : '16:9'
            });
        } else {
            // Pollinations
            const rNorm = PollinationsService.getNormalizedDimensions(options.width, options.height);
            newUrl = PollinationsService.generateImageUrl(activePrompt, {
                width: rNorm.width,
                height: rNorm.height,
                model: options.model,
                enhance: true
            });
        }

        const updatedImg: GeneratedImage = { 
            ...image, 
            url: newUrl,
            prompt: activePrompt,
            width: options.width,
            height: options.height
        };
        
        const persisted = await this.persistImages([updatedImg], options.taskId, options.projectId, options.projectLogoUrl);
        return persisted[0];
    }
};
