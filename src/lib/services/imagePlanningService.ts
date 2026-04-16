import { aiRouter } from '../ai/router';
import { ImagePlan, SupportedLanguage, InlineImageCount } from '@/types/images';

/**
 * ImagePlanningService (V3 - Senior Layout Engine)
 * The single tactical brain for visual strategy.
 * Complies with AI Hierarchy: Uses gemini-3.1-flash-lite-preview for context volume.
 */
export class ImagePlanningService {
  /**
   * Analyzes content and returns a unified visual strategy plan.
   */
  static async planImages(
    paragraphs: string[],
    instructions: string = "",
    language: SupportedLanguage = 'es',
    inlineImageCount: InlineImageCount = 'auto',
    realismMode: 'standard' | 'hyperrealistic' = 'standard'
  ): Promise<ImagePlan> {
    const fullText = paragraphs.join("\n\n");
    
    const countInstruction = inlineImageCount === 'auto' 
      ? "Sugiere entre 2 y 3 imágenes para romper el texto visualmente."
      : `Sugiere exactamente ${inlineImageCount} imágenes para romper el texto visualmente.`;

    const systemPrompt = `Eres un Director de Arte y Maquetador Editorial Senior. 
Tu misión es planificar una estrategia visual de alto impacto para un artículo premium.

REGLAS DE ORO:
1. SEMANTIC ANCHOR: Para cada imagen, identifica una frase corta (5-8 palabras) del texto donde la imagen agrega valor conceptual. Esta frase DEBE existir tal cual en el texto.
2. ROLES EDITORIALES:
   - HERO: Portada magistral (16:9). El "vibe" general del artículo.
   - FEATURE: Apoyo visual descriptivo para secciones clave.
   - INFO: Visualización de conceptos o datos.
   - ICON: Minimalismo simbólico para detalles específicos.
3. PROMPTS: Deben ser en INGLÉS, altamente descriptivos, incluyendo iluminación (cinematic lighting), estilo de cámara (f/1.8, 35mm) y composición.
4. COHERENCIA: Todas las imágenes deben compartir una estética visual común basada en el estilo solicitado.

DEBES RESPONDER EXCLUSIVAMENTE EN JSON:
{
  "featuredImage": {
    "semanticAnchor": "frase exacta del inicio",
    "role": "hero",
    "prompt": "Master prompt in English...",
    "alt": "Descripción SEO",
    "title": "Título sugerido",
    "rationale": "Por qué elegiste este visual"
  },
  "inlineImages": [
    {
      "semanticAnchor": "frase exacta del cuerpo",
      "role": "feature",
      "prompt": "Specific prompt in English...",
      "alt": "...",
      "title": "...",
      "rationale": "..."
    }
  ]
}`;

    const prompt = `
      ${countInstruction}
      Modo de realismo: ${realismMode}
      Instrucciones de Estilo: ${instructions || "Estética moderna y profesional."}
      Idioma de metadatos (alt/title): ${language === 'es' ? 'Español' : 'English'}

      TEXTO DEL ARTÍCULO:
      ${fullText}
    `;

    try {
      const response = await aiRouter.generate({
        prompt,
        systemPrompt,
        jsonMode: true,
        model: 'gemini-3.1-flash-lite-preview'
      });

      if (!response.text) throw new Error("IA returned empty response.");
      
      const cleanJson = response.text.replace(/```json|```/g, '').trim();
      const plan = JSON.parse(cleanJson);

      return plan as ImagePlan;
    } catch (error: any) {
      console.error("[ImagePlanningService] Tactical Planning Error:", error);
      throw new Error("Error en la planificación semántica visual: " + error.message);
    }
  }
}
