import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const NOUS_API_KEYS = process.env.NOUS_API_KEYS ? process.env.NOUS_API_KEYS.split(',') : [];
const geminiKey = NOUS_API_KEYS[0];
const ai = new GoogleGenAI({ apiKey: geminiKey });

const ANTI_LEAKAGE_SYSTEM_BASE = `Eres un Transformador Determinista. Tu única función es procesar la entrada y devolver la salida en el formato exacto solicitado. No uses markdown fuera de lo estrictamente solicitado. Si necesitas planificar, razonar o verificar constraints, utiliza campos específicos como 'razonamiento_interno' dentro de estructuras JSON si el prompt te lo requiere.`;

async function cleanHTML(html: string) {
    const prompt = `
TASK: Revisa este artículo HTML y ELIMINA cualquier instrucción, meta-pensamiento, reglas de prompt, o texto en inglés ("Internal links", "1500+ words", "Table for comparison", "I will proceed", etc.) que se haya filtrado por error en la redacción.

REGLAS CRÍTICAS:
1. CONSERVA el resto del texto TAL CUAL. No reescribas, no resumas, no cambies el estilo.
2. MANTÉN INTACTAS todas las etiquetas HTML (enlaces, negritas, encabezados, listas).
3. Si un párrafo entero es basura del modelo (ej. explicando qué va a hacer), elimínalo por completo.
4. Si la basura está en medio de una oración válida, simplemente bórrala para que la oración recobre el sentido en español.

IMPORTANTE: Devuelve un objeto JSON con dos claves obligatorias: 'razonamiento_interno' (tu análisis breve de lo que eliminaste) y 'html' (el artículo limpio final).

ARTÍCULO HTML TO CLEAN:
${html}
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
            systemInstruction: `${ANTI_LEAKAGE_SYSTEM_BASE}\\nRole: Editor de Limpieza de HTML.\\nREGLA DE ORO: Devuelve ÚNICAMENTE un objeto JSON.`,
            temperature: 0.1,
        }
    });

    let raw = response.text || '';
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
        raw = raw.substring(jsonStart, jsonEnd + 1);
    }

    try {
        const parsed = JSON.parse(raw);
        return parsed.html || html;
    } catch (e) {
        console.error("Failed to parse JSON", e);
        return html;
    }
}

async function main() {
    const taskId = '129c06b1-61e7-4716-88f8-912ef8950fef';
    
    console.log("Fetching task_contents...");
    const { data: taskData, error: taskErr } = await supabase.from('task_contents').select('id, content_body').eq('id', taskId).single();
    if (taskErr) {
        console.error(taskErr);
    } else if (taskData && taskData.content_body) {
        console.log("Cleaning task_contents...");
        const cleaned = await cleanHTML(taskData.content_body);
        const { error: updErr } = await supabase.from('task_contents').update({ content_body: cleaned }).eq('id', taskId);
        if (updErr) console.error("Update error task_contents", updErr);
        else console.log("✅ task_contents updated successfully.");
    }
    
    console.log("Fetching tasks...");
    const { data: tasksData, error: tasksErr } = await supabase.from('tasks').select('id, content_body').eq('id', taskId).single();
    if (tasksErr) {
        console.error(tasksErr);
    } else if (tasksData && tasksData.content_body) {
        console.log("Cleaning tasks...");
        const cleaned = await cleanHTML(tasksData.content_body);
        const { error: updErr } = await supabase.from('tasks').update({ content_body: cleaned }).eq('id', taskId);
        if (updErr) console.error("Update error tasks", updErr);
        else console.log("✅ tasks updated successfully.");
    }
}

main().catch(console.error);
