const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function save() {
    const versionId = '6dc8f639-7bb8-4451-833a-1ebc07a5f806';
    const taskId = '9240d45b-6ad4-4c60-9e6f-cc5fa5314db9';
    // fetch v2 html
    const { data: v2 } = await supabase.from('task_versions').select('content_body').eq('id', versionId).single();
    let html = v2.content_body;
    
    // Chunk 1
    html = html.replace(/atraer miradas/, 'capturar miradas');
    html = html.replace(/art.culos simples/, 'accesorios simples');
    html = html.replace(/Si ves las creaciones/, 'Si miras las creaciones');
    html = html.replace(/lo brillante de siempre/, 'lo llamativo de siempre');
    html = html.replace(/cubren gran parte/, 'cubren una gran parte');

    // Chunk 2
    html = html.replace(/aire rebelde y femenino/, 'toque rebelde y femenino');
    html = html.replace(/piezas singulares/, 'piezas únicas');
    html = html.replace(/te estafan f.cilmente/, 'y te estafan fácilmente');
    html = html.replace(/Uno termina mirando/, 'Así, uno termina mirando');
    html = html.replace(/evitas inconvenientes/, 'evitas problemas');

    // Chunk 3
    html = html.replace(/Deben estar perfectas/, 'Deben lucir perfectas');
    html = html.replace(/as. que verifica que/, 'por lo que verifica que');
    html = html.replace(/siempre empieza con GG/, 'siempre inicia con GG');
    html = html.replace(/malgastar su dinero/, 'perder su dinero');
    html = html.replace(/precisos y esto se percibe r.pidamente/, 'precisos y se percibe rápidamente');

    // Chunk 4
    html = html.replace(/bastantes a.os/, 'muchos años');
    html = html.replace(/Lanzan dise.os/, 'Crean diseños');
    html = html.replace(/es imposible pasar/, 'resulta imposible pasar');
    html = html.replace(/nos comparten tres trucos/, 'comparten tres trucos');
    html = html.replace(/arreglarte mucho para una/, 'arreglarte para una');

    // Chunk 5
    html = html.replace(/derivan de los deportes/, 'provienen de los deportes');
    html = html.replace(/llamar.s la atenci.n/, 'captarás la atención');
    html = html.replace(/atuendos originales/, 'conjuntos originales');
    html = html.replace(/Te pones un traje/, 'Si te pones un traje');

    // Chunk 6
    html = html.replace(/igual que los arist.cratas/, 'como los aristócratas');
    html = html.replace(/la gente se fija/, 'el público se fija');
    html = html.replace(/aspecto refinado/, 'estilo refinado');

    // Chunk 7
    html = html.replace(/Poco importa/, 'No importa');
    html = html.replace(/la ventaja es/, 'lo bueno es');
    html = html.replace(/busca misterio/, 'quiere misterio');
    html = html.replace(/la gente se fascina/, 'todos se fascinan');
    html = html.replace(/un truco infalible/, 'un método infalible');

    // call save function
    const { data: rpcData, error: rpcErr } = await supabase.rpc('save_task_version', {
        p_task_id: taskId,
        p_content_body: html,
        p_process_name: 'Prueba con Antigravity - Segunda Pasada'
    });
    
    if (rpcErr) {
        console.error('Error inserting version 3 via RPC:', rpcErr);
    } else {
        console.log('Version 3 created successfully via RPC!', rpcData);
    }
}
save().then(() => process.exit(0)).catch(e => console.error(e));
