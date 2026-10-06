$ErrorActionPreference = "Stop"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false

$base_path = Join-Path $PSScriptRoot "base.html"
$dir_path = $PSScriptRoot

$content = [System.IO.File]::ReadAllText($base_path, $utf8NoBom)

# Pass 1: hum1.html
$hum1 = $content
$hum1 = $hum1 -replace '(?i)\bExplora las exclusivas\b', 'Mira las re exclusivas'
$hum1 = $hum1 -replace '(?i)diseños hechos en Italia que deslumbran con su estética vanguardista', 'unas cosas hechas en Italia que brillan un monton con su estilo re loco!!!'
$hum1 = $hum1 -replace '(?i)volúmenes esculturales', 'tamaños gigantes'
$hum1 = $hum1 -replace '(?i)detalles artesanales de alta costura\.', 'detallitos a mano que parecen de ropa cara...'
$hum1 = $hum1 -replace '(?i)Comprar lentes nuevos para esta temporada no tiene que ser un lío', 'Pillar lentes nuevos ahora no es pa tanto...'
$hum1 = $hum1 -replace '(?i)elegimos tres opciones', 'agarramos tres opciones'
$hum1 = $hum1 -replace '(?i)que se ven bien, no cansan si las llevas todo el día y combinan con casi cualquier ropa\.', 'que se ven re bien, no te joden la cara en todo el dia y pegan con todo lo que te pongas!!!'
$hum1 = $hum1 -replace '(?i)Mucha gente busca ese toque italiano clásico', 'Todo el mundo anda buscando ese toque de Italia de siempre'
$hum1 = $hum1 -replace '(?i)al final destacan estos modelos equilibrados', 'y bueno... al final estos son los que mas zafan'
$hum1 = $hum1 -replace '(?i)que sirven para salir a caminar sin que pesen en la nariz', 'pa ir por ahi sin que te aplasten la nariz!!!'
$hum1 = $hum1 -replace '(?i)Nos fijamos en tres detalles simples para elegirlas', 'Vimos tres cosas basicas para elegirlas...'
$hum1 = $hum1 -replace '(?i)el marco tiene que aguantar el uso diario', 'el marco tiene que aguantar todo el uso'
$hum1 = $hum1 -replace '(?i)el peso debe sentirse parejo en las patillas', 'que el peso no tire pa un lado...'
$hum1 = $hum1 -replace '(?i)los cristales tienen que tapar el sol sin alterar los colores\.', 'y que los cristales tapen bien el sol sin que veas todo raro!!!'
$hum1 = $hum1 -replace '(?i)Llevan el sello metálico a los lados', 'Tienen como un fierrito a los lados'
$hum1 = $hum1 -replace '(?i)calzan bien en la cara', 'te quedan joya en la cara...'
$hum1 = $hum1 -replace '(?i)y no molestan para nada después de varias horas puestas\.', 'y cero molestias despues de horas y horas!!!'
$hum1 = $hum1 -replace '(?i)destacan en la campaña SS26 por su silueta ovalada', 'llaman full la atencion por su forma de huevo!!!'
$hum1 = $hum1 -replace '(?i)de inspiración cat-eye y su acetato pulido a mano', 'tipo ojo de gato loco y un plastico super lisito...'
$hum1 = $hum1 -replace '(?i)referencia oficial', 'el codigo ese'
$hum1 = $hum1 -replace '(?i)cubren muy bien la luz del sol para el día a día', 'tapan el solazo de todos los dias!!!'
$hum1 = $hum1 -replace '(?i)el emblema del Sagrado Corazón', 'el dibujito del corazon sagrado...'
$hum1 = $hum1 -replace '(?i)Las bisagras metálicas son bastante firmes y aguantan el uso continuo sin aflojarse con los meses\.', 'Los fierritos doblan super duro y no se ponen flojos ni a palos con los meses!!!'
$hum1 = $hum1 -replace '(?i)El puente queda bien asentado y así no se te resbalan de la nariz\.', 'La parte de la nariz queda clavada y no se resbala nada...'
$hum1 = $hum1 -replace '(?i)variante geométrica un poco más amplia', 'forma mas rara y grande!!!'
$hum1 = $hum1 -replace '(?i)rostros femeninos de proporciones medias', 'caras normales de chicas'
$hum1 = $hum1 -replace '(?i)estilizando los pómulos sin incomodar al usarlas\.', 'haciendo ver bien los cachetes sin joder!!!'
$hum1 = $hum1 -replace '(?i)Está hecho de acetato de alta densidad que soporta bien los cambios de temperatura del día a día y conserva su brillo durante años\.', 'Es de un material re grueso que aguanta el calor y el frio y brilla por años!!!'
$hum1 = $hum1 -replace '(?i)Incorpora lentes oscuras con protección 100% frente a los rayos UVA y UVB\.', 'Tienen vidrios oscuros que te salvan del sol al 100%...'
$hum1 = $hum1 -replace '(?i)Son de diseño italiano, vienen con su estuche oficial de fábrica y garantía de autenticidad', 'Son de Italia, traen su cajita original y garantia de que son de verdad!!!'
$hum1 = $hum1 -replace '(?i)El modelo DG4536 en acabado carey \(referencia oficial VG4536VP213\) queda bien con casi todo y es muy práctico para usar a diario\.', 'El cosito DG4536 ese de carey (el codigo VG4536VP213) queda bien con lo que sea y es re facil de usar todos los dias...'
$hum1 = $hum1 -replace '(?i)Aunque muchas clientas exploran', 'Aunque muchas chicas andan buscando!!!'
$hum1 = $hum1 -replace '(?i)mezclando tonos miel y castaño con lentes marrones degradadas', 'juntando colores miel y marron con lentes asi como en degradado...'
$hum1 = $hum1 -replace '(?i)Las varillas anchas se sienten firmes, con el alma metálica interior reforzando el acetato para darle gran resistencia\.', 'Las patillas son anchas y duras, con un fierro adentro para que no se rompan por nada!!!'
$hum1 = $hum1 -replace '(?i)La combinación de colores cálidos con los detalles barrocos consigue un efecto visual muy favorecedor:', 'Los colores esos calidos con los adornos raros hacen que te veas re bien...'
$hum1 = $hum1 -replace '(?i)Su silueta amplia de 55 mm con líneas suavizadas equilibra los rasgos marcados y favorece especialmente a rostros ovalados, cuadrados o rectangulares\.', 'Es grandota de 55 mm y hace que las caras cuadradas o alargadas se vean mejor!!!'
$hum1 = $hum1 -replace '(?i)El puente anatómico integrado en el propio acetato reparte el peso sin apretar, por lo que puedes usarlas todo el día sin que dejen marca\.', 'La nariz de plastico reparte el peso y no te deja marcas en la cara...'
$hum1 = $hum1 -replace '(?i)Incorpora el Sagrado Corazón \(Sacred Heart\) en relieve metálico en las varillas, resistente al uso diario\.', 'Tiene el corazon sagrado salido pa fuera en las patillas que aguanta todo!!!'
$hum1 = $hum1 -replace '(?i)Este diseño combina con cualquier conjunto;', 'Este modelito pega con lo que te pongas...'
$hum1 = $hum1 -replace '(?i)un clásico moderno que nunca pasa de moda\.', 'algo de siempre que no pasa de moda!!!'
$hum1 = $hum1 -replace '(?i)Para cerrar el podio está el DG4532, un modelo que encarna la vanguardia del eyewear de lujo de esta temporada\.', 'Y de ultimo el DG4532, es lo mas loco y lujoso que hay ahora...'
$hum1 = $hum1 -replace '(?i)Es un diseño de calibre 53 que se sale de lo convencional:', 'Es un tamaño 53 que nada que ver con lo aburrido de siempre!!!'
$hum1 = $hum1 -replace '(?i)tiene bordes biselados bien rectos y un marco esculpido que hace que la luz pegue distinto\.', 'tiene unos bordes como cortados re rectos y una forma que la luz le da super raro...'
$hum1 = $hum1 -replace '(?i)verás cómo las grandes firmas apuestan por estos perfiles facetados\.', 'vas a ver que todas las marcas andan sacando estas formas cortadas!!!'
$hum1 = $hum1 -replace '(?i)combina perfectamente el tono de la montura con las lentes', 'mezcla re bien el color del marco con los vidrios...'
$hum1 = $hum1 -replace '(?i)ofreciendo ligereza y sujeción firme para el uso diario', 'siendo super liviano y que no se cae para usar todos los dias!!!'
$hum1 = $hum1 -replace '(?i)Sus bordes tallados recuerdan al corte de una piedra preciosa, transmitiendo dinamismo y modernidad a simple vista\.', 'Los bordes esos parecen diamantes cortados, se ve super moderno y veloz...'
$hum1 = $hum1 -replace '(?i)Cuentan con protección frente a arañazos tanto en la montura como en las lentes para soportar la rutina diaria\.', 'Tienen algo para que no se rayen ni el marco ni los vidrios, aguantan todo el trajín!!!'
$hum1 = $hum1 -replace '(?i)Forma parte de las novedades más selectas del catálogo SS26, pensada para quienes buscan diferenciarse de las siluetas convencionales\.', 'Es de lo mas top de lo nuevo, pa los que quieren verse distintos a los demas...'

