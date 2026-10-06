import re
import os

filepath = r"C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/49eee171-a092-458d-92a1-f23a78b502c0/surg2.html"
out_filepath = r"C:/Users/Simon San/Documents/Simón SEO/Desarrollos/Nous/Staging/goal_17/tasks/49eee171-a092-458d-92a1-f23a78b502c0/surg3.html"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = [
    (r"pa saber si sirven cada dia, obvio\.", r"para determinar su utilidad diaria."),
    (r"suben el look de verano un monton, o sea, y", r"elevan el look de verano notablemente, y"),
    (r"te tiras encima una camisa", r"te colocas una camisa"),
    (r"marcan un montón la moda", r"influencian significativamente la moda"),
    (r"usa eso de <strong>prêt-à-porter</strong> pa la ropa cara normal", r"emplea el término <strong>prêt-à-porter</strong> para la indumentaria regular"),
    (r"trajes flojos", r"trajes holgados"),
    (r"no sufres con la temperatura", r"mitigas los efectos del calor"),
    (r"funcionan de diez", r"funcionan perfectamente"),
    (r"Que tanto duran y textura", r"Durabilidad y textura"),
    (r"saca telas nuevas y raras", r"desarrolla tejidos innovadores"),
    (r"te toca cuidarla el doble", r"requiere mayor precaución"),
    (r"el maltrato diario en la calle", r"el uso urbano intensivo"),
    (r"dura un montón", r"es sumamente duradero"),
    (r"se banca los golpes", r"resiste los impactos"),
    (r"Casi todos ubican esta marca", r"La mayoría reconoce esta marca"),
    (r"viene bárbaro para caminar", r"resulta ideal para caminar"),
    (r"al toque por su suela", r"inmediatamente por su suela"),
    (r"Guias pa Vestirse", r"Guías de Estilo"),
    (r"te saca del apuro", r"resulta muy práctica")
]

new_content = content
for old, new in replacements:
    new_content = re.sub(old, new, new_content)

with open(out_filepath, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Edits applied successfully.")
