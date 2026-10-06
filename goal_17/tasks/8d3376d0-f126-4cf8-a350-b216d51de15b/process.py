import os

base_path = r"C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/8d3376d0-f126-4cf8-a350-b216d51de15b/base.html"
hum1_path = r"C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/8d3376d0-f126-4cf8-a350-b216d51de15b/hum1.html"
surg1_path = r"C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/8d3376d0-f126-4cf8-a350-b216d51de15b/surg1.html"
surg2_path = r"C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/8d3376d0-f126-4cf8-a350-b216d51de15b/surg2.html"

with open(base_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Hum1: Humanización (mediocre, simple, broken coherence)
hum1_text = text.replace("Los códigos estilísticos de Dolce&amp;Gabbana se encuentran con la belleza única de Roma en la nueva campaña de gafas Primavera-Verano 2026 (SS26), una propuesta que combina el atractivo atemporal de la Ciudad Eterna con monturas de estética minimalista y detalles artesanales inconfundibles.", 
"El estilo de Dolce&amp;Gabbana se mezcla con Roma en esta campaña Primavera-Verano 2026 (SS26). ¡Wow! Es que junta lo clásico con monturas super simples y esos detalles a mano que no fallan.")

hum1_text = hum1_text.replace("La marca italiana presentó unos anteojos nuevos que lucen diseños muy llamativos y se sienten resistentes; si ves las fotografías oficiales de la campaña",
"La marca de Italia sacó unos lentes nuevos ¡re locos! y súper duros, miras las fotos de la campaña")

hum1_text = hum1_text.replace("A continuación presentamos los tres modelos que más resaltan, revisados para comprobar su comodidad y ajuste en el día a día.",
"Acá te tiro los tres que más pintan, los revisé para ver si son cómodos de verdad todos los días.")

hum1_text = hum1_text.replace("Es el modelo masculino de montura rectangular en acetato negro que protagoniza las imágenes principales de la campaña. Llama la atención enseguida, no te cansa la nariz",
"Es el modelo de hombre rectangular de acetato negro que sale en todas las fotos. ¡Llama un montón! Y no te cansa nada la nariz")

hum1_text = hum1_text.replace("Aparecen en los retratos femeninos de la nueva campaña y se ven espectaculares: tienen una silueta ovalada de inspiración",
"Salen en las fotos de mujer de la campaña y ¡uf, se ven tremendos! Tienen esa forma ovalada tipo")

hum1_text = hum1_text.replace("Son anteojos muy útiles para conservar a mano todos los días: el modelo DG4513 es ideal tanto para la oficina como para pasear el fin de semana",
"Son esos lentes re útiles para tener ahí siempre, el DG4513 sirve para el trabajo o para dar una vuelta el finde")

with open(hum1_path, 'w', encoding='utf-8') as f:
    f.write(hum1_text)


# Surg1: Edición Quirúrgica (< 5% edits, targeted vocabulary upgrades)
surg1_text = hum1_text.replace("¡Wow! Es que junta lo clásico", "¡Sorprendente! Porque entrelaza lo clásico")
surg1_text = surg1_text.replace("¡re locos!", "muy audaces")
surg1_text = surg1_text.replace("Acá te tiro los tres que más pintan", "Aquí te destaco los tres más notables")
surg1_text = surg1_text.replace("¡Llama un montón!", "¡Destaca sobremanera!")

with open(surg1_path, 'w', encoding='utf-8') as f:
    f.write(surg1_text)


# Surg2: Edición Quirúrgica 2 cumulatively
surg2_text = surg1_text.replace("súper duros", "altamente resistentes")
surg2_text = surg2_text.replace("¡uf, se ven tremendos!", "lucen fenomenales.")
surg2_text = surg2_text.replace("esos lentes re útiles", "esos lentes sumamente funcionales")

with open(surg2_path, 'w', encoding='utf-8') as f:
    f.write(surg2_text)
