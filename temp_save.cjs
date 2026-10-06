const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function save() {
    const taskId = '9240d45b-6ad4-4c60-9e6f-cc5fa5314db9';
    // fetch original html
    const { data: contents } = await supabase.from('task_contents').select('content_body').eq('id', taskId).single();
    let html = contents.content_body;
    
    // replacements
    html = html.replace(
        `Gucci lanzó lentes inmensos para atraer miradas, aunque otras marcas siguen la tendencia. El mercado del lujo se partió en dos bandos, mientras algunas empresas venden artículos simples y pequeños, las más famosas crean diseños enormes que cubren el rostro, evocando una moda retro. Las firmas exclusivas siguen este camino, la gente paga mucho dinero y solo quiere llamar la atención en la calle, pues el negocio opera así.`,
        `Gucci lanzó lentes inmensos para atraer miradas, y otras marcas siguen la tendencia. El mercado del lujo se partió en dos bandos: mientras algunas empresas venden artículos simples y pequeños, las más famosas crean diseños enormes que cubren el rostro, evocando una moda retro. Las firmas exclusivas siguen este camino; la gente paga mucho dinero y solo quiere llamar la atención en la calle, pues el negocio opera así.`
    );
    html = html.replace(
        `te das cuenta rápidamente de que son propuestas muy distintas. Prada aplica cortes inusuales al acetato, parecen diseños arquitectónicos en el rostro, probablemente quieren que la gente se vea más intelectual.`,
        `notarás rápidamente que son propuestas muy distintas. Prada aplica cortes inusuales al acetato, parecen diseños arquitectónicos en el rostro, probablemente buscan que la gente se vea más intelectual.`
    );
    html = html.replace(
        `Cada marca tiene su forma de entender la moda joven, fíjate en los`,
        `Cada marca tiene su forma de entender la moda joven; fíjate en los`
    );
    html = html.replace(`Añaden cristales brillantes que llaman la atención.`, `Añaden cristales brillantes que captan la atención.`);
    html = html.replace(`Parecen esculturas faciales, destacan tu estilo, no importa qué ropa lleves puesta.`, `Parecen esculturas faciales que destacan tu estilo, sin importar qué ropa lleves puesta.`);
    html = html.replace(`Por ello, comprar prendas caras es un peligro`, `Por ello, adquirir prendas caras es un riesgo`);
    html = html.replace(`A esas marcas italianas las falsifican en cada esquina, ves copias deficientes`, `A esas marcas italianas las falsifican en cada esquina; ves copias deficientes`);
    html = html.replace(`Uno termina mirando las costuras casi con lupa, ya que sale mejor ir`, `Uno termina mirando los detalles casi con lupa, ya que resulta mejor ir`);
    
    html = html.replace(`Asimismo, fíjate en las patas y las bisagras. Tienen que estar perfectas, unos Gucci originales abren suavemente y nunca rechinan.`, `Asimismo, fíjate en las varillas y las bisagras. Deben estar perfectas; unos Gucci originales abren suavemente y nunca rechinan.`);
    html = html.replace(`así que revisa que las letras internas se lean con claridad.`, `así que verifica que las letras internas se lean con claridad.`);
    html = html.replace(`Además, en la otra pata viene el número del modelo. Ese código casi siempre empieza con GG, incluye cuatro números e indica el color, a veces hasta la medida del marco.`, `Además, en la otra varilla viene el número del modelo. Ese código casi siempre empieza con GG, incluye cuatro números e indica el color, a veces incluso la medida del marco.`);
    html = html.replace(`Nadie quiere malgastar su dinero, así que es mejor optar por la seguridad, revisa esta guía`, `Nadie quiere malgastar su dinero, así que es mejor optar por la seguridad; revisa esta guía`);
    html = html.replace(`Eyewear, los falsificadores siempre ejecutan incorrectamente los grabados del cristal, nunca les quedan precisos y se percibe`, `Eyewear; los falsificadores siempre ejecutan incorrectamente los grabados del cristal, nunca les quedan precisos y esto se percibe`);
    
    html = html.replace(`Estas gafas no son solo para ostentación. Te van a durar numerosos años.`, `Estas gafas no son solo para ostentación, te van a durar bastantes años.`);
    html = html.replace(`Sacan diseños nuevos y hacen el trabajo a mano, tienen ese estilo`, `Lanzan diseños nuevos y hacen el trabajo a mano; tienen ese estilo`);
    html = html.replace(`<h2>Guía de estilo, cómo combinar tus gafas máscara en 2026</h2>`, `<h2>Guía de estilo: cómo combinar tus gafas máscara en 2026</h2>`);
    html = html.replace(`Además, en Óptica Bassol nos comparten tres trucos muy sencillos para crear tu look, aplicables para caminar por la calle o si te toca arreglarte mucho para una fiesta elegante.`, `Además, en Óptica Bassol comparten tres trucos muy sencillos para crear tu look, aplicables para caminar por la calle o si te toca arreglarte para una fiesta elegante.`);
    
    html = html.replace(`derivan de los deportes, y quedan fantásticas`, `derivan de los deportes y quedan fantásticas`);
    html = html.replace(`aunque yo prefiero una sudadera`, `aunque prefiero una sudadera`);
    html = html.replace(`aunque a veces resulta intimidante.`, `aunque a veces resulte intimidante.`);
    html = html.replace(`la gente te mira y te ves espectacular.`, `la gente te observa y te ves espectacular.`);
    
    html = html.replace(`vacaciones en Ibiza, elige unos lentes`, `vacaciones en Ibiza; elige unos lentes`);
    html = html.replace(`llaman la atención y luego combinas la prenda con pantalones bien holgados, te calzas unas sandalias de cuero`, `llaman la atención, y luego combinas la prenda con pantalones bien holgados y unas sandalias de cuero`);
    html = html.replace(`un toque muy relajado, parece que sacaste`, `un toque muy relajado; parece que sacaste`);
    
    html = html.replace(`<h2>Por qué usamos gafas tipo máscara, el escudo de nuestra identidad hoy en día</h2>`, `<h2>Por qué usamos gafas tipo máscara: el escudo de nuestra identidad hoy en día</h2>`);
    html = html.replace(`sensación peculiar, te cubren media cara`, `sensación peculiar: te cubren media cara`);
    html = html.replace(`miras a la gente con total libertad`, `miras a los demás con total libertad`);
    html = html.replace(`así, me siento seguro al salir con ellas.`, `así, me siento más seguro al salir con ellas.`);
    html = html.replace(`se cubren la cara con gafas enormes`, `se cubren el rostro con gafas enormes`);
    html = html.replace(`Ese es el verdadero lujo. Decides qué partes`, `Ese es el verdadero lujo: decides qué partes`);

    // call save function
    const { data: rpcData, error: rpcErr } = await supabase.rpc('save_task_version', {
        p_task_id: taskId,
        p_content_body: html,
        p_process_name: 'Prueba con Antigravity'
    });
    
    if (rpcErr) {
        console.error('Error inserting version via RPC:', rpcErr);
    } else {
        console.log('Version created successfully via RPC!', rpcData);
    }
}
save().then(() => process.exit(0)).catch(e => console.error(e));
