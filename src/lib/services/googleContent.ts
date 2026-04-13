import { supabase } from '@/lib/supabase';

const GOOGLE_API_BASE = 'https://www.googleapis.com';

export const GoogleContentService = {
    /**
     * Get the access token using the same logic as GscService
     */
    async getAccessToken(supabaseClient?: any, connectionId?: string) {
        const client = supabaseClient || supabase;

        // 1. Get User
        const { data: { user } } = await client.auth.getUser();

        if (!user) {
            const { data: { session } } = await client.auth.getSession();
            if (session?.provider_token) return session.provider_token;
            return null;
        }

        let query = client
            .from('user_google_connections')
            .select('access_token')
            .eq('user_id', user.id);
        
        if (connectionId) {
            query = query.eq('id', connectionId);
        } else {
            query = query.order('updated_at', { ascending: false });
        }

        const { data, error } = await query.maybeSingle();

        if (error || !data) {
            // Legacy fallback during migration
            const { data: legacy } = await client.from('user_gsc_tokens').select('access_token').eq('user_id', user.id).maybeSingle();
            return legacy?.access_token || null;
        }

        return data.access_token;
    },

    /**
     * Extract specific ID from a Google Docs or Sheets URL
     */
    getFileIdFromUrl(url: string): string | null {
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        return match ? match[1] : null;
    },

    /**
     * Fetch Google Doc content as plain text
     */
    async getDocContent(docIdOrUrl: string, supabaseClient?: any): Promise<string> {
        const token = await this.getAccessToken(supabaseClient);
        if (!token) throw new Error('No Google Access Token found. Please connect your Google account.');

        const docId = this.getFileIdFromUrl(docIdOrUrl) || docIdOrUrl;

        const response = await fetch(`${GOOGLE_API_BASE}/docs/v1/documents/${docId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Error fetching Google Doc');
        }

        const doc = await response.json();
        return this.parseDocContent(doc);
    },

    /**
     * Helper to parse Google Doc JSON to text
     */
    parseDocContent(doc: any): string {
        let text = '';
        if (doc.body && doc.body.content) {
            doc.body.content.forEach((element: any) => {
                if (element.paragraph) {
                    element.paragraph.elements.forEach((el: any) => {
                        if (el.textRun && el.textRun.content) {
                            text += el.textRun.content;
                        }
                    });
                    text += '\n'; // Preserve paragraph breaks
                }
            });
        }
        return text.trim();
    },

    /**
     * Fetch Google Sheet content (first sheet) as 2D array of strings
     */
    async getSheetValues(sheetIdOrUrl: string, range: string = 'A1:Z1000', supabaseClient?: any): Promise<string[][]> {
        const token = await this.getAccessToken(supabaseClient);
        if (!token) throw new Error('No Google Access Token found. Please connect your Google account.');

        const sheetId = this.getFileIdFromUrl(sheetIdOrUrl) || sheetIdOrUrl;

        const response = await fetch(`${GOOGLE_API_BASE}/sheets/v4/spreadsheets/${sheetId}/values/${range}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Error fetching Google Sheet');
        }

        const data = await response.json();
        return data.values || [];
    },

    /**
     * Create a new Google Doc with content
     */
    async createDoc(title: string, content: string, supabaseClient?: any): Promise<string> {
        const token = await this.getAccessToken(supabaseClient);
        if (!token) throw new Error('No Google Access Token found. Please connect your Google account.');

        // 1. Create empty doc
        const createResponse = await fetch(`${GOOGLE_API_BASE}/docs/v1/documents`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title }),
        });

        if (!createResponse.ok) {
            const error = await createResponse.json();
            throw new Error(error.error?.message || 'Error creating Google Doc');
        }

        const doc = await createResponse.json();
        const documentId = doc.documentId;

        // 2. Insert content
        // Simple insertion at index 1. For complex HTML, we'd need parsing, but for now just text.
        // If content is HTML, we might need a converter or just strip tags for basic insert.
        // Google Docs API doesn't support HTML directly via insertText.

        // Basic strip HTML for plain text insertion
        const plainText = content.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim();

        const updateResponse = await fetch(`${GOOGLE_API_BASE}/docs/v1/documents/${documentId}:batchUpdate`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                requests: [
                    {
                        insertText: {
                            text: plainText,
                            location: {
                                index: 1,
                            },
                        },
                    },
                ],
            }),
        });

        if (!updateResponse.ok) {
            const error = await updateResponse.json();
            console.warn('Error inserting text into doc:', error);
            // Return the doc URL anyway, it's just empty
        }

        return `https://docs.google.com/document/d/${documentId}/edit`;
    },

    async createSheet(title: string, data: string[][], supabaseClient?: any): Promise<string> {
        const token = await this.getAccessToken(supabaseClient);
        const url = 'https://www.googleapis.com/drive/v3/files';

        // 1. Create Spreadsheet Metadata
        const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                properties: { title: title || 'Untitled Sheet' }
            }),
        });

        if (!createResponse.ok) {
            const err = await createResponse.json();
            throw new Error(err.error?.message || 'Error creating sheet');
        }

        const sheet = await createResponse.json();
        const spreadsheetId = sheet.spreadsheetId;

        // 2. Insert Data
        if (data && data.length > 0) {
            const updateResponse = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=RAW`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ values: data }),
            });
            if (!updateResponse.ok) console.warn("Failed to insert data into sheet");
        }

        return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    },

    /**
     * Create a Google Slides Presentation
     */
    async createPresentation(title: string, slidesData: { title: string, content: string[] }[], supabaseClient?: any): Promise<string> {
        const token = await this.getAccessToken(supabaseClient);
        if (!token) throw new Error('No Google Access Token found.');

        // 1. Create Presentation
        const createResponse = await fetch(`https://slides.googleapis.com/v1/presentations`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title }),
        });

        if (!createResponse.ok) {
            const err = await createResponse.json();
            throw new Error(err.error?.message || 'Error creating presentation');
        }

        const presentation = await createResponse.json();
        const presentationId = presentation.presentationId;

        if (!slidesData || slidesData.length === 0) {
            return `https://docs.google.com/presentation/d/${presentationId}/edit`;
        }

        // 2. Add Slides & Content
        // We'll construct a batchUpdate request.
        // Since we don't know IDs, we create slides with predefined layouts and then try to insert text into placeholders.
        // This is complex. A simpler approach is to create a slide, then "createShape" with text.

        const requests: any[] = [];

        slidesData.forEach((slide, index) => {
            const slideId = `slide_${index}_${Date.now()}`;
            const titleId = `title_${index}_${Date.now()}`;
            const bodyId = `body_${index}_${Date.now()}`;

            // Create Slide
            requests.push({
                createSlide: {
                    objectId: slideId,
                    slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' },
                    placeholderIdMappings: [
                        { layoutPlaceholder: { type: 'TITLE' }, objectId: titleId },
                        { layoutPlaceholder: { type: 'BODY' }, objectId: bodyId },
                    ]
                }
            });

            // Insert Title
            if (slide.title) {
                requests.push({
                    insertText: {
                        objectId: titleId,
                        text: slide.title
                    }
                });
            }

            // Insert Content (Bullets)
            if (slide.content && slide.content.length > 0) {
                const text = slide.content.map(c => `• ${c}`).join('\n');
                requests.push({
                    insertText: {
                        objectId: bodyId,
                        text: text
                    }
                });
            }
        });

        const updateResponse = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ requests }),
        });

        if (!updateResponse.ok) {
            const err = await updateResponse.json();
            console.warn("Failed to populate slides", err);
        }

        return `https://docs.google.com/presentation/d/${presentationId}/edit`;
    }
};
