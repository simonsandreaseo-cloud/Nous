const fs = require('fs');

let html = fs.readFileSync('task_final_polished_authentic.html', 'utf8');

// Unlink duplicate forced links in the Top 3 intro paragraph while keeping the prose intact
html = html.replace(
  /<p>Me agradan mucho los <a[^>]*>modelos de gafas Dolce&amp;Gabbana originales<\/a>, te las zampas con unos jeans, quedas al tiro, la raza se te queda viendo, hay mucho mirón\. Luego ando con flojera de pensar qué ponerme, me pongo a ver <a[^>]*>lo que se va a usar en gafas de aviador para el 2026<\/a>, todos van a traer de esas, le madrugo\.<\/p>/,
  '<p>Me agradan mucho los modelos de gafas Dolce&amp;Gabbana originales, te las zampas con unos jeans, quedas al tiro, la raza se te queda viendo, hay mucho mirón. Luego ando con flojera de pensar qué ponerme, me pongo a ver lo que se va a usar en gafas de aviador para el 2026, todos van a traer de esas, le madrugo.</p>'
);

fs.writeFileSync('task_final_polished_authentic.html', html, 'utf8');
console.log('Successfully unlinked duplicate intro links.');
