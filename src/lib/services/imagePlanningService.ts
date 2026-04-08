
import { aiRouter } from '../ai/router';
import { ImagePlan, InlineImageCount, SupportedLanguage } from '@/types/images';

/**
 * Service for planning image placements and prompts based on content.
 */
export class ImagePlanningService {
  /**
   * Analyzes content and returns a plan for featured and inline images.
   */
  static async planImages(
    paragraphs: string[],
    instructions: string = "",
    language: SupportedLanguage = 'es',
    inlineImageCount: InlineImageCount = 'auto',
    realismMode: 'standard' | 'hyperrealistic' = 'standard'
  ): Promise<ImagePlan> {
    const contentWithIndices = paragraphs.map((p, i) => `[Párrafo ${i}]: ${p}`).join("\n\n");

    const countInstruction = inlineImageCount === 'auto' 
      ? "Sugiere entre 2 y 3 imágenes para romper el texto visualmente."
      : `Sugiere exactamente ${inlineImageCount} imágenes para romper el texto visualmente.`;

    const langInstruction = language === 'es' 
      ? "Los metadatos (altText, title, rationale) deben estar en ESPAÑOL. Los PROMPTS deben estar en INGLÉS para garantizar la mejor calidad de generación."
      : "Todo en Inglés.";

    const realismInstruction = realismMode === 'hyperrealistic'
      ? "IMPORTANTE: Genera prompts EXTRA DETALLADOS y FOTOREALISTAS. Incluye descriptores como: 'raw photo, realistic skin texture, highly detailed, photorealistic, cinematic lighting, shot on 35mm lens, national geographic style, ultra realistic'. EVITA estilos artísticos, 3D render o ilustraciones."
      : "Estilo equilibrado entre estético y descriptivo.";

    const systemPrompt = `Eres un experto en maquetación visual de blogs y SEO. 
Analiza el artículo proporcionado y planifica una imagen destacada (featuredImage) y varias imágenes internas (inlineImages) para mejorar el engagement y el SEO.

Reglas:
1. Genera prompts visuales detallados en INGLÉS.
2. Genera nombres de archivo SEO en formato kebab-case.
3. El texto de alt y título debe estar en el idioma solicitado (${language}).
4. Asegúrate de que las imágenes internas se ubiquen en índices de párrafos que tengan sentido temático.
5. CALIDAD VISUAL: ${realismInstruction}

DEBES RESPONDER EXCLUSIVAMENTE EN FORMATO JSON siguiendo este esquema:
{
  "featuredImage": {
    "prompt": "descripción visual detallada",
    "filename": "nombre-archivo-seo.jpg",
    "rationale": "por qué esta imagen",
    "altText": "texto alternativo SEO",
    "title": "título de la imagen"
  },
  "inlineImages": [
    {
      "paragraphIndex": number,
      "prompt": "descripción",
      "filename": "nombre.jpg",
      "rationale": "razón",
      "altText": "alt",
      "title": "título"
    }
  ]
}`;

    const prompt = `
      ${countInstruction}
      ${langInstruction}
      Instrucciones de Estilo: ${instructions || "Estilo profesional, limpio y moderno."}

      TEXTO DEL ARTÍCULO:
      ${contentWithIndices}
    `;

    try {
      const response = await aiRouter.generate({
        prompt,
        systemPrompt,
        jsonMode: true,
        model: 'gemini-2.5-flash'
      });

      if (!response.text) throw new Error("Respuesta vacía de la IA.");
      
      const cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJson) as ImagePlan;
    } catch (error: any) {
      console.error("Planning error:", error);
      throw new Error("Error al planificar imágenes: " + (error.message || "Error desconocido"));
    }
  }
}
