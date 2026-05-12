# 13-ai-text-toolkit-integration: Technical Design

## 1. Arquitectura de Inteligencia de Texto (`@nous/text-intelligence`)

Diseño basado en el patrón **Strategy** para asegurar la atomicidad y escalabilidad ("Screaming Architecture"). Cada transformación de texto es un "Experto" independiente.

### Interfaz Base: `TextExpert`

```typescript
// packages/text-intelligence/src/core/TextExpert.ts
import { GenerateContentResponse } from '@google/genai';

export interface TextExpertContext {
  documentContext?: string;
  tone?: string;
  audience?: string;
}

export interface TextExpert {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  
  getSystemInstruction(): string;
  buildPrompt(text: string, context?: TextExpertContext): string;
  parseResponse(response: GenerateContentResponse): string;
}
```

### Implementaciones (Strategies)

#### Humanizer Expert
```typescript
// packages/text-intelligence/src/experts/HumanizerExpert.ts
import { TextExpert, TextExpertContext } from '../core/TextExpert';
import { GenerateContentResponse } from '@google/genai';

export class HumanizerExpert implements TextExpert {
  readonly id = 'humanize';
  readonly name = 'Humanizar Text';
  readonly description = 'Reescribe el texto para que suene más natural, humano y empático, eliminando el tono robótico típico de la IA.';

  getSystemInstruction(): string {
    return `Eres un editor humano experto y copywriter. 
Tu objetivo es tomar texto generado por IA o texto rígido y reescribirlo para que suene completamente natural, conversacional y humano.
Reglas:
1. Usa variaciones en la longitud de las oraciones.
2. Evita palabras complejas innecesarias o jerga corporativa (a menos que el contexto lo exija).
3. Añade transiciones naturales y conectores fluidos.
4. Mantén la intención y el significado original intactos.
5. NO agregues información nueva ni inventes datos.`;
  }

  buildPrompt(text: string, context?: TextExpertContext): string {
    let prompt = `Reescribe el siguiente texto para que suene humano y natural:\n\n<text>\n${text}\n</text>\n`;
    if (context?.documentContext) {
      prompt += `\nContexto general del documento para alinear el tono: ${context.documentContext}`;
    }
    return prompt;
  }

  parseResponse(response: GenerateContentResponse): string {
    return response.text()?.trim() ?? '';
  }
}
```

#### Expander Expert
```typescript
// packages/text-intelligence/src/experts/ExpanderExpert.ts
import { TextExpert, TextExpertContext } from '../core/TextExpert';
import { GenerateContentResponse } from '@google/genai';

export class ExpanderExpert implements TextExpert {
  readonly id = 'expand';
  readonly name = 'Expandir Texto';
  readonly description = 'Desarrolla la idea del texto proporcionado, añadiendo detalles, ejemplos y profundidad.';

  getSystemInstruction(): string {
    return `Eres un escritor experto enfocado en el desarrollo de ideas.
Tu objetivo es tomar un texto breve y expandirlo, añadiendo profundidad, contexto y detalles relevantes.
Reglas:
1. Mantén la idea central del texto original.
2. Añade ejemplos pertinentes o elabora sobre los conceptos mencionados.
3. Mantén un tono coherente con el texto original.
4. La expansión debe aportar valor real, no solo palabras de relleno (fluff).`;
  }

  buildPrompt(text: string, context?: TextExpertContext): string {
    return `Expande y desarrolla el siguiente texto aportando más detalles y profundidad:\n\n<text>\n${text}\n</text>\n`;
  }

  parseResponse(response: GenerateContentResponse): string {
    return response.text()?.trim() ?? '';
  }
}
```

### Factory de Expertos
```typescript
// packages/text-intelligence/src/core/ExpertFactory.ts
import { TextExpert } from './TextExpert';
import { HumanizerExpert } from '../experts/HumanizerExpert';
import { ExpanderExpert } from '../experts/ExpanderExpert';

export class ExpertFactory {
  private experts: Map<string, TextExpert> = new Map();

  constructor() {
    this.registerExpert(new HumanizerExpert());
    this.registerExpert(new ExpanderExpert());
    // Añadir un nuevo experto (ej. Sarcástico) es solo crear la clase y registrarla aquí.
  }

  registerExpert(expert: TextExpert): void {
    this.experts.set(expert.id, expert);
  }

  getExpert(id: string): TextExpert {
    const expert = this.experts.get(id);
    if (!expert) {
      throw new Error(`Experto de texto con id '${id}' no encontrado.`);
    }
    return expert;
  }
}
```

## 2. Capa de API (tRPC Router)

Se expone el endpoint `refine` que orquesta la ejecución del experto, el procesamiento de HTML y el registro en el `AuditLogger`.

