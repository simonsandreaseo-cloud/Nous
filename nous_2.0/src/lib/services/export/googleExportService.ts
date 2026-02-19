import { google } from 'googleapis';
import { supabase } from '@/lib/supabase';

export class GoogleExportService {
    private auth;

    constructor(accessToken: string) {
        this.auth = new google.auth.OAuth2();
        this.auth.setCredentials({ access_token: accessToken });
    }

    async exportToDocs(title: string, htmlContent: string) {
        // Limitation: Google Docs API dealing with raw HTML is complex.
        // Strategy: Create a blank doc, then insert text using the API structure.
        // For HTML items, we might need a converter or just dump plain text for MVP.
        // Better MVP: Create a Doc and return the URL. The user can copy paste? No, user wants export.

        // Alternative: proper conversion.
        // For this iteration, we will implement a basic text insertion.

        const docs = google.docs({ version: 'v1', auth: this.auth });
        const drive = google.drive({ version: 'v3', auth: this.auth });

        try {
            // 1. Create Doc
            const createRes = await docs.documents.create({
                requestBody: { title: title }
            });
            const docId = createRes.data.documentId;
            if (!docId) throw new Error("Failed to create Google Doc");

            // 2. Insert Content (Basic Text for MVP)
            // We strip HTML tags for now to avoid errors, as Docs API doesn't accept HTML string directly.
            const plainText = htmlContent.replace(/<[^>]+>/g, '\n');

            await docs.documents.batchUpdate({
                documentId: docId,
                requestBody: {
                    requests: [
                        {
                            insertText: {
                                location: { index: 1 },
                                text: plainText.substring(0, 10000) // Limit for safety
                            }
                        }
                    ]
                }
            });

            return { success: true, url: `https://docs.google.com/document/d/${docId}/edit` };
        } catch (error: any) {
            console.error("Google Docs Export Error:", error);
            return { success: false, error: error.message };
        }
    }
    async exportToSlides(title: string, slidesContent: string[]) {
        const slides = google.slides({ version: 'v1', auth: this.auth });
        const uploadedPaths: string[] = [];

        try {
            // 1. Upload Base64 images to Supabase temporarily
            const imageUrls: string[] = [];
            const tempDir = `temp_slides_${Date.now()}`;

            for (let i = 0; i < slidesContent.length; i++) {
                const base64Data = slidesContent[i].replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                const path = `${tempDir}/slide_${i}.png`;

                const { error } = await supabase.storage
                    .from('project-assets')
                    .upload(path, buffer, { contentType: 'image/png', upsert: true });

                if (error) throw new Error(`Supabase Upload Error: ${error.message}`);

                uploadedPaths.push(path);

                const { data: { publicUrl } } = supabase.storage
                    .from('project-assets')
                    .getPublicUrl(path);

                imageUrls.push(publicUrl);
            }

            // 2. Create Presentation
            const createRes = await slides.presentations.create({
                requestBody: { title: title }
            });
            const presentationId = createRes.data.presentationId;
            if (!presentationId) throw new Error("Failed to create Google Slides");

            // 3. Add Slides and Images
            const requests: any[] = [];

            // Delete the default slide that gets created with a new presentation
            const defaultSlideId = createRes.data.slides?.[0]?.objectId;
            if (defaultSlideId) {
                requests.push({ deleteObject: { objectId: defaultSlideId } });
            }

            // Create blank slides and insert images
            imageUrls.forEach((url, i) => {
                const slideId = `slide_${tempDir}_${i}`;
                const imageId = `img_${tempDir}_${i}`;

                // Create Slide
                requests.push({
                    createSlide: {
                        objectId: slideId,
                        slideLayoutReference: { predefinedLayout: 'BLANK' }
                    }
                });

                // Create Image stretching to full slide dimensions
                requests.push({
                    createImage: {
                        objectId: imageId,
                        url: url,
                        elementProperties: {
                            pageObjectId: slideId,
                            size: { width: { magnitude: 720, unit: 'PT' }, height: { magnitude: 405, unit: 'PT' } }, // 16:9 ratio assuming default
                            transform: { scaleX: 1, scaleY: 1, translateX: 0, translateY: 0, unit: 'PT' }
                        }
                    }
                });
            });

            if (requests.length > 0) {
                await slides.presentations.batchUpdate({
                    presentationId,
                    requestBody: { requests }
                });
            }

            // 4. Cleanup Temp Images
            if (uploadedPaths.length > 0) {
                await supabase.storage.from('project-assets').remove(uploadedPaths);
            }

            return { success: true, url: `https://docs.google.com/presentation/d/${presentationId}/edit` };
        } catch (error: any) {
            console.error("Google Slides Export Error:", error);

            // Cleanup on error
            if (uploadedPaths.length > 0) {
                await supabase.storage.from('project-assets').remove(uploadedPaths);
            }

            return { success: false, error: error.message };
        }
    }
}
