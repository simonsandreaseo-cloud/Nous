import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { PostProcessingService } from '../src/lib/services/images/PostProcessingService';

// Cargar variables de entorno del archivo local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Error: Faltan variables de entorno NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
    process.exit(1);
}

// Cliente administrador de Supabase
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

interface TaskImage {
    id: string;
    task_id: string;
    storage_path: string;
    url: string;
    title: string;
}

async function runMigration() {
    const isDryRun = process.argv.includes('--dry-run');
    console.log("=========================================================================");
    console.log(`🚀 MIGRACIÓN RETROACTIVA DE IMÁGENES A WEBP ${isDryRun ? '(MODO SIMULACIÓN / DRY-RUN)' : '(MODO EJECUCIÓN REAL)'}`);
    console.log("=========================================================================");

    // 1. Escanear registros en task_images
    console.log("🔍 Escaneando registros en 'task_images'...");
    const { data: allImages, error: fetchError } = await supabase
        .from('task_images')
        .select('*');

    if (fetchError) {
        console.error("❌ Error al obtener imágenes de la base de datos:", fetchError);
        return;
    }

    if (!allImages || allImages.length === 0) {
        console.log("✅ No se encontraron imágenes en la tabla 'task_images'.");
        return;
    }

    console.log(`📊 Se encontraron ${allImages.length} imágenes totales en la base de datos.`);

    // Filtrar imágenes que requieren conversión (no son webp ni gif)
    const imagesToProcess = allImages.filter((img: TaskImage) => {
        const ext = path.extname(img.storage_path).toLowerCase();
        const isWebP = ext === '.webp' || img.storage_path.toLowerCase().endsWith('.webp');
        const isGif = ext === '.gif' || img.storage_path.toLowerCase().endsWith('.gif');
        return !isWebP && !isGif;
    });

    if (imagesToProcess.length === 0) {
        console.log("✅ ¡Espectacular! Todas las imágenes ya son WebP (o GIFs preservados). No hay nada que migrar.");
        return;
    }

    console.log(`🎯 Encontradas ${imagesToProcess.length} imágenes estáticas (PNG, JPG, etc.) listas para migrar a WebP.`);

    let totalBytesSaved = 0;
    let processedCount = 0;
    let errorCount = 0;

    for (const img of imagesToProcess) {
        console.log(`\n─────────────────────────────────────────────────────────────────────────`);
        console.log(`📦 [${processedCount + 1}/${imagesToProcess.length}] Procesando imagen: "${img.title || 'Sin título'}" (ID: ${img.id})`);
        console.log(`📂 Path original: ${img.storage_path}`);

        try {
            // A. Descargar archivo original en memoria
            const { data: fileBlob, error: downloadError } = await supabase.storage
                .from('content-images')
                .download(img.storage_path);

            if (downloadError) {
                throw new Error(`Error descargando de storage: ${downloadError.message}`);
            }

            const arrayBuffer = await fileBlob.arrayBuffer();
            const originalBuffer = Buffer.from(arrayBuffer);
            const originalSizeKb = Math.round(originalBuffer.length / 1024);
            console.log(`📥 Descargada con éxito. Tamaño original: ${originalSizeKb} KB`);

            // B. Buscar límites de peso (max_kb) del proyecto
            let maxKb = 300;
            const { data: task } = await supabase
                .from('tasks')
                .select('project_id')
                .eq('id', img.task_id)
                .single();

            if (task?.project_id) {
                const { data: project } = await supabase
                    .from('projects')
                    .select('settings')
                    .eq('id', task.project_id)
                    .single();

                if (project?.settings?.images) {
                    maxKb = project.settings.images.max_kb || 300;
                }
            }
            console.log(`⚙️ Límite de optimización del proyecto para esta tarea: ${maxKb} KB`);

            // Si es simulacro, hacemos la compresión en memoria para reportar peso final, pero sin subir ni modificar DB
            const fileBaseName = path.basename(img.storage_path, path.extname(img.storage_path));
            const newFileName = `${img.task_id}/${fileBaseName}.webp`;

            if (isDryRun) {
                // Simular conversión usando el servicio en memoria sin persistir a base de datos
                const sharp = require('sharp');
                let simBuffer = await sharp(originalBuffer).webp({ quality: 80 }).toBuffer();
                let simSizeKb = Math.round(simBuffer.length / 1024);
                
                // Si excede, simulamos reducción de calidad similar a la búsqueda binaria
                if (simSizeKb > maxKb) {
                    simBuffer = await sharp(originalBuffer).webp({ quality: 50 }).toBuffer();
                    simSizeKb = Math.round(simBuffer.length / 1024);
                }

                const savedKb = originalSizeKb - simSizeKb;
                totalBytesSaved += simBuffer.length;
                console.log(`🧪 [SIMULACIÓN] Se convertiría a WebP: ~${simSizeKb} KB (Ahorro estimado: ${savedKb} KB)`);
                processedCount++;
                continue;
            }

            // MODO REAL: C. Procesar y Subir WebP
            console.log("⚡ Convirtiendo y optimizando a WebP dinámico...");
            const processingParams = {
                buffer: originalBuffer,
                fileName: newFileName,
                bucket: 'content-images',
            };

            const result = maxKb
                ? await PostProcessingService.optimizeToLimit(processingParams, maxKb)
                : await PostProcessingService.processAndUpload(processingParams);

            if (!result.success || !result.url || !result.storage_path) {
                throw new Error(result.error || "Fallo en la optimización con Sharp");
            }

            // Descargar el nuevo WebP para auditar tamaño real
            const { data: webpBlob } = await supabase.storage
                .from('content-images')
                .download(result.storage_path);
            
            const webpArrayBuffer = await webpBlob!.arrayBuffer();
            const webpBuffer = Buffer.from(webpArrayBuffer);
            const webpSizeKb = Math.round(webpBuffer.length / 1024);
            const savedKb = originalSizeKb - webpSizeKb;
            totalBytesSaved += (originalBuffer.length - webpBuffer.length);

            console.log(`📤 Nuevo WebP subido con éxito: ${result.url}`);
            console.log(`📉 Peso WebP real: ${webpSizeKb} KB (¡Ahorro real de ${savedKb} KB! -${Math.round((savedKb/originalSizeKb)*100)}%)`);

            // D. Actualizar cascada en Base de Datos de manera segura
            console.log("🔗 Actualizando referencias en cascada en la base de datos...");

            // 1. Actualizar task_images
            const { error: imgUpdateError } = await supabase
                .from('task_images')
                .update({
                    storage_path: result.storage_path,
                    url: result.url
                })
                .eq('id', img.id);

            if (imgUpdateError) throw imgUpdateError;
            console.log("   ✅ Fila en 'task_images' actualizada.");

            // 2. Buscar referencias en la tarea asociada y actualizarlas
            const { data: taskData } = await supabase
                .from('tasks')
                .select('content_body, featured_image, attachments')
                .eq('id', img.task_id)
                .single();

            if (taskData) {
                let tasksUpdate: any = {};
                let needsUpdate = false;

                // Reemplazar en content_body HTML
                if (taskData.content_body && taskData.content_body.includes(img.url)) {
                    tasksUpdate.content_body = taskData.content_body.replaceAll(img.url, result.url);
                    needsUpdate = true;
                    console.log("   📝 Referencia reemplazada en el HTML del contenido de la tarea.");
                }

                // Reemplazar en featured_image
                if (taskData.featured_image === img.url) {
                    tasksUpdate.featured_image = result.url;
                    needsUpdate = true;
                    console.log("   🖼️ Imagen destacada (featured_image) de la tarea actualizada.");
                }

                // Reemplazar en attachments JSON
                if (taskData.attachments) {
                    const attachmentsStr = JSON.stringify(taskData.attachments);
                    if (attachmentsStr.includes(img.url) || attachmentsStr.includes(img.storage_path)) {
                        const updatedAttachmentsStr = attachmentsStr
                            .replaceAll(img.url, result.url)
                            .replaceAll(img.storage_path, result.storage_path);
                        tasksUpdate.attachments = JSON.parse(updatedAttachmentsStr);
                        needsUpdate = true;
                        console.log("   📎 Adjunto de imagen actualizado en la tarea.");
                    }
                }

                if (needsUpdate) {
                    const { error: taskUpdateError } = await supabase
                        .from('tasks')
                        .update(tasksUpdate)
                        .eq('id', img.task_id);

                    if (taskUpdateError) throw taskUpdateError;
                    console.log("   ✅ Registro de la tarea asociado actualizado con éxito.");
                }
            }

            // E. Eliminar el archivo original pesado del Storage
            console.log("🗑️ Eliminando imagen pesada original del Storage...");
            const { error: removeError } = await supabase.storage
                .from('content-images')
                .remove([img.storage_path]);

            if (removeError) {
                console.warn(`   ⚠️ Advertencia: No se pudo eliminar el archivo original viejo: ${removeError.message}`);
            } else {
                console.log("   ✅ Archivo original viejo eliminado correctamente.");
            }

            processedCount++;

        } catch (err: any) {
            console.error(`❌ Error procesando la imagen ${img.id}:`, err.message || err);
            errorCount++;
        }
    }

    console.log(`\n=========================================================================`);
    console.log("🏁 MIGRACIÓN COMPLETADA");
    console.log(`📦 Procesadas con éxito: ${processedCount}/${imagesToProcess.length}`);
    console.log(`❌ Errores encontrados: ${errorCount}`);
    if (processedCount > 0) {
        console.log(`💾 Ahorro de espacio total: ${Math.round(totalBytesSaved / (1024 * 1024) * 100) / 100} MB`);
    }
    console.log("=========================================================================");
}

runMigration();
