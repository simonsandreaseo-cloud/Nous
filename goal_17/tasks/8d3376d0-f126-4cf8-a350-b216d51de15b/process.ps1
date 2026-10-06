$base_path = 'C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/8d3376d0-f126-4cf8-a350-b216d51de15b/base.html'
$hum1_path = 'C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/8d3376d0-f126-4cf8-a350-b216d51de15b/hum1.html'
$surg1_path = 'C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/8d3376d0-f126-4cf8-a350-b216d51de15b/surg1.html'
$surg2_path = 'C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/8d3376d0-f126-4cf8-a350-b216d51de15b/surg2.html'

$text = Get-Content -Path $base_path -Raw -Encoding UTF8

$hum1_text = $text.Replace("Los códigos estilísticos de Dolce&amp;Gabbana se encuentran con la belleza única de Roma en la nueva campaña de gafas Primavera-Verano 2026 (SS26), una propuesta que combina el atractivo atemporal de la Ciudad Eterna con monturas de estética minimalista y detalles artesanales inconfundibles.", "El estilo de Dolce&amp;Gabbana se mezcla con Roma en esta campaña Primavera-Verano 2026 (SS26). ¡Wow! Es que junta lo clásico con monturas súper simples y esos detalles a mano que no fallan.")
$hum1_text = $hum1_text.Replace("La marca italiana presentó unos anteojos nuevos que lucen diseños muy llamativos y se sienten resistentes; si ves las fotografías oficiales de la campaña", "La marca de Italia sacó unos lentes nuevos ¡re locos! y súper duros, miras las fotos de la campaña")
$hum1_text = $hum1_text.Replace("A continuación presentamos los tres modelos que más resaltan, revisados para comprobar su comodidad y ajuste en el día a día.", "Acá te tiro los tres que más pintan, los revisé para ver si son cómodos de verdad todos los días.")
$hum1_text = $hum1_text.Replace("Es el modelo masculino de montura rectangular en acetato negro que protagoniza las imágenes principales de la campaña. Llama la atención enseguida, no te cansa la nariz", "Es el modelo de hombre rectangular de acetato negro que sale en todas las fotos. ¡Llama un montón! Y no te cansa nada la nariz")
$hum1_text = $hum1_text.Replace("Aparecen en los retratos femeninos de la nueva campaña y se ven espectaculares: tienen una silueta ovalada de inspiración", "Salen en las fotos de mujer de la campaña y ¡uf, se ven tremendos! Tienen esa forma ovalada tipo")
$hum1_text = $hum1_text.Replace("Son anteojos muy útiles para conservar a mano todos los días: el modelo DG4513 es ideal tanto para la oficina como para pasear el fin de semana", "Son esos lentes re útiles para tener ahí siempre, el DG4513 sirve para el trabajo o para dar una vuelta el finde")

Set-Content -Path $hum1_path -Value $hum1_text -Encoding UTF8

$surg1_text = $hum1_text.Replace("¡Wow! Es que junta lo clásico", "¡Sorprendente! Porque entrelaza lo clásico")
$surg1_text = $surg1_text.Replace("¡re locos!", "muy audaces")
$surg1_text = $surg1_text.Replace("Acá te tiro los tres que más pintan", "Aquí te destaco los tres más notables")
$surg1_text = $surg1_text.Replace("¡Llama un montón!", "¡Destaca sobremanera!")
$surg1_text = $surg1_text.Replace("súper duros", "altamente resistentes")

Set-Content -Path $surg1_path -Value $surg1_text -Encoding UTF8

$surg2_text = $surg1_text.Replace("¡uf, se ven tremendos!", "lucen fenomenales.")
$surg2_text = $surg2_text.Replace("esos lentes re útiles", "esos lentes sumamente funcionales")
$surg2_text = $surg2_text.Replace("dar una vuelta el finde", "disfrutar el fin de semana")
$surg2_text = $surg2_text.Replace("monturas súper simples", "monturas de líneas depuradas")

Set-Content -Path $surg2_path -Value $surg2_text -Encoding UTF8
