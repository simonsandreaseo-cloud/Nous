import { google } from 'googleapis';

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
        const drive = google.drive({ version: 'v3', auth: this.auth });

        try {
            // 1. Create Presentation
            const createRes = await slides.presentations.create({
                requestBody: { title: title }
            });
            const presentationId = createRes.data.presentationId;
            if (!presentationId) throw new Error("Failed to create Google Slides");

            // 2. Add Slides
            const requests: any[] = [];

            slidesContent.forEach((html, index) => {
                const uniqueId = Date.now().toString();
                const slideId = `slide_${uniqueId}_${index}`;
                const titleId = `title_${uniqueId}_${index}`;
                const bodyId = `body_${uniqueId}_${index}`;

                // Extract simple text content (Strip HTML)
                const text = html.replace(/<[^>]+>/g, '\n').trim();
                const titleMatch = html.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
                const titleText = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '') : `Slide ${index + 1}`;
                // Simple body extraction (removing title roughly)
                const bodyText = text.replace(titleText, '').trim().substring(0, 1500); // Limit chars

                // A. Create Slide
                requests.push({
                    createSlide: {
                        objectId: slideId,
                        slideLayoutReference: { predefinedLayout: 'BLANK' }
                    }
                });

                // B. Add Title Box
                requests.push({
                    createShape: {
                        objectId: titleId,
                        shapeType: 'TEXT_BOX',
                        elementProperties: {
                            pageObjectId: slideId,
                            size: { width: { magnitude: 600, unit: 'PT' }, height: { magnitude: 50, unit: 'PT' } },
                            transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 30, unit: 'PT' }
                        }
                    }
                });
                requests.push({
                    insertText: {
                        objectId: titleId,
                        text: titleText
                    }
                });
                // Style Title
                requests.push({
                    updateTextStyle: {
                        objectId: titleId,
                        style: { fontSize: { magnitude: 24, unit: 'PT' }, bold: true },
                        textRange: { type: 'ALL' },
                        fields: 'fontSize,bold'
                    }
                });

                // C. Add Body Box
                requests.push({
                    createShape: {
                        objectId: bodyId,
                        shapeType: 'TEXT_BOX',
                        elementProperties: {
                            pageObjectId: slideId,
                            size: { width: { magnitude: 600, unit: 'PT' }, height: { magnitude: 350, unit: 'PT' } },
                            transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 100, unit: 'PT' }
                        }
                    }
                });
                requests.push({
                    insertText: {
                        objectId: bodyId,
                        text: bodyText
                    }
                });
            });

            if (requests.length > 0) {
                await slides.presentations.batchUpdate({
                    presentationId,
                    requestBody: { requests }
                });
            }

            return { success: true, url: `https://docs.google.com/presentation/d/${presentationId}/edit` };
        } catch (error: any) {
            console.error("Google Slides Export Error:", error);
            return { success: false, error: error.message };
        }
    }
}