```typescript
// apps/web/src/server/api/routers/textRouter.ts
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { ExpertFactory } from '@nous/text-intelligence';
import { AuditLogger } from '@nous/audit-logger';
import { HtmlPreservationEngine } from '@nous/html-processor'; // Reutilizado de Phase 12
import { generateContent } from '@nous/ai-core'; // Cliente de IA interno

const expertFactory = new ExpertFactory();

export const textRouter = createTRPCRouter({
  refine: protectedProcedure
    .input(z.object({
      text: z.string().min(1),
      type: z.enum(['humanize', 'expand', 'summarize', 'tone-shift']), // Validado contra expertos disponibles
      context: z.object({
        documentContext: z.string().optional(),
        tone: z.string().optional()
      }).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { text, type, context } = input;
      const expert = expertFactory.getExpert(type);

      // 1. Preservación HTML (Fase 12)
      // Extrae los tags y deja placeholders o procesa el AST
      const preservation = HtmlPreservationEngine.extractTags(text);
      
      const systemInstruction = expert.getSystemInstruction();
      const prompt = expert.buildPrompt(preservation.cleanText, context);

      // 2. Ejecución del modelo (Gemini)
      const aiResponse = await generateContent({
        model: 'gemini-1.5-pro',
        systemInstruction,
        prompt,
        temperature: 0.7, // Configurable por experto si es necesario
      });

      const refinedCleanText = expert.parseResponse(aiResponse);

      // 3. Restauración HTML
      const finalText = HtmlPreservationEngine.restoreTags(refinedCleanText, preservation.tags);

      // 4. Registro de Auditoría (AuditLogger)
      await AuditLogger.log({
        action: 'AI_TEXT_REFINEMENT',
        userId: ctx.session.user.id,
        details: {
          expertId: type,
          originalTextLength: text.length,
          refinedTextLength: finalText.length,
          promptTokens: aiResponse.usage?.promptTokens,
          completionTokens: aiResponse.usage?.completionTokens,
          reasoning: \`Se aplicó el experto '\${expert.name}' con instrucciones de sistema específicas.\`
        },
        entityType: 'TEXT_NODE',
        entityId: 'transient', // O el ID del bloque del editor si se proporciona en el contexto
      });

      return {
        original: text,
        refined: finalText,
        expertUsed: expert.name
      };
    }),
});
```

## 3. Integración Frontend (`@nous/editor`)

El menú flotante (`AIBubbleMenu`) se integra con TipTap (u otro framework de editor usado) para interceptar selecciones de texto y ofrecer las opciones de inteligencia artificial.

```tsx
// packages/editor/src/components/AIBubbleMenu.tsx
import React, { useState } from 'react';
import { BubbleMenu, useCurrentEditor } from '@tiptap/react';
import { api } from '~/utils/api';
import { Wand2, User, Expand, Loader2, Check, X } from 'lucide-react';

export const AIBubbleMenu: React.FC = () => {
  const { editor } = useCurrentEditor();
  const [isLoading, setIsLoading] = useState(false);
  const [previewText, setPreviewText] = useState<string | null>(null);

  const refineMutation = api.text.refine.useMutation({
    onSuccess: (data) => {
      setPreviewText(data.refined);
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
      // Manejar error (ej. toast)
    }
  });

  if (!editor) return null;

  const handleRefine = (type: 'humanize' | 'expand') => {
    const selection = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(selection.from, selection.to, ' ');
    // Extraer el HTML real si se necesita preservar estructura rica
    const selectedHtml = editor.getHTML().substring(selection.from, selection.to); // Simplificación
    
    // Obtener contexto (ej. el título del artículo o párrafos circundantes)
    const documentContext = editor.state.doc.textContent.substring(0, 500);

    setIsLoading(true);
    refineMutation.mutate({
      text: selectedText, // O selectedHtml si el motor maneja los tags directamente
      type,
      context: { documentContext }
    });
  };

  const applyChanges = () => {
    if (previewText) {
      editor.chain().focus().insertContent(previewText).run();
      setPreviewText(null);
    }
  };

  const discardChanges = () => {
    setPreviewText(null);
  };

  return (
    <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
      <div className="flex items-center gap-1 bg-white border border-gray-200 shadow-lg rounded-lg p-1">
        {isLoading ? (
          <div className="p-2 text-blue-500 flex items-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Pensando...
          </div>
        ) : previewText ? (
          <div className="flex flex-col gap-2 p-2 max-w-sm">
            <p className="text-sm text-gray-700 italic border-l-2 border-blue-500 pl-2">
              {previewText}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={discardChanges} className="p-1 text-red-500 hover:bg-red-50 rounded">
                <X className="w-4 h-4" />
              </button>
              <button onClick={applyChanges} className="p-1 text-green-500 hover:bg-green-50 rounded">
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center px-2 text-gray-400 border-r border-gray-200">
              <Wand2 className="w-4 h-4" />
            </div>
            <button 
              onClick={() => handleRefine('humanize')}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <User className="w-4 h-4" /> Humanizar
            </button>
            <button 
              onClick={() => handleRefine('expand')}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Expand className="w-4 h-4" /> Expandir
            </button>
            {/* Nuevos expertos se mapean aquí fácilmente */}
          </>
        )}
      </div>
    </BubbleMenu>
  );
};
```

## 4. HTML Preservation (Reutilización de TranslationEngine - Phase 12)

Para garantizar que el formato rico (negritas, cursivas, enlaces) no desaparezca cuando la IA reescribe un texto, interceptamos el input y usamos el mismo AST/XML Parser desarrollado para las traducciones.

### Flujo de Preservación

1. **Entrada**: `<p>El <strong>SEO local</strong> es vital para <em>restaurantes</em>.</p>`
2. **`HtmlPreservationEngine.extractTags(input)`**:
   - Genera diccionario de tags: `{ "tag_1": "<strong>", "tag_2": "</strong>", "tag_3": "<em>", "tag_4": "</em>" }`
   - Genera texto limpio con marcadores: `El [tag_1]SEO local[tag_2] es vital para [tag_3]restaurantes[tag_4].`
3. **LLM Execution (Gemini)**:
   - Se instruye implícitamente al LLM a mantener los marcadores `[tag_X]`. El modelo procesa y devuelve:
   - `La importancia del [tag_1]SEO local[tag_2] es fundamental, especialmente para negocios como [tag_3]restaurantes[tag_4].`
4. **`HtmlPreservationEngine.restoreTags(output, tags)`**:
   - Restaura el HTML: `La importancia del <strong>SEO local</strong> es fundamental, especialmente para negocios como <em>restaurantes</em>.`

Esta técnica garantiza que el editor Tiptap reciba HTML válido con los atributos originales (ej. `href` en enlaces o `class` en spans) intactos, independientemente del experto que haya modificado el texto de texto plano.