[System.IO.File]::WriteAllText("$dir_path\hum1.html", $hum1, $utf8NoBom)


# Pass 2: hum2.html
$hum2 = $hum1
$hum2 = $hum2 -replace '(?i)Revisamos en primicia las imágenes oficiales de la campaña', 'Vimos antes que nadie las fotitos esas oficiales de la campaña...'
$hum2 = $hum2 -replace '(?i)que marcan un hito en su evolución estilística:', 'que son como un boom en como hacen la ropa!!!'
$hum2 = $hum2 -replace '(?i)se nota que esta temporada la casa italiana apuesta por una dualidad entre el clasicismo romano y líneas depuradas\.', 'se re nota que ahora la marca de Italia junta lo viejo de Roma con cosas re simples y limpias... o sea que loco!!!'
$hum2 = $hum2 -replace '(?i)En la alta costura, la campaña femenina de Dolce&Gabbana adelanta lo que se va a usar después en todas las capitales de la moda:', 'En la ropa re cara, la campaña de chicas de Dolce&Gabbana muestra lo que todos van a usar despues por ahi...'
$hum2 = $hum2 -replace '(?i)mezclan la herencia mediterránea con formas más modernas, marcos pulidos a mano, bisagras firmes y detalles de metal bien integrados\.', 'juntan lo de siempre con formas raras, marcos lisitos, fierros duros y cosas de metal que quedan re bien!!!'
$hum2 = $hum2 -replace '(?i)¿Los modelos de la campaña ADV Donna SS26 están diseñados específicamente para mujer\?', '¿Las gafas estas nuevas son pa chicas nada mas???'
$hum2 = $hum2 -replace '(?i)Sí, los modelos de la línea ADV Donna SS26 están diseñados específicamente para mujer, cuidando la ergonomía facial, el equilibrio de calibres y la versatilidad estilística\.', 'Obvio, son pa chicas, pensaron en que no duelan en la cara, que el tamaño cuadre y que peguen con todo... o sea basico!!!'
$hum2 = $hum2 -replace '(?i)Te los puedes dejar puestos todo el día porque no cansan', 'Te las dejas todo el dia y ni te das cuenta...'
$hum2 = $hum2 -replace '(?i)se sienten cómodos sobre el puente nasal y mantienen ese aire elegante y actual propio de la firma\.', 'no joden en la nariz y se ven re elegantes como siempre hace esta gente!!!'
$hum2 = $hum2 -replace '(?i)Al analizar las novedades de Dolce&Gabbana para SS26, destacan tres propuestas clave dentro de la colección femenina:', 'Viendo lo nuevecito de Dolce&Gabbana, hay tres cosas que la rompen en la parte de mujeres...'
$hum2 = $hum2 -replace '(?i)Montura de acetato grueso con líneas sinuosas y el Sagrado Corazón en la bisagra', 'Marco de plastico regordete con curvitas y el corazon en el dobles!!!'
$hum2 = $hum2 -replace '(?i)disponible en negro sólido', 'la venden en negro total...'
$hum2 = $hum2 -replace '(?i)Conocida en el catálogo de pasarela como VG4536, presenta un frente amplio de 55 mm con varillas anchas y el emblema dorado en relieve', 'La VG4536 gigante de 55 mm con patillas gordas y el dibujito de oro que sobresale!!!'
$hum2 = $hum2 -replace '(?i)pensada para quienes buscan máxima cobertura y presencia\.', 'pa las que quieren taparse toda la cara y hacerse notar...'
$hum2 = $hum2 -replace '(?i)Estructura metálica delgada y ultraligera con lentes de 60 mm montadas al aire', 'Puro metal finito y super liviano con vidrios grandotes al aire!!!'
$hum2 = $hum2 -replace '(?i)y varillas de geometría estilizada que aportan un aire luminoso a un diseño contemporáneo\.', 'y patillas raras que te iluminan la cara mal...'
$hum2 = $hum2 -replace '(?i)Al sostener las Devotion Sunglasses se nota al instante la calidad:', 'Agarras estas Devotion y notas que son finas...'
$hum2 = $hum2 -replace '(?i)el acetato italiano se siente firme en la mano, pero al ponértelas resultan equilibradas y suaves al tacto', 'el plastico italiano es re duro, pero en la cara ni lo sientes!!!'
$hum2 = $hum2 -replace '(?i)razón por la cual suelen agotarse rápidamente en cada reposición de temporada\.', 'por eso se acaban a los dos dias...'
$hum2 = $hum2 -replace '(?i)Lo que más llama la atención son los adornos laterales:', 'Lo mas loco son los cositos de los lados!!!'
$hum2 = $hum2 -replace '(?i)traen el icónico Sagrado Corazón \(Sacred Heart\) labrado en metal dorado con detalles de orfebrería barroca que encajan con precisión en la patilla ancha\.', 'tienen el corazon ese dorado con un monton de adornos raros que calzan justo en la patillota...'

