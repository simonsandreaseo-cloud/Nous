$file = 'task_01_limpiado_hum1.html'
$content = Get-Content $file -Raw -Encoding UTF8

$content = $content -replace 'venderá unas gafas muy grandes', 'lanzará unas gafas de gran formato'
$content = $content -replace 'van a costar mucha plata', 'supondrán una inversión significativa'
$content = $content -replace 'La gente te mirará en la calle', 'Atraerán todas las miradas'
$content = $content -replace 'la gente pide cosas nuevas', 'el público exige innovación'
$content = $content -replace 'Las cosas se ven perfectas', 'La visión es nítida'
$content = $content -replace 'armé una comparación, analizo esos detalles', 'elaboré una comparativa para analizar los detalles'
$content = $content -replace 'ropa rara para hacer juego', 'colecciones exclusivas a juego'
$content = $content -replace 'Muestran modelos raros ahora', 'Presentan modelos vanguardistas'
$content = $content -replace 'la gente comprará muchas', 'serán un éxito de ventas'
$content = $content -replace 'Nadie compra lentes normales', 'El público actual rechaza lo convencional'
$content = $content -replace 'hizo lentes gigantes', 'diseñó monturas de gran tamaño'
$content = $content -replace 'la gente paga mucho', 'el consumidor invierte cifras elevadas'
$content = $content -replace 'te roban el dinero fácil', 'existen riesgos de estafa'
$content = $content -replace 'Evita plásticos feos', 'Evita materiales de baja calidad'
$content = $content -replace 'te arreglas para una fiesta cara', 'te preparas para un evento exclusivo'
$content = $content -replace 'Llevo ropa rara a la oficina', 'Integro prendas audaces en la oficina'
$content = $content -replace 'juntas la camisa con pantalones grandes', 'combinas la camisa con pantalones amplios'
$content = $content -replace 'te pones unas Gucci gigantes', 'al usar unas Gucci oversize'

[IO.File]::WriteAllText('task_01_limpiado_surg1.html', $content, [System.Text.Encoding]::UTF8)
Write-Host "Done"
