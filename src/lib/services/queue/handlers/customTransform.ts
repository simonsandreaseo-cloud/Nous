import { useWriterStore } from '@/store/useWriterStore';
import { useQueueStore } from '@/store/useQueueStore';
import { runChiefDesignerPlanning, runCustomTransformPipeline } from '@/lib/actions/aiActions';
import type { QueuePayload } from '../registry';

const chunkHtmlContent = (html: string, maxChunkLength: number = 5000): string[] => {
    if (html.length <= maxChunkLength) {
        return [html];
    }

    const parts = html.split(/(?=<h[2-6]|<table|<section|<div\s+class=["'][^"']*split)/gi);
    const chunks: string[] = [];
    let current = "";

    for (const part of parts) {
        if ((current + part).length > maxChunkLength && current.trim()) {
            chunks.push(current);
            current = part;
        } else {
            current += part;
        }
    }
    if (current.trim()) {
        chunks.push(current);
    }
    return chunks;
};

export const handleCustomTransformTask = async (taskId: string, payload: QueuePayload) => {
    const store = useWriterStore.getState();
    const { addLogToTask, setTaskStatus } = useQueueStore.getState();
    
    const draftId = payload.taskId || store.draftId;
    const originalContent = payload.content;
    const userInstructions = payload.userInstructions;
    const model = payload.model || 'gemini-3.5-flash';
    const provider = payload.provider;

    const defaultGuidelines = `--- MANUAL DE BUENAS PRÁCTICAS DE DISEÑO EDITORIAL PREMIUM ---
1. LÍMITES DE ACCIÓN: NUNCA generes etiquetas <h1> ni banners hero principales (.hero). Inicia el código directamente con texto introductorio, grillas o un título <h2> elegante.
2. PROHIBICIÓN DE ESTILOS Y CLASES INLINE (PROHIBIDO TAILWIND INLINE): Queda terminantemente PROHIBIDO utilizar clases en línea de utilería de Tailwind CSS (como "text-slate-900", "font-bold", "leading-relaxed", "mb-6", etc.) repetidas en cada párrafo, título o elemento del texto. En su lugar, CENTRALIZA todo el CSS generado dentro de una etiqueta <style> única al inicio de este bloque de HTML. Utiliza selectores de contexto (ejemplo: .custom-article h2, .custom-article p) o clases personalizadas únicas y bien estructuradas (como .section-title, .article-p, .highlight-box) y asócialas al bloque <style>. Las etiquetas HTML del texto deben quedar perfectamente limpias, sin clases utilitarias redundantes.
3. DISEÑO DE REVISTA ASIMÉTRICO (OVERLAPS):
   - Diseña estructuras donde el texto flote sobre un costado de la imagen utilizando propiedades de posicionamiento absoluto y pseudo-elementos, aplicando fondos translúcidos elegantes y filtros de desenfoque (backdrop-filter: blur(12px)) con bordes sutiles y z-index controlado.
   - Es sumamente OBLIGATORIO asegurar el comportamiento responsive (@media (max-width: 900px)) para que estas estructuras se conviertan en flujos verticales limpios donde el texto no colisione con la imagen de fondo ni se encime de forma ilegible.
4. BANNERS Y HÉROES INTERNOS: Crea portadas o separadores de sección utilizando imágenes de fondo fluidas (background-size: cover; background-position: center;) con cajas de texto alineadas de forma asimétrica, garantizando un contraste de color e impecable legibilidad.
5. TABLAS TÉCNICAS SUTILES Y MODERNAS:
   - Para descripciones técnicas de productos o comparativas de materiales, estructúralas en tablas HTML minimalistas con bordes de color negro o gris oscuro bien definidos, tipografías imponentes y marcadas para los encabezados y efectos interactivos (:hover) suaves para las filas.
   - Aplica reset de bordes cuando las directrices de la marca lo demanden para un aspecto limpio.
6. DISEÑO MULTICOLUMNA EDITORIAL:
   - Para secciones de lectura corrida, divide los párrafos en estructuras de 2 o 3 columnas utilizando CSS Grid (ejemplo: grid-template-columns: repeat(3, 1fr)) con márgenes amplios (gap: 40px).
   - Utiliza Letra Capital (Drop Cap) estilizada para la primera letra del párrafo introductorio (ejemplo: .column p:first-child::first-letter { font-size: 3rem; font-weight: 900; color: #FF0000; float: left; ... }) para elevar la jerarquía y carácter editorial del texto.
7. VIÑETAS Y LISTADOS DE ALTO IMPACTO: Reemplaza los círculos aburridos de las listas por defecto con marcadores personalizados de diseño de la marca (como finas líneas horizontales o pequeños acentos de color vibrante usando pseudo-elementos li::before y posicionamiento relativo).
8. CONTENEDORES SEMÁNTICOS: Envuelve todo el contenido bajo un contenedor de clase único y representativo (ejemplo: .brand-article-container) para asegurar un namespace de estilos sólido y evitar colisiones con el tema global del sitio.`;

    const presetInstructions = payload.presetInstructions || defaultGuidelines;

    console.log("[DEBUG-CustomTransform Handler] Starting chunked transform for length:", originalContent?.length);
    addLogToTask(taskId, `Iniciando maquetación inteligente con Jefe de Diseño + Chunks...`, 'info');
    
    try {
        await store.saveTaskVersion(`Pre-Transformación Custom`, originalContent);
        
        setTaskStatus(taskId, 'processing', 5);
        
        // 1. Chunking
        const chunkSize = payload.chunkSize || payload.config?.chunkSize || 3;
        const maxChunkLength = chunkSize * 1500;
        const chunks = chunkHtmlContent(originalContent, maxChunkLength);
        const chunkResults = [...chunks];
        addLogToTask(taskId, `El artículo fue dividido en ${chunks.length} bloques lógicos para garantizar máxima precisión y evitar timeouts.`, 'info');
        setTaskStatus(taskId, 'processing', 10);

        // Add start debug prompt
        store.addDebugPrompt(
            "🎨 Jefe de Diseño - Inicio",
            `Iniciando planificación con ${chunks.length} bloques.\nDirectrices de Maquetación: ${payload.presetInstructions ? 'Cargadas del Proyecto' : 'Usando Valores por Defecto'}\nInstrucciones del Cliente: ${userInstructions || 'Ninguna'}`
        );

        // 2. Chief Designer Planning
        setTaskStatus(taskId, 'processing', 15);
        addLogToTask(taskId, `🧠 El Jefe de Diseño está trazando la estrategia editorial y planificando el diseño de cada bloque...`, 'info');
        
        // Use Gemini 3.1 Pro or selected model for planning
        const planningModel = model.includes('pro') ? model : 'gemini-3.1-pro-preview-gas';
        const plan = await runChiefDesignerPlanning(
            chunks, 
            presetInstructions, 
            userInstructions, 
            planningModel, 
            provider
        );
        
        setTaskStatus(taskId, 'processing', 25);
        addLogToTask(taskId, `✨ ¡Plan de maquetación y diseño completado! Iniciando ejecución de bloques...`, 'success');

        // Add plan debug prompt
        store.addDebugPrompt(
            "🎨 Jefe de Diseño - Plan",
            `Planificación completada:\n${JSON.stringify(plan, null, 2)}`
        );

        // 3. Sequential Worker Steps with Vision
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const planningItem = plan.find(p => p.index === i) || { 
                index: i, 
                focus: `Bloque ${i + 1}`, 
                pautasEspecificas: `${presetInstructions}\n\n${userInstructions}` 
            };
            
            // Calculate starting percentage for this chunk (linearly from 25% to 95%)
            const progressPct = Math.round(25 + (i / chunks.length) * 70);
            setTaskStatus(taskId, 'processing', progressPct);
            
            addLogToTask(taskId, `[${progressPct}%] [Bloque ${i + 1}/${chunks.length}] Diseñando: ${planningItem.focus}...`, 'info');
            
            const mergedInstructions = `
PAUTAS ESPECÍFICAS DE DISEÑO PARA ESTE BLOQUE:
${planningItem.pautasEspecificas}

${userInstructions ? `INSTRUCCIONES EXTRA DEL CLIENTE:\n${userInstructions}` : ''}
`;

            const result = await runCustomTransformPipeline(
                chunk,
                presetInstructions,
                mergedInstructions,
                (statusMsg) => {
                    if (statusMsg.includes('[Vision]')) {
                        addLogToTask(taskId, `  📷 ${statusMsg}`, 'info');
                    }
                },
                model,
                undefined,
                provider
            );

            chunkResults[i] = result.html;

            // Add chunk execution to debug log
            store.addDebugPrompt(
                `🧱 Maquetador - Bloque ${i + 1}/${chunks.length}`,
                `Focus: ${planningItem.focus}\nPautas de diseño de este bloque:\n${planningItem.pautasEspecificas}`,
                result.html
            );

            // Progressive Real-time updates in the editor!
            if (store.draftId === draftId) {
                store.setIsRemoteUpdate(true);
                store.setContent(chunkResults.join('\n'));
            }

            // Set ending percentage for this chunk
            const endProgressPct = Math.round(25 + ((i + 1) / chunks.length) * 70);
            setTaskStatus(taskId, 'processing', endProgressPct);
        }

        const finalHtml = chunkResults.join('\n');

        setTaskStatus(taskId, 'processing', 98);
        addLogToTask(taskId, `Guardando diseño final...`, 'success');

        if (store.draftId === draftId) {
            store.setIsRemoteUpdate(true);
            store.setContent(finalHtml);
            await store.saveTaskVersion(`Transformación Custom`, finalHtml);
        }

        // Add final debug prompt
        store.addDebugPrompt(
            "🎉 Maquetador - Completado",
            `¡Maquetación finalizada con éxito! Total de bloques procesados: ${chunks.length}.`
        );

        setTaskStatus(taskId, 'completed', 100);
        addLogToTask(taskId, `✅ ¡El artículo ha sido maquetado con éxito siguiendo el plan del Jefe de Diseño!`, 'success');
    } catch (e: any) {
        console.error(e);
        addLogToTask(taskId, `Error crítico durante la maquetación: ${e.message}`, 'error');
        setTaskStatus(taskId, 'error', -1);
        throw e;
    }
};
