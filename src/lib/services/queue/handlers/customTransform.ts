import { useWriterStore } from '@/store/useWriterStore';
import { useQueueStore } from '@/store/useQueueStore';
import { fetchCustomTransformPlan, streamCustomTransformChunk } from '@/lib/services/writer/ai-streaming';
import { HtmlProtectionService, sizeAwareChunkHtml } from '@/lib/utils/html-protection';
import { supabase } from '@/lib/supabase';
import type { QueuePayload } from '../registry';

export const handleCustomTransformTask = async (taskId: string, payload: QueuePayload) => {
    const store = useWriterStore.getState();
    const { addLogToTask, setTaskStatus } = useQueueStore.getState();
    
    const draftId = payload.taskId || store.draftId;
    
    // Verificación de borrador activo
    const isCurrentDraft = () => useWriterStore.getState().draftId === draftId;

    let originalContent = payload.content;
    if (draftId) {
        try {
            const { supabase: supabaseClient } = require('@/lib/supabase');
            const { data: dbContent } = await supabaseClient
                .from('task_contents')
                .select('content_body')
                .eq('id', draftId)
                .single();
            if (dbContent?.content_body) {
                originalContent = dbContent.content_body;
            }
        } catch (dbErr) {
            console.warn(`[Queue] Failed to load latest content from database for draft ${draftId}:`, dbErr);
        }
    }

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

    console.log("[DEBUG-CustomTransform Handler] Starting 2-phase premium layout pipeline for length:", originalContent?.length);
    addLogToTask(taskId, `Iniciando maquetación inteligente con Jefe de Diseño + Chunks...`, 'info');
    
    try {
        await useWriterStore.getState().saveTaskVersion(`Pre-Transformación Custom`, originalContent, draftId);
        
        // 1. Protection and Chunking
        const { blindedHtml, map: protectionMap } = HtmlProtectionService.protect(originalContent);
        const chunkSize = payload.chunkSize || payload.config?.chunkSize || 3;
        const maxChunkLength = chunkSize * 1500;
        const chunks = sizeAwareChunkHtml(blindedHtml, maxChunkLength);
        const chunkResults = [...chunks];
        
        // El número total de pasos de progreso = 1 (para planificación de arquitectura global) + chunks.length
        const totalSteps = 1 + chunks.length;
        let currentStep = 0;
        
        setTaskStatus(taskId, 'processing', Math.round((currentStep / totalSteps) * 100));
        addLogToTask(taskId, `El artículo fue dividido en ${chunks.length} bloques lógicos para garantizar máxima cohesión y estilo editorial premium.`, 'info');

        // Registro del inicio en los prompts de depuración
        store.addDebugPrompt(
            "🎨 Jefe de Diseño - Inicio",
            `Iniciando planificación con ${chunks.length} bloques.\nDirectrices de Maquetación: ${payload.presetInstructions ? 'Cargadas del Proyecto' : 'Usando Valores por Defecto'}\nInstrucciones del Cliente: ${userInstructions || 'Ninguna'}`
        );

        // FASE 1: Planificación del Arquitecto (Chief Designer Planning)
        addLogToTask(taskId, `🧠 Fase 1: El Arquitecto de Diseño está definiendo el sistema visual global y creando las clases CSS...`, 'info');
        
        const planningModel = model.includes('pro') ? model : 'gemini-3.1-pro-preview-gas';
        const result = await fetchCustomTransformPlan(
            chunks, 
            presetInstructions, 
            userInstructions, 
            planningModel, 
            provider
        );

        const { stylesheet, plan } = result;
        currentStep = 1;
        
        // Actualizamos el progreso de barra tras completar la fase de planificación
        setTaskStatus(taskId, 'processing', Math.round((currentStep / totalSteps) * 100));
        addLogToTask(taskId, `✨ ¡Hoja de estilos global consolidada exitosamente!`, 'success');

        // Registro del plan del diseñador en depuración
        store.addDebugPrompt(
            "🎨 Jefe de Diseño - CSS Global & Plan",
            `Stylesheet:\n${stylesheet}\n\nPlan por Bloques:\n${JSON.stringify(plan, null, 2)}`
        );

        // FASE 2: Ejecución secuencial de cada fragmento (Chunk execution)
        addLogToTask(taskId, `🧱 Fase 2: Aplicando estilos individualmente a cada uno de los ${chunks.length} bloques...`, 'info');

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const planningItem = plan.find(p => p.index === i) || { 
                index: i, 
                focus: `Bloque ${i + 1}`, 
                pautasEspecificas: `Maqueta de manera limpia y semántica utilizando el CSS global.` 
            };
            
            addLogToTask(taskId, `[Bloque ${i + 1}/${chunks.length}] Maquetando: ${planningItem.focus}...`, 'info');
            
            const chunkResult = await streamCustomTransformChunk(
                chunk,
                stylesheet,
                planningItem.pautasEspecificas,
                (chunkHtml) => {
                    chunkResults[i] = chunkHtml;
                    if (isCurrentDraft()) {
                        useWriterStore.getState().setIsRemoteUpdate(true);
                        useWriterStore.getState().setContent(`<style>\n${stylesheet}\n</style>\n` + chunkResults.join('\n'));
                    }
                },
                (statusMsg) => {
                    if (statusMsg.includes('[Vision]')) {
                        addLogToTask(taskId, `  📷 ${statusMsg}`, 'info');
                    }
                },
                model,
                provider
            );

            chunkResults[i] = chunkResult.html;
            currentStep = 1 + (i + 1); // Progreso incremental por cada chunk finalizado

            // Registro del fragmento procesado en depuración
            store.addDebugPrompt(
                `🧱 Maquetador - Bloque ${i + 1}/${chunks.length}`,
                `Focus: ${planningItem.focus}\nInstrucciones estructurales:\n${planningItem.pautasEspecificas}`,
                chunkResult.html
            );

            // Actualización progresiva en tiempo real en la barra de progreso
            setTaskStatus(taskId, 'processing', Math.round((currentStep / totalSteps) * 100));
        }

        // FASE 3: Ensamblado y guardado final
        const reassembledHtml = `<style>\n${stylesheet}\n</style>\n` + chunkResults.join('\n');
        const finalHtml = HtmlProtectionService.restore(reassembledHtml, protectionMap);
        
        addLogToTask(taskId, `Guardando maquetación premium finalizada...`, 'success');
        
        // 1. Guardar la versión de la tarea en el historial
        await useWriterStore.getState().saveTaskVersion(`Transformación Custom`, finalHtml, draftId);
        
        // 2. Persistir directamente en las tablas de Supabase
        await supabase.from('task_contents').upsert({ id: draftId, content_body: finalHtml });
        await supabase.from('tasks').update({ content_body: finalHtml }).eq('id', draftId);


        // 3. Si sigue siendo el borrador activo en pantalla, actualizamos el editor visual y los estados
        if (isCurrentDraft()) {
            useWriterStore.getState().setIsRemoteUpdate(true);
            useWriterStore.getState().setContent(finalHtml);
        }

        // Add final debug prompt
        store.addDebugPrompt(
            "🎉 Maquetador - Completado",
            `¡Maquetación finalizada con éxito! Total de bloques procesados: ${chunks.length}.`
        );

        setTaskStatus(taskId, 'completed', 100);
        addLogToTask(taskId, `✅ ¡El artículo ha sido maquetado con éxito siguiendo el plan del Jefe de Diseño!`, 'success');
    } catch (e: any) {
        console.error("[CustomTransformTask] Critical failure in premium transform task:", e);
        addLogToTask(taskId, `Error crítico durante la maquetación: ${e.message}`, 'error');
        setTaskStatus(taskId, 'error', -1);
        throw e;
    }
};
