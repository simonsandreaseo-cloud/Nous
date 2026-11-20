function testAssemble(brandModel, shape, mat, outfit, glitchIdx) {
  const isRound = shape.includes('redond') || shape.includes('oval') || shape.includes('mariposa');
  const isSquare = shape.includes('cuadrad') || shape.includes('geométric') || shape.includes('rectangul');
  const isAviator = shape.includes('aviador') || shape.includes('piloto');

  let presentationSentence = '';
  if (glitchIdx % 2 === 0) {
    presentationSentence = `Las ${brandModel} destacan como una de las elecciones predilectas si buscas una montura con personalidad propia.`;
  } else {
    presentationSentence = `Por su parte, el modelo ${brandModel} rescata el porte de las grandes colecciones que marcaron época.`;
  }

  let visagismSentence = '';
  if (isRound) {
    visagismSentence = `Para facciones angulosas o semblantes que piden suavizar los rasgos, las formas redondeadas proporcionan una armonía visual inmediata que sienta de maravilla con ${outfit}.`;
  } else if (isSquare) {
    visagismSentence = `Si tu rostro es más bien redondeado, este frontal con líneas rectas y ángulos definidos ayuda a equilibrar las facciones con un contraste nítido.`;
  } else if (isAviator) {
    visagismSentence = `Su estructura de doble puente estiliza el óvalo facial y asegura una cobertura amplia y despejada ante la luz solar.`;
  } else {
    visagismSentence = `Su silueta tradicional equilibra las proporciones del rostro sin sobrecargar la mirada.`;
  }

  let mechanicsSentence = '';
  if (mat.includes('metal') || mat.includes('titanio')) {
    mechanicsSentence = `El cuerpo en ${mat} aporta gran resistencia manteniendo una ligereza inigualable sobre la nariz y las sienes.`;
  } else {
    mechanicsSentence = `La montura de ${mat} es de las más buscadas por su solidez al tacto, aunque en el día a día se las conozca como gafas de pasta.`;
  }

  let glitchSentence = '';
  if (glitchIdx % 2 === 0) {
    glitchSentence = `¡Al tacto se nota la solidez del material!`;
  } else {
    glitchSentence = `La patilla ajusta con suavidad en las sienes sin apretar.`;
  }

  let closingSentence = '';
  if (glitchIdx % 2 === 0) {
    closingSentence = `Son piezas pensadas para acompañar cualquier jornada de verano sin complicaciones ante el espejo.`;
  } else {
    closingSentence = `Una montura con presencia que eleva de inmediato cualquier conjunto diario.`;
  }

  if (glitchIdx % 2 === 0) {
    return `${presentationSentence} ${visagismSentence} ${mechanicsSentence} ${glitchSentence} ${closingSentence}`;
  } else {
    return `${presentationSentence} ${visagismSentence} ${mechanicsSentence} ${glitchSentence}`;
  }
}

const c = testAssemble('Chloé CH0105S 006 55', 'redonda', 'acetato pulido', 'vestidos sueltos o prendas de lino', 0);
console.log('--- CHLOE ---');
console.log(c);

const g = testAssemble('Gucci GG1084S 003 54', 'geométrica', 'acetato pulido', 'diario', 1);
console.log('\n--- GUCCI ---');
console.log(g);
