import { 
    BlogPost, 
    ImagePlan, 
    GeneratedImage, 
    AspectRatio, 
    InlineImageCount,
    ProcessingStatus 
} from '@/types/images';
import { PollinationsService } from '@/lib/services/pollinationsService';
import { ImagePlanningService } from '@/lib/services/imagePlanningService';
import { uploadGeneratedImage } from '@/lib/actions/imageActions';

export interface WorkflowOptions {
    instructions: string;
    language: 'es' | 'en';
    inlineImageCount: InlineImageCount;
    realismMode: 'standard' | 'hyperrealistic';
    sourceModel: string;
    optimizePrompt: boolean;
    featuredRatio: AspectRatio;
    useCustomSize: boolean;
    customDimensions: { width: number; height: number };
    applyCustomToBody: boolean;
    taskId: string;
    projectLogoUrl?: string;
    onStatusChange: (status: ProcessingStatus, message: string) => void;
    onImageGenerated: (images: GeneratedImage[]) => void;
}

/**
 * Image Workflow Service
 * Orchestrates the full process of analyzing content, planning images,
 * generating them via AI, and persisting them to storage.
 */
export const ImageWorkflowService = {
    /**
     * Executes the full image generation pipeline for a blog post.
     */
    async executeFullPipeline(paragraphs: string[], options: WorkflowOptions) {
        const { 
            onStatusChange, 
            onImageGenerated, 
            instructions, 
            language, 
            inlineImageCount, 
            realismMode,
            sourceModel,
            optimizePrompt,
            featuredRatio,
            useCustomSize,
            customDimensions,
            applyCustomToBody,
            taskId,
            projectLogoUrl
        } = options;

        try {
            // 1. Planning Phase
            onStatusChange(ProcessingStatus.ANALYZING_TEXT, "Planificando visuales...");
            const plan = await ImagePlanningService.planImages(
                paragraphs, 
                instructions, 
                language, 
                inlineImageCount,
                realismMode
            );

            const imagesStore: GeneratedImage[] = [];

            // 2. Featured Image Generation
            onStatusChange(ProcessingStatus.GENERATING_IMAGES, "Generando imagen de portada...");
            
            let fWidth = 1280;
            let fHeight = 720;
            if (useCustomSize) {
                fWidth = customDimensions.width;
                fHeight = customDimensions.height;
            } else {
                if (featuredRatio === '1:1') { fWidth = 1024; fHeight = 1024; }
                else if (featuredRatio === '4:3') { fWidth = 1024; fHeight = 768; }
            }

            // Normalize for Pollinations (High quality composition)
            const fNorm = PollinationsService.getNormalizedDimensions(fWidth, fHeight);

            const featuredUrl = PollinationsService.generateImageUrl(plan.featuredImage.prompt, {
                width: fNorm.width,
                height: fNorm.height,
                model: sourceModel,
                enhance: optimizePrompt
            });

            const featuredImg: GeneratedImage = {
                id: Math.random().toString(36).substr(2, 9),
                url: featuredUrl,
                prompt: plan.featuredImage.prompt,
                filename: plan.featuredImage.filename,
                type: 'featured',
                altText: plan.featuredImage.altText,
                title: plan.featuredImage.title,
                width: fWidth,
                height: fHeight
            };
            imagesStore.push(featuredImg);
            onImageGenerated([...imagesStore]);

            // 3. Inline Images Generation
            for (let i = 0; i < plan.inlineImages.length; i++) {
                const item = plan.inlineImages[i];
                onStatusChange(ProcessingStatus.GENERATING_IMAGES, `Generando imagen ${i + 1}/${plan.inlineImages.length}...`);
                
                let iWidth = 1024;
                let iHeight = 576;
                if (useCustomSize && applyCustomToBody) {
                    iWidth = customDimensions.width;
                    iHeight = customDimensions.height;
                }

                // Normalize for Pollinations
                const iNorm = PollinationsService.getNormalizedDimensions(iWidth, iHeight);

                const url = PollinationsService.generateImageUrl(item.prompt, {
                    width: iNorm.width,
                    height: iNorm.height,
                    model: sourceModel,
                    enhance: optimizePrompt
                });

                imagesStore.push({
                    id: Math.random().toString(36).substr(2, 9),
                    url,
                    prompt: item.prompt,
                    filename: item.filename,
                    type: 'inline',
                    paragraphIndex: item.paragraphIndex,
                    altText: item.altText,
                    title: item.title,
                    width: iWidth,
                    height: iHeight
                });
                onImageGenerated([...imagesStore]);
            }

            // 4. Persistence Phase
            onStatusChange(ProcessingStatus.SAVING, "Guardando imágenes en la nube...");
            const finalImages = await this.persistImages(imagesStore, taskId, projectLogoUrl);
            
            // Re-report final persistent URLs
            onImageGenerated(finalImages);
            
            onStatusChange(ProcessingStatus.COMPLETED, "¡Diseño Completado!");
            return { success: true, images: finalImages };

        } catch (error) {
            console.error("[ImageWorkflowService] Error:", error);
            onStatusChange(ProcessingStatus.ERROR, "Ha ocurrido un error durante la generación.");
            throw error;
        }
    },

    /**
     * Persists a list of generated images to Supabase via Server Actions.
     */
    async persistImages(images: GeneratedImage[], taskId: string, projectLogoUrl?: string): Promise<GeneratedImage[]> {
        const persistedImages: GeneratedImage[] = [];

        for (const img of images) {
            try {
                const result = await uploadGeneratedImage({
                    url: img.url,
                    taskId: taskId,
                    imageId: img.id,
                    prompt: img.prompt,
                    altText: img.altText,
                    title: img.title,
                    type: img.type,
                    paragraphIndex: img.paragraphIndex,
                    width: img.width,
                    height: img.height,
                    logoUrl: projectLogoUrl
                });

                if (result.success && result.publicUrl) {
                    persistedImages.push({
                        ...img,
                        url: result.publicUrl,
                        storage_path: result.storagePath
                    });
                } else {
                    console.error(`Failed to persist image ${img.id}:`, result.error);
                    persistedImages.push(img); // Keep original if upload fails
                }
            } catch (e) {
                console.error(`Error in persistImages for ${img.id}:`, e);
                persistedImages.push(img);
            }
        }

        return persistedImages;
    },

    /**
     * Handles regeneration of a specific image.
     */
    async regenerateImage(
        image: GeneratedImage, 
        options: Pick<WorkflowOptions, 'sourceModel' | 'optimizePrompt' | 'useCustomSize' | 'customDimensions' | 'applyCustomToBody' | 'taskId' | 'projectLogoUrl'>,
        refinement?: string
    ): Promise<GeneratedImage> {
        const { sourceModel, optimizePrompt, useCustomSize, customDimensions, applyCustomToBody, taskId, projectLogoUrl } = options;
        
        let activePrompt = image.prompt;
        if (refinement) activePrompt = `${activePrompt}. Requirement: ${refinement}`;
        
        let rWidth = image.type === 'featured' ? 1280 : 1024;
        let rHeight = image.type === 'featured' ? 720 : 576;

        if (useCustomSize) {
            if (image.type === 'featured' || applyCustomToBody) {
                rWidth = customDimensions.width;
                rHeight = customDimensions.height;
            }
        } else if (image.width && image.height) {
            // Keep existing dimensions if not overriding with custom
            rWidth = image.width;
            rHeight = image.height;
        }

        // Normalize for Pollinations
        const rNorm = PollinationsService.getNormalizedDimensions(rWidth, rHeight);

        const newUrl = PollinationsService.generateImageUrl(activePrompt, {
            width: rNorm.width,
            height: rNorm.height,
            model: sourceModel,
            enhance: optimizePrompt
        });

        const updatedImg: GeneratedImage = { 
            ...image, 
            url: newUrl,
            width: rWidth,
            height: rHeight
        };
        
        // Persist the regenerated image
        const persisted = await this.persistImages([updatedImg], taskId, projectLogoUrl);
        return persisted[0];
    }
};