[System.IO.File]::WriteAllText("$dir_path\hum2.html", $hum2, $utf8NoBom)


# Pass 3: hum2_surg1.html (< 5% edits, targeted upgrades)
$surg1 = $hum2
$surg1 = $surg1 -replace '(?i)Mira las re exclusivas', 'Explora las exclusivas'
$surg1 = $surg1 -replace '(?i)forma mas rara y grande!!!', 'variante geométrica amplia.'
$surg1 = $surg1 -replace '(?i)cero molestias despues de horas y horas!!!', 'sin molestias tras horas de uso continuo.'
$surg1 = $surg1 -replace '(?i)tamaños gigantes', 'volúmenes esculturales'
$surg1 = $surg1 -replace '(?i)El cosito DG4536 ese de carey', 'El modelo DG4536 en acabado carey'
$surg1 = $surg1 -replace '(?i)el dibujito', 'el emblema'
$surg1 = $surg1 -replace '(?i)salido pa fuera', 'en relieve metálico'

[System.IO.File]::WriteAllText("$dir_path\hum2_surg1.html", $surg1, $utf8NoBom)


# Pass 4: hum2_surg2.html (< 5% edits, targeted upgrades)
$surg2 = $surg1
$surg2 = $surg2 -replace '(?i)Tienen como un fierrito a los lados', 'Incorporan detalles metálicos laterales'
$surg2 = $surg2 -replace '(?i)cajita original', 'estuche oficial'
$surg2 = $surg2 -replace '(?i)la venden en negro total...', 'disponible en negro sólido...'
$surg2 = $surg2 -replace '(?i)no joden en la nariz', 'se asientan cómodamente en el puente nasal'
$surg2 = $surg2 -replace '(?i)pensaron en que no duelan en la cara', 'cuidando la ergonomía facial'
$surg2 = $surg2 -replace '(?i)plastico super lisito', 'acetato pulido'

[System.IO.File]::WriteAllText("$dir_path\hum2_surg2.html", $surg2, $utf8NoBom)
