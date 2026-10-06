const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wswylghsczgusgagucbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indzd3lsZ2hzY3pndXNnYWd1Y2JkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTc1MTA5MCwiZXhwIjoyMDk1MzI3MDkwfQ.ZM8GmFun3IonP5ZTUXmpzmb3ImzU_E4xhf3gdbNruEE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function save() {
    const versionId = '6dc8f639-7bb8-4451-833a-1ebc07a5f806';
    const taskId = '9240d45b-6ad4-4c60-9e6f-cc5fa5314db9';
    // fetch original html again
    const { data: contents } = await supabase.from('task_contents').select('content_body').eq('id', taskId).single();
    let html = contents.content_body;
    
    // Chunk 1
    html = html.replace(/Gucci lanz. lentes inmensos para atraer miradas, aunque otras marcas siguen la tendencia/, 'Gucci lanzó lentes inmensos para atraer miradas, y otras marcas siguen la tendencia');
    html = html.replace(/El mercado del lujo se parti. en dos bandos, mientras algunas empresas/, 'El mercado del lujo se partió en dos bandos: mientras algunas empresas');
    html = html.replace(/Las firmas exclusivas siguen este camino, la gente paga mucho dinero y solo quiere llamar la atenci.n en la calle, pues el negocio opera as../, 'Las firmas exclusivas siguen este camino; la gente paga mucho dinero y solo quiere llamar la atención en la calle, pues el negocio opera así.');
    html = html.replace(/te das cuenta r.pidamente de que son propuestas muy distintas/, 'notarás rápidamente que son propuestas muy distintas');
    html = html.replace(/probablemente quieren que la gente se vea m.s intelectual/, 'probablemente buscan que la gente se vea más intelectual');

    // Chunk 2
    html = html.replace(/Cada marca tiene su forma de entender la moda joven, f.jate en los/, 'Cada marca tiene su forma de entender la moda joven; fíjate en los');
    html = html.replace(/A.aden cristales brillantes que llaman la atenci.n./, 'Añaden cristales brillantes que captan la atención.');
    html = html.replace(/Parecen esculturas faciales, destacan tu estilo, no importa qu. ropa lleves puesta./, 'Parecen esculturas faciales que destacan tu estilo, sin importar qué ropa lleves puesta.');
    html = html.replace(/Por ello, comprar prendas caras es un peligro/, 'Por ello, adquirir prendas caras es un riesgo');
    html = html.replace(/A esas marcas italianas las falsifican en cada esquina, ves copias deficientes/, 'A esas marcas italianas las falsifican en cada esquina; ves copias deficientes');
    html = html.replace(/Uno termina mirando las costuras casi con lupa, ya que sale mejor ir/, 'Uno termina mirando los detalles casi con lupa, ya que resulta mejor ir');

    // Chunk 3
    html = html.replace(/Asimismo, f.jate en las patas y las bisagras. Tienen que estar perfectas, unos Gucci originales abren suavemente y nunca rechinan./, 'Asimismo, fíjate en las varillas y las bisagras. Deben estar perfectas; unos Gucci originales abren suavemente y nunca rechinan.');
    html = html.replace(/as. que revisa que las letras internas se lean con claridad./, 'así que verifica que las letras internas se lean con claridad.');
    html = html.replace(/Adem.s, en la otra pata viene el n.mero del modelo. Ese c.digo casi siempre empieza con GG, incluye cuatro n.meros e indica el color, a veces hasta la medida del marco./, 'Además, en la otra varilla viene el número del modelo. Ese código casi siempre empieza con GG, incluye cuatro números e indica el color, a veces incluso la medida del marco.');
    html = html.replace(/Nadie quiere malgastar su dinero, as. que es mejor optar por la seguridad, revisa esta gu.a/, 'Nadie quiere malgastar su dinero, así que es mejor optar por la seguridad; revisa esta guía');
    html = html.replace(/Eyewear, los falsificadores siempre ejecutan incorrectamente los grabados del cristal, nunca les quedan precisos y se percibe/, 'Eyewear; los falsificadores siempre ejecutan incorrectamente los grabados del cristal, nunca les quedan precisos y esto se percibe');

    // Chunk 4
    html = html.replace(/Estas gafas no son solo para ostentaci.n. Te van a durar numerosos a.os./, 'Estas gafas no son solo para ostentación, te van a durar bastantes años.');
    html = html.replace(/Sacan dise.os nuevos y hacen el trabajo a mano, tienen ese estilo/, 'Lanzan diseños nuevos y hacen el trabajo a mano; tienen ese estilo');
    html = html.replace(/Gu.a de estilo, c.mo combinar tus gafas m.scara en 2026/, 'Guía de estilo: cómo combinar tus gafas máscara en 2026');
    html = html.replace(/Adem.s, en ..ptica Bassol nos comparten tres trucos muy sencillos para crear tu look, aplicables para caminar por la calle o si te toca arreglarte mucho para una fiesta elegante./, 'Además, en Óptica Bassol comparten tres trucos muy sencillos para crear tu look, aplicables para caminar por la calle o si te toca arreglarte para una fiesta elegante.');

    // Chunk 5
    html = html.replace(/derivan de los deportes, y quedan fant.sticas/, 'derivan de los deportes y quedan fantásticas');
    html = html.replace(/aunque yo prefiero una sudadera/, 'aunque prefiero una sudadera');
    html = html.replace(/aunque a veces resulta intimidante./, 'aunque a veces resulte intimidante.');
    html = html.replace(/la gente te mira y te ves espectacular./, 'la gente te observa y te ves espectacular.');

    // Chunk 6
    html = html.replace(/vacaciones en Ibiza, elige unos lentes/, 'vacaciones en Ibiza; elige unos lentes');
    html = html.replace(/llaman la atenci.n y luego combinas la prenda con pantalones bien holgados, te calzas unas sandalias de cuero/, 'llaman la atención, y luego combinas la prenda con pantalones bien holgados y unas sandalias de cuero');
    html = html.replace(/un toque muy relajado, parece que sacaste/, 'un toque muy relajado; parece que sacaste');

    // Chunk 7
    html = html.replace(/Por qu. usamos gafas tipo m.scara, el escudo de nuestra identidad hoy en d.a/, 'Por qué usamos gafas tipo máscara: el escudo de nuestra identidad hoy en día');
    html = html.replace(/sensaci.n peculiar, te cubren media cara/, 'sensación peculiar: te cubren media cara');
    html = html.replace(/miras a la gente con total libertad/, 'miras a los demás con total libertad');
    html = html.replace(/as., me siento seguro al salir con ellas./, 'así, me siento más seguro al salir con ellas.');
    html = html.replace(/se cubren la cara con gafas enormes/, 'se cubren el rostro con gafas enormes');
    html = html.replace(/Ese es el verdadero lujo. Decides qu. partes/, 'Ese es el verdadero lujo: decides qué partes');

    // update version
    const { data: vData, error: vErr } = await supabase.from('task_versions').update({ content_body: html }).eq('id', versionId).select();
    if (vErr) {
        console.error('Error updating version:', vErr);
    } else {
        console.log('Version updated successfully!', vData[0].id);
    }
}
save().then(() => process.exit(0)).catch(e => console.error(e));
