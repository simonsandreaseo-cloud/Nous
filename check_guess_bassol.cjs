const modelsFromRef = [
  { refPid: 'GU025553QQQ-01B', section: 'Oval 01', marcolin: 'GU00255', size: '53', color: '01B', desc: 'Cat Eye Sunglasses Black' },
  { refPid: 'GU025959QQQ-01B', section: 'Oval 02', marcolin: 'GU00259', size: '59', color: '01B', desc: 'Butterfly Sunglasses Black' },
  { refPid: 'GU019956QQQ-05B', section: 'Oval 03', marcolin: 'GU00199', size: '56', color: '05B', desc: 'Pilot/Navigator Sunglasses' },
  { refPid: 'GU025254QQQ-52E', section: 'Oval 04', marcolin: 'GU00252', size: '54', color: '52E', desc: 'Square Sunglasses Brown' },
  { refPid: 'GU025757QQQ-52F', section: 'Round 01', marcolin: 'GU00257', size: '57', color: '52F', desc: 'Geometric/Square Havana' },
  { refPid: 'GU019956QQQ-52F', section: 'Round 02', marcolin: 'GU00199', size: '56', color: '52F', desc: 'Pilot/Navigator Havana' },
  { refPid: 'GU026860QQQ-32F', section: 'Round 03', marcolin: 'GU00268', size: '60', color: '32F', desc: 'Metal Geometric Gold/Brown' },
  { refPid: 'GU026152QQQ-01A', section: 'Round 04', marcolin: 'GU00261', size: '52', color: '01A', desc: 'Oval Sunglasses Black' },
  { refPid: 'GU026656QQQ-01B', section: 'Heart 01', marcolin: 'GU00266', size: '56', color: '01B', desc: 'Square Sunglasses Black' },
  { refPid: 'GU026757QQQ-01B', section: 'Heart 02', marcolin: 'GU00267', size: '57', color: '01B', desc: 'Cat-Eye/Rectangular Black' },
  { refPid: 'GU026056QQQ-32G', section: 'Heart 03', marcolin: 'GU00260', size: '56', color: '32G', desc: 'Round Metal Gold' },
  { refPid: 'GU025658QQQ-01B', section: 'Heart 04', marcolin: 'GU00256', size: '58', color: '01B', desc: 'Cat Eye Sunglasses Black' },
  { refPid: 'GU026056QQQ-28B', section: 'Square 01', marcolin: 'GU00260', size: '56', color: '28B', desc: 'Round Sunglasses Brown/Gold' },
  { refPid: 'GU025959QQQ-28B', section: 'Square 02', marcolin: 'GU00259', size: '59', color: '28B', desc: 'Butterfly Sunglasses Brown' },
  { refPid: 'GU026250QQQ-28Y', section: 'Square 03', marcolin: 'GU00262', size: '50', color: '28Y', desc: 'Oval Sunglasses Purple' },
  { refPid: 'GU025553QQQ-48F', section: 'Square 04', marcolin: 'GU00255', size: '53', color: '48F', desc: 'Cat Eye Brown' }
];

async function checkBassol() {
  const uniqueCodes = [...new Set(modelsFromRef.map(m => m.marcolin))];
  for (const code of uniqueCodes) {
    const url = `https://www.opticabassol.com/search/suggest.json?q=${code}&resources[type]=product`;
    const res = await fetch(url);
    const data = await res.json();
    const prods = data?.resources?.results?.products || [];
    console.log(`\n=== ${code} (Found ${prods.length} in Óptica Bassol) ===`);
    prods.forEach(p => {
      console.log(`  - [${p.id}] ${p.title} -> https://www.opticabassol.com/products/${p.handle} (Available: ${p.available})`);
    });
  }
}

checkBassol();
