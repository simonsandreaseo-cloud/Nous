/**
 * Vertex AI / Google AI Studio (Express Mode) Image Generation Service
 * Calls Imagen 4 / Imagen 3 Fast via REST API using just the API Key.
 */

interface VertexImageOptions {
    prompt: string;
    model?: string; // 'imagen-4.0-generate-001' | 'imagen-3.0-fast-generate-001'
    aspectRatio?: '1:1' | '9:16' | '16:9' | '3:4' | '4:3';
    sampleCount?: number;
}

export const VertexImageService = {
    async generateImage(options: VertexImageOptions): Promise<string> {
        const apiKey = process.env.GEMINI_API_KEY || process.env.VERTEX_API_KEY;
        
        if (!apiKey) {
            throw new Error("Missing Google AI API Key (GEMINI_API_KEY or VERTEX_API_KEY).");
        }

        const modelId = options.model || 'imagen-4.0-generate-001';
        
        // Express mode endpoint (AI Studio / Generative Language API)
        // If this endpoint fails, it might need to fallback to aiplatform with a project ID,
        // but Google just unified this under the new genai SDK / REST endpoints.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predict?key=${apiKey}`;

        const payload = {
            instances: [
                {
                    prompt: options.prompt
                }
            ],
            parameters: {
                sampleCount: options.sampleCount || 1,
                aspectRatio: options.aspectRatio || "1:1",
                outputOptions: {
                    mimeType: "image/jpeg"
                },
                safetySetting: "block_some",
                personGeneration: "allow_adult"
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[VertexImageService] API Error:", errorText);
            throw new Error(`Vertex AI Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        
        if (!data.predictions || data.predictions.length === 0) {
            throw new Error("No predictions returned from Vertex AI.");
        }

        // Return Base64 string (to be processed by Sharp in imageActions)
        const base64Data = data.predictions[0].bytesBase64Encoded;
        const mimeType = data.predictions[0].mimeType || "image/jpeg";
        
        return `data:${mimeType};base64,${base64Data}`;
    }
};
