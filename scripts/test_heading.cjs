function humanizeHeading(heading) {
  let clean = heading.trim();
  if (clean.includes(':')) {
    const parts = clean.split(':').map(p => p.trim());
    if (parts.length === 2) {
      const part1 = parts[0].toLowerCase();
      let part2 = parts[1].toLowerCase();
      if (part2.startsWith('el ')) part2 = part2.substring(3);
      clean = part1.charAt(0).toUpperCase() + part1.slice(1) + ' y las claves del ' + part2;
    }
  }
  clean = clean.replace(/^(\d+)\s+([A-Za-z])/g, (m, num, next) => {
    const nums = { '1': 'Un', '2': 'Dos', '3': 'Tres', '4': 'Cuatro', '5': 'Cinco' };
    return (nums[num] || num) + ' ' + next.toLowerCase();
  });
  return clean;
}

console.log('Heading 1:', humanizeHeading('Gafas de Sol Boho Chic: El Outfit Hippie Moderno'));
console.log('Heading 2:', humanizeHeading('2 Modelos de tendencia boho chic'));
console.log('Heading 3:', humanizeHeading('Chloé CH0105S 006 55'));
