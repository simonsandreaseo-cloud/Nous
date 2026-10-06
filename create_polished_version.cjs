const fs = require('fs');

const polishedHtml = `<h1>Dolce&amp;Gabbana x Ray-Ban: Colección Exclusiva Aviator</h1>
<p>Dolce&amp;Gabbana y Ray-Ban se unieron para presentar una colaboración exclusiva que fusiona la tradición artesanal italiana con las siluetas más icónicas de la historia óptica. Tomando como base los legendarios modelos Aviator Shooter y Outdoorsman II, esta colección reinventa los clásicos con monturas ligeras de metal dorado, acabados al aire de efecto flotante y detalles en nácar auténtico, diseñados para quienes buscan piezas de alta moda con personalidad atemporal.</p>

<h2>Top 3 Modelos Exclusivos Dolce&amp;Gabbana x Ray-Ban</h2>
<p>Descubre los modelos más destacados de esta colaboración exclusiva disponibles en <a target="_blank" rel="noopener" class="text-indigo-600 underline decoration-indigo-600/30 underline-offset-4 cursor-pointer hover:decoration-indigo-600 transition-colors" href="https://www.opticabassol.com/collections/gafas-de-sol-ray-ban">Óptica Bassol</a>, con calibres adaptados y combinaciones únicas de montura dorada y lentes tintadas:</p>

<h3>1. Ray-Ban x Dolce&amp;Gabbana Shooter (RB3138M)</h3>
<p>El modelo Shooter recupera uno de los diseños más emblemáticos del archivo de Ray-Ban, enriquecido con el toque sofisticado de Dolce&amp;Gabbana. A continuación te presentamos las especificaciones técnicas del modelo Shooter RB3138M:</p>
<ul>
  <li><strong>Calibre:</strong> 58 mm, con lentes clásicas en forma de lágrima que ofrecen una cobertura amplia y equilibrada sin sobrecargar el rostro.</li>
  <li><strong>Material del Marco:</strong> Montura de aleación metálica ligera en acabado dorado Arista, tratada para máxima durabilidad y resistencia a la corrosión.</li>
  <li><strong>Puente Icónico:</strong> Doble puente reforzado con el característico orificio central circular y una barra frontal superior elaborada en nácar auténtico.</li>
  <li><strong>Lentes:</strong> Cristales minerales de alta precisión óptica con protección UV400 total y tratamiento antirreflejos, grabados con los logotipos de ambas firmas.</li>
  <li><strong>Ajuste y Ergonomía:</strong> Almohadillas nasales anatómicas y varillas estilizadas que aseguran un soporte cómodo durante todo el día.</li>
</ul>
<p><a target="_blank" rel="noopener" class="text-indigo-600 underline decoration-indigo-600/30 underline-offset-4 cursor-pointer hover:decoration-indigo-600 transition-colors" href="https://www.opticabassol.com/products/ray-ban-rb3138m-001-71-58">Consigue tus Ray-Ban x Dolce&amp;Gabbana Shooter RB3138M aquí</a></p>

<h3>2. Ray-Ban x Dolce&amp;Gabbana Outdoorsman II (RB3029M - 58mm)</h3>
<p>Para quienes prefieren una presencia más imponente y deportiva sin perder la elegancia del lujo italiano, el modelo Outdoorsman II de 58 mm ofrece un perfil distintivo y contemporáneo:</p>

<table style="min-width: 50px;">
  <colgroup>
    <col style="min-width: 25px;">
    <col style="min-width: 25px;">
  </colgroup>
  <thead>
    <tr>
      <th>Característica</th>
      <th>Ventaja Óptica y Estética</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>Calibre 58 mm Amplio</strong></td>
      <td>Proporciona un campo de visión panorámico ideal para rostros medianos y anchos.</td>
    </tr>
    <tr>
      <td><strong>Barra Superior Gráfica</strong></td>
      <td>La barra superior pronunciada aporta solidez estructural y un perfil estético inconfundible.</td>
    </tr>
    <tr>
      <td><strong>Lentes Azul Espejado</strong></td>
      <td>Filtran los reflejos intensos del sol y brindan un contraste visual nítido y moderno.</td>
    </tr>
    <tr>
      <td><strong>Efecto Rimless Flotante</strong></td>
      <td>El espacio sutil entre el cristal y la montura exterior genera una ligereza visual vanguardista.</td>
    </tr>
  </tbody>
</table>
<p><a target="_blank" rel="noopener" class="text-indigo-600 underline decoration-indigo-600/30 underline-offset-4 cursor-pointer hover:decoration-indigo-600 transition-colors" href="https://www.opticabassol.com/products/ray-ban-rb3029m-001-55-58">Descubre las Ray-Ban x Dolce&amp;Gabbana Outdoorsman II RB3029M de 58mm en Óptica Bassol</a></p>

<h3>3. Ray-Ban x Dolce&amp;Gabbana Outdoorsman II (RB3029M - 54mm)</h3>
<p>La variante de calibre 54 mm del Outdoorsman II está diseñada para rostros más finos o para quienes buscan un ajuste más compacto y preciso, manteniendo todos los códigos de la colección:</p>
<ul>
  <li><strong>Estructura Metálica Arista:</strong> Marco dorado resistente y ligero que se asienta de manera suave sobre el puente nasal sin dejar marcas de presión.</li>
  <li><strong>Lentes Teardrop Espejadas:</strong> Cristales en tono azul espejado con protección ultravioleta completa que reducen la fatiga ocular en exteriores.</li>
  <li><strong>Detalles de Marca Compartida:</strong> Firmas discretas de Dolce&amp;Gabbana y Ray-Ban en los extremos de las lentes y en el interior de las varillas.</li>
</ul>
<p><a target="_blank" rel="noopener" class="text-indigo-600 underline decoration-indigo-600/30 underline-offset-4 cursor-pointer hover:decoration-indigo-600 transition-colors" href="https://www.opticabassol.com/products/ray-ban-rb3029m-001-55-53">Haz clic aquí para ver las Ray-Ban x Dolce&amp;Gabbana RB3029M de 54mm</a></p>

<h2>Diseño, Artesanía y Estética: Detalles Exclusivos de la Colección Aviator</h2>
<p>La colaboración entre Dolce&amp;Gabbana y Ray-Ban rinde tributo a un diseño legendario que ha marcado generaciones enteras de la moda. Reinterpretada por Domenico Dolce y Stefano Gabbana, la silueta Aviator evoluciona hacia una dimensión contemporánea que equilibra la nostalgia de los años 70 y 80 con acabados de alta costura.</p>

<blockquote><p><em>"El propósito fundamental de esta alianza histórica es deconstruir la silueta icónica para elevarla a la categoría de alta moda, transformando un clásico atemporal en un sueño contemporáneo."</em></p></blockquote>

<h3>Análisis de las Siluetas: Shooter vs. Outdoorsman II</h3>
<p>La colección se centra exclusivamente en dos reinterpretaciones de archivo:</p>
<ul>
  <li><strong>El Modelo Shooter (RB3138M):</strong> Destaca por su barra ciliar con inserciones de nácar auténtico y el círculo metálico central integrado en el puente, una seña de identidad histórica que aporta gran carácter vintage.</li>
  <li><strong>El Modelo Outdoorsman II (RB3029M):</strong> Se caracteriza por su barra frontal superior continua y definida, ofreciendo una línea gráfica más limpia y geométrica.</li>
</ul>

<h3>Innovación Estructural: El Efecto 'Rimless' Flotante</h3>
<p>Uno de los mayores avances técnicos de esta colaboración es la estructura al aire de la montura. Las lentes tipo lágrima quedan suspendidas mediante puntos de anclaje precisos, dejando un sutil espacio libre entre el borde del cristal y el marco metálico exterior. Esta técnica no solo aligera el peso total de las gafas, sino que aporta un aspecto futurista y refinado.</p>

<h3>Gama Cromática y Acabados de las Lentes</h3>
<p>La colección ofrece una cuidada selección de tonalidades inspiradas en la luminosidad mediterránea y el espíritu californiano:</p>
<ul>
  <li><strong>Tonos Transparentes y Degradados:</strong> Opciones en verde clásico, ámbar, rosa suave y azul claro para una visión relajada en cualquier momento del día.</li>
  <li><strong>Acabados Espejados:</strong> Variantes en azul vibrante, oro y naranja que intensifican la protección solar y realzan el impacto visual.</li>
</ul>

<h3>El Estuche de Piel como Accesorio de Moda</h3>
<p>Cada pieza de la colección Dolce&amp;Gabbana x Ray-Ban incluye un estuche rígido exclusivo confeccionado en piel genuina. Equipado con una correa de cuero y un mosquetón metálico dorado con detalles grabados de Dolce&amp;Gabbana, el estuche ha sido concebido para utilizarse como un accesorio de moda independiente, permitiendo llevarlo sujeto al cinturón o a bolsos de mano.</p>

<h2>Guía de Compra y Autenticidad en Óptica Bassol</h2>
<p>Al adquirir modelos de ediciones limitadas como la colección Dolce&amp;Gabbana x Ray-Ban, contar con distribuidores oficiales garantiza la máxima autenticidad y respaldo óptico. Puedes explorar más colecciones y modelos afines en las secciones especializadas de <a target="_blank" rel="noopener" class="text-indigo-600 underline decoration-indigo-600/30 underline-offset-4 cursor-pointer hover:decoration-indigo-600 transition-colors" href="https://www.opticabassol.com/collections/gafas-de-sol-dolce-gabbana">gafas de sol Dolce &amp; Gabbana</a> y en la guía sobre <a target="_blank" rel="noopener" class="text-indigo-600 underline decoration-indigo-600/30 underline-offset-4 cursor-pointer hover:decoration-indigo-600 transition-colors" href="https://www.opticabassol.com/en-at/blogs/news/eyewear-aviator-2026-trends">tendencias en gafas aviator</a> de Óptica Bassol.</p>

<ul>
  <li><strong>Grabado Láser de Seguridad:</strong> Comprueba los micropuntos y logotipos de ambas marcas grabados directamente en la superficie de los cristales.</li>
  <li><strong>Calidad de los Materiales:</strong> Verifica el tacto sólido del metal dorado Arista, la fluidez de las bisagras y los detalles pulidos en nácar.</li>
  <li><strong>Packaging y Documentación Completa:</strong> Las unidades oficiales incluyen estuche con mosquetón, paño de limpieza de microfibra de marca compartida y certificado de autenticidad.</li>
</ul>`;

fs.writeFileSync('task_polished.html', polishedHtml, 'utf8');
console.log('Saved task_polished.html with size:', polishedHtml.length);
