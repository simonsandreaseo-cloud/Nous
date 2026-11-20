const fs = require('fs');
const path = require('path');

const MARCOS_DIR = path.join(__dirname, '..', 'banco_ontologico_semantico', 'marcos');

function auditItem(item, fileName) {
  const d = item.source_domain.toLowerCase();
  const t = item.raw_text.toLowerCase();

  let exclude = false;
  let excludeReason = '';

  // 1. Wikipedia encyclopedic check
  if (d.includes('wikipedia') || t.includes('wikipedia')) {
    exclude = true;
    excludeReason = 'WIKIPEDIA_ENCYCLOPEDIC';
  } 
  // 2. Off-topic, legal disclaimers, or footwear/fast fashion
  else if (t.includes('zapatilla') || t.includes('bota') || t.includes('senna') || 
             t.includes('mango:') || t.includes('lidl') || t.includes('zara tiene') || 
             t.includes('serraje') || t.includes('new balance') || t.includes('fondo europeo') ||
             t.includes('cámara de comercio') || t.includes('pyme innova') || t.includes('sostenibilidad')) {
    exclude = true;
    excludeReason = 'OFF_TOPIC_OR_LEGAL';
  } 
  // 3. Modern marketing lifestyle & pricing blogs
  else if (d.includes('trendencias') || d.includes('fresh') || d.includes('okchicas') ||
             t.includes('precio es de') || t.includes('euros') || t.includes('chollo')) {
    exclude = true;
    excludeReason = 'COMMERCIAL_MARKETING_LIFESTYLE';
  } 
  // 4. Retail promotional advertising copy (Afflelou)
  else if (d.includes('afflelou')) {
    if (t.includes('exclusivas para mujer') || t.includes('te otorgarán un estilo') || 
        t.includes('¡podrás elegir') || t.includes('sofisticadas') || 
        t.includes('lucir con tus mejores galas') || t.includes('noche más de lo normal') || 
        t.includes('tonic es un estilo') || t.includes('nuestro catálogo') || 
        t.includes('colección afflelou') || t.includes('beverly') || t.includes('alain afflelou') || 
        t.includes('acapulco') || t.includes('luigi') || t.includes('nuestra colección') ||
        t.includes('fantine') || t.includes('barkly') || t.includes('poseidón') || t.includes('ashford') ||
        t.includes('tonic cuenta con') || t.includes('afflelou completa')) {
      exclude = true;
      excludeReason = 'RETAIL_PROMOTIONAL_MARKETING';
    }
  }

  // Set exclusion fields
  if (exclude) {
    item.exclude_from_humanization = true;
    if (excludeReason === 'WIKIPEDIA_ENCYCLOPEDIC') {
      item.tier = 'EXCLUDED_ENCYCLOPEDIC';
      item.voice_category = 'ENCYCLOPEDIC_WIKIPEDIA';
    } else if (excludeReason === 'OFF_TOPIC_OR_LEGAL') {
      item.tier = 'EXCLUDED_OFF_TOPIC';
      item.voice_category = 'OFF_TOPIC';
    } else {
      item.tier = 'EXCLUDED_MARKETING';
      item.voice_category = 'MARKETING_CORPORATE_PR';
    }
  } else {
    item.exclude_from_humanization = false;
    // Set appropriate workshop tier
    if (d.includes('ricardovillalba') || d.includes('opticagasset') || d.includes('opticasflorida') || 
        d.includes('barraquer') || d.includes('opticabarrea') || d.includes('opticafernandezbaca') || 
        d.includes('catalogo_frases_raras') || d.includes('generaloptica') || d.includes('opticauniversitaria') ||
        d.includes('qvision') || d.includes('optiveropticos') || d.includes('vipsual') || d.includes('cottet')) {
      item.tier = 'TIER_1_WORKSHOP';
      item.voice_category = 'WORKSHOP_CLINICAL';
    } else {
      item.tier = 'TIER_2_EDITORIAL';
      item.voice_category = 'EDITORIAL_LIFESTYLE';
    }

    // Clean slot errors for approved items
    if (item.slots && item.slots.length > 0) {
      const cleanedSlots = [];
      let skeleton = item.syntactic_skeleton || item.raw_text;

      for (let s of item.slots) {
        const val = s.raw_value.toLowerCase();
        
        // Check if 'frente' is part of prepositional 'frente a'
        if (val === 'frente') {
          const rawLower = item.raw_text.toLowerCase();
          const matchPreposition = rawLower.includes('frente a') || rawLower.includes('frente al');
          const isFrameFront = rawLower.includes('el frente') || rawLower.includes('en el frente') || 
                               rawLower.includes('frentes intercambiables') || rawLower.includes('frentes al aire');
          
          if (matchPreposition && !isFrameFront) {
            // It's a prepositional functional head, NOT a slot!
            // Restore 'frente' in skeleton
            skeleton = skeleton.replace('[SLOT_FACIAL_FEATURE] a', 'frente a')
                               .replace('[SLOT_FACIAL_FEATURE] al', 'frente al');
            continue; // Do not add to slots
          } else if (isFrameFront) {
            // It's the frame front (optical component)
            s.slot_type = 'SLOT_COMPONENT';
            skeleton = skeleton.replace('[SLOT_FACIAL_FEATURE]', '[SLOT_COMPONENT]');
          }
        }
        cleanedSlots.push(s);
      }

      item.slots = cleanedSlots;
      item.slots_count = cleanedSlots.length;
      item.syntactic_skeleton = skeleton;
    }
  }

  return { item, exclude, excludeReason };
}

// 1. Process files
const targetFiles = ['material_composition.json', 'anatomical_fit.json', 'mechanical_function.json'];
const auditReport = {};

targetFiles.forEach(fileName => {
  const filePath = path.join(MARCOS_DIR, fileName);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  let approvedCount = 0;
  let excludedCount = 0;
  const reasonBreakdown = {};

  const processedData = data.map(item => {
    const res = auditItem(item, fileName);
    if (res.exclude) {
      excludedCount++;
      reasonBreakdown[res.excludeReason] = (reasonBreakdown[res.excludeReason] || 0) + 1;
    } else {
      approvedCount++;
    }
    return res.item;
  });

  // Save back updated file
  fs.writeFileSync(filePath, JSON.stringify(processedData, null, 2), 'utf8');

  auditReport[fileName] = {
    total: processedData.length,
    approved: approvedCount,
    excluded: excludedCount,
    reasons: reasonBreakdown
  };
});

console.log('Auditing of 3 frame files completed:');
console.log(JSON.stringify(auditReport, null, 2));
