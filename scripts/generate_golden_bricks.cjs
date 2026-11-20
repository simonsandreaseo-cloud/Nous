const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', 'banco_ontologico_semantico', 'marcos', 'golden_material_mechanics.json');

const goldenBricks = [
  // ==========================================
  // MATERIAL_COMPOSITION (10 Bricks)
  // ==========================================
  {
    "donor_id": "golden_mm_01",
    "brick_id": "brick_005963",
    "source_domain": "opticasflorida.com",
    "source_origin": "retail_human_glitch",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MATERIAL_COMPOSITION",
    "rhetorical_relation": "CAT_01_AD_SENSUM",
    "glitch_type": "CAT_01_DISCORDANCIA_AD_SENSUM",
    "raw_text": "Las características principales de este tipo de gafas es que son sencillas, limpias, de colores simples, de montura fina de metal y con la lente en forma de lágrima.",
    "syntactic_skeleton": "Las características principales de este tipo de gafas es que son sencillas, limpias, de colores simples, de [SLOT_COMPONENT] fina de [SLOT_MATERIAL] y con la [SLOT_COMPONENT] en forma de lágrima.",
    "word_count": 29,
    "slots_count": 3,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "montura",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Frame", "Rim"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_MATERIAL_1",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "metal",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Material", "Metal", "Acetate", "Titanium"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_2",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "lente",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Lens", "Crystal"],
        "gender": "feminine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_COMPONENT",
      "has_pro_drop_subject": false,
      "terminal_focus": "SLOT_COMPONENT"
    },
    "metrics": {
      "originality_entropy_score": 0.98,
      "functional_token_ratio": 0.586,
      "has_human_glitch": true
    }
  },
  {
    "donor_id": "golden_mm_02",
    "brick_id": "brick_006291",
    "source_domain": "catalogo_frases_raras",
    "source_origin": "retail_human_glitch",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MATERIAL_COMPOSITION",
    "rhetorical_relation": "CAT_04_ANACOLUTHON_OR_PSEUDO_CLEFT",
    "glitch_type": "CAT_04_ANACOLUTO_HENDIDA_E_INFINITIVO_SUSTANTIVADO",
    "raw_text": "Al igual que se combinan distintos colores, también podemos encontrar diseños que combinan acabados de materiales, como son el metal y el acetato. De esta forma se logra no sólo mezclar matices si no también texturas sobre la montura.",
    "syntactic_skeleton": "Al igual que se combinan distintos colores, también podemos encontrar diseños que combinan acabados de materiales, como son el [SLOT_MATERIAL] y el [SLOT_MATERIAL]. De esta forma se logra no sólo mezclar matices si no también texturas sobre la [SLOT_COMPONENT].",
    "word_count": 38,
    "slots_count": 3,
    "slots": [
      {
        "slot_id": "SLOT_MATERIAL_1",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "metal",
        "syntactic_role": "subject_complement",
        "allowed_types": ["Material", "Metal", "Steel", "Titanium"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_MATERIAL_2",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "acetato",
        "syntactic_role": "subject_complement",
        "allowed_types": ["Material", "Acetate", "Cellulose", "Paste"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "montura",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Frame", "Chassis"],
        "gender": "feminine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_MATERIAL",
      "has_pro_drop_subject": true,
      "terminal_focus": "SLOT_COMPONENT"
    },
    "metrics": {
      "originality_entropy_score": 0.96,
      "functional_token_ratio": 0.605,
      "has_human_glitch": true
    }
  },
  {
    "donor_id": "golden_mm_03",
    "brick_id": "brick_006103",
    "source_domain": "opticauniversitaria.es",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MATERIAL_COMPOSITION",
    "rhetorical_relation": "CONCESSION_CONTRAST",
    "glitch_type": null,
    "raw_text": "Aunque el titanio puede sonar a material industrial, hace mucho tiempo que sus propiedades se han demostrado idóneas para fabricar gafas.",
    "syntactic_skeleton": "Aunque el [SLOT_MATERIAL] puede sonar a material industrial, hace mucho tiempo que sus [SLOT_PROPERTY] se han demostrado idóneas para fabricar [SLOT_COMPONENT].",
    "word_count": 21,
    "slots_count": 3,
    "slots": [
      {
        "slot_id": "SLOT_MATERIAL_1",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "titanio",
        "syntactic_role": "subject",
        "allowed_types": ["Material", "Titanium", "Carbon", "Alloy"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_PROPERTY_1",
        "slot_type": "SLOT_PROPERTY",
        "raw_value": "propiedades",
        "syntactic_role": "subject",
        "allowed_types": ["Property", "Qualities", "Attributes"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "gafas",
        "syntactic_role": "direct_object",
        "allowed_types": ["Component", "Glasses", "Eyewear", "Frames"],
        "gender": "feminine",
        "number": "plural"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_MATERIAL",
      "has_pro_drop_subject": false,
      "terminal_focus": "SLOT_COMPONENT"
    },
    "metrics": {
      "originality_entropy_score": 0.94,
      "functional_token_ratio": 0.571,
      "has_human_glitch": false
    }
  },
  {
    "donor_id": "golden_mm_04",
    "brick_id": "brick_006104",
    "source_domain": "opticauniversitaria.es",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MATERIAL_COMPOSITION",
    "rhetorical_relation": "CAT_03_ILLICIT_PUNCTUATION_BREAK",
    "glitch_type": "CAT_03_FRACTURA_ILICITA_TRAS_PUNTO",
    "raw_text": "En el ámbito de la óptica, las gafas con montura de titanio tienen un lugar destacado, ya que no sólo ofrecen gran resistencia, sino que aportan una ligereza inigualable.",
    "syntactic_skeleton": "En el ámbito de la óptica, las [SLOT_COMPONENT] con [SLOT_COMPONENT] de [SLOT_MATERIAL] tienen un lugar destacado, ya que no sólo ofrecen gran [SLOT_PROPERTY], sino que aportan una [SLOT_PROPERTY] inigualable.",
    "word_count": 28,
    "slots_count": 5,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "gafas",
        "syntactic_role": "subject",
        "allowed_types": ["Component", "Glasses", "Eyewear"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_COMPONENT_2",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "montura",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Frame", "Structure"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_MATERIAL_1",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "titanio",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Material", "Titanium", "Steel", "Metal"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_PROPERTY_1",
        "slot_type": "SLOT_PROPERTY",
        "raw_value": "resistencia",
        "syntactic_role": "direct_object",
        "allowed_types": ["Property", "Resistance", "Durability"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_PROPERTY_2",
        "slot_type": "SLOT_PROPERTY",
        "raw_value": "ligereza",
        "syntactic_role": "direct_object",
        "allowed_types": ["Property", "Lightness", "Comfort"],
        "gender": "feminine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_COMPONENT",
      "has_pro_drop_subject": false,
      "terminal_focus": "SLOT_PROPERTY"
    },
    "metrics": {
      "originality_entropy_score": 0.95,
      "functional_token_ratio": 0.536,
      "has_human_glitch": true
    }
  },
  {
    "donor_id": "golden_mm_05",
    "brick_id": "brick_006048",
    "source_domain": "opticauniversitaria.es",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MATERIAL_COMPOSITION",
    "rhetorical_relation": "DESCRIPTIVE_ELABORATION",
    "glitch_type": null,
    "raw_text": "Las gafas de acetato de celulosa, más conocidas como gafas de pasta, son un tipo de gafa muy común e ideal para cualquier montura.",
    "syntactic_skeleton": "Las [SLOT_COMPONENT] de [SLOT_MATERIAL], más conocidas como gafas de [SLOT_MATERIAL], son un tipo de gafa muy común e ideal para cualquier [SLOT_COMPONENT].",
    "word_count": 23,
    "slots_count": 4,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "gafas",
        "syntactic_role": "subject",
        "allowed_types": ["Component", "Glasses", "Eyewear"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_MATERIAL_1",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "acetato de celulosa",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Material", "Cellulose Acetate", "Bio-acetate"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_MATERIAL_2",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "pasta",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Material", "Paste", "Plastic"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_2",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "montura",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Frame", "Mount"],
        "gender": "feminine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_MATERIAL",
      "has_pro_drop_subject": false,
      "terminal_focus": "SLOT_COMPONENT"
    },
    "metrics": {
      "originality_entropy_score": 0.93,
      "functional_token_ratio": 0.522,
      "has_human_glitch": false
    }
  },
  {
    "donor_id": "golden_mm_06",
    "brick_id": "brick_006051",
    "source_domain": "opticauniversitaria.es",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MATERIAL_COMPOSITION",
    "rhetorical_relation": "CAUSE_EFFECT",
    "glitch_type": null,
    "raw_text": "El acetato de celulosa es un material que, en términos de diseño, color y forma es muy creativo, pues permite acabados veteados únicos.",
    "syntactic_skeleton": "El [SLOT_MATERIAL] es un material que, en términos de diseño, color y forma es muy creativo, pues permite acabados veteados únicos.",
    "word_count": 23,
    "slots_count": 1,
    "slots": [
      {
        "slot_id": "SLOT_MATERIAL_1",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "acetato de celulosa",
        "syntactic_role": "subject",
        "allowed_types": ["Material", "Cellulose Acetate", "Acetate"],
        "gender": "masculine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_MATERIAL",
      "has_pro_drop_subject": false,
      "terminal_focus": "SLOT_MATERIAL"
    },
    "metrics": {
      "originality_entropy_score": 0.94,
      "functional_token_ratio": 0.478,
      "has_human_glitch": false
    }
  },
  {
    "donor_id": "golden_mm_07",
    "brick_id": "brick_006092",
    "source_domain": "opticauniversitaria.es",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MATERIAL_COMPOSITION",
    "rhetorical_relation": "CONCESSION_CONTRAST",
    "glitch_type": null,
    "raw_text": "Las monturas de acetato también se caracterizan por ser algo más pesadas, pero también resistentes y cálidas al tacto con la piel.",
    "syntactic_skeleton": "Las [SLOT_COMPONENT] de [SLOT_MATERIAL] también se caracterizan por ser algo más pesadas, pero también [SLOT_PROPERTY] y cálidas al tacto con la piel.",
    "word_count": 22,
    "slots_count": 3,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "monturas",
        "syntactic_role": "subject",
        "allowed_types": ["Component", "Frames"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_MATERIAL_1",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "acetato",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Material", "Acetate", "Paste"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_PROPERTY_1",
        "slot_type": "SLOT_PROPERTY",
        "raw_value": "resistentes",
        "syntactic_role": "attribute",
        "allowed_types": ["Property", "Resistant", "Durable"],
        "gender": "feminine",
        "number": "plural"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_COMPONENT",
      "has_pro_drop_subject": false,
      "terminal_focus": "SLOT_PROPERTY"
    },
    "metrics": {
      "originality_entropy_score": 0.94,
      "functional_token_ratio": 0.500,
      "has_human_glitch": false
    }
  },
  {
    "donor_id": "golden_mm_08",
    "brick_id": "brick_006060",
    "source_domain": "opticauniversitaria.es",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MATERIAL_COMPOSITION",
    "rhetorical_relation": "DESCRIPTIVE_ELABORATION",
    "glitch_type": null,
    "raw_text": "El metal es un material que está preparado para ajustarse y mantener la forma con el paso del tiempo, permitiendo perfiles muy finos.",
    "syntactic_skeleton": "El [SLOT_MATERIAL] es un material que está preparado para ajustarse y mantener la forma con el paso del tiempo, permitiendo perfiles muy finos.",
    "word_count": 23,
    "slots_count": 1,
    "slots": [
      {
        "slot_id": "SLOT_MATERIAL_1",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "metal",
        "syntactic_role": "subject",
        "allowed_types": ["Material", "Metal", "Steel", "Titanium"],
        "gender": "masculine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_MATERIAL",
      "has_pro_drop_subject": false,
      "terminal_focus": "SLOT_MATERIAL"
    },
    "metrics": {
      "originality_entropy_score": 0.92,
      "functional_token_ratio": 0.522,
      "has_human_glitch": false
    }
  },
  {
    "donor_id": "golden_mm_09",
    "brick_id": "brick_006119",
    "source_domain": "qvision.es",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MATERIAL_COMPOSITION",
    "rhetorical_relation": "CAT_01_AD_SENSUM",
    "glitch_type": "CAT_01_DISCORDANCIA_AD_SENSUM",
    "raw_text": "El material más recomendado suele ser monturas de pasta, ya que son más resistentes y le dan mayor protección a los bordes de la lente.",
    "syntactic_skeleton": "El material más recomendado suele ser [SLOT_COMPONENT] de [SLOT_MATERIAL], ya que son más [SLOT_PROPERTY] y le dan mayor protección a los bordes de la [SLOT_COMPONENT].",
    "word_count": 24,
    "slots_count": 4,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "monturas",
        "syntactic_role": "attribute",
        "allowed_types": ["Component", "Frames"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_MATERIAL_1",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "pasta",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Material", "Paste", "Acetate"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_PROPERTY_1",
        "slot_type": "SLOT_PROPERTY",
        "raw_value": "resistentes",
        "syntactic_role": "attribute",
        "allowed_types": ["Property", "Resistant", "Solid"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_COMPONENT_2",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "lente",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Lens", "Crystal"],
        "gender": "feminine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_COMPONENT",
      "has_pro_drop_subject": false,
      "terminal_focus": "SLOT_COMPONENT"
    },
    "metrics": {
      "originality_entropy_score": 0.96,
      "functional_token_ratio": 0.542,
      "has_human_glitch": true
    }
  },
  {
    "donor_id": "golden_mm_10",
    "brick_id": "brick_002557",
    "source_domain": "opticagasset.com",
    "source_origin": "retail_human_glitch",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MATERIAL_COMPOSITION",
    "rhetorical_relation": "CAT_06_ORAL_WORKSHOP_MARKER",
    "glitch_type": "CAT_06_INVERSION_NEGACION_Y_QUIEBRES_ORALES_DE_MOSTRADOR",
    "raw_text": "Como consejo te diremos que no te adaptes a la moda, adapta la moda a ti; el contraste de materiales es lo que manda en la montura.",
    "syntactic_skeleton": "Como consejo te diremos que no te adaptes a la moda, adapta la moda a ti; el contraste de [SLOT_MATERIAL] es lo que manda en la [SLOT_COMPONENT].",
    "word_count": 27,
    "slots_count": 2,
    "slots": [
      {
        "slot_id": "SLOT_MATERIAL_1",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "materiales",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Material", "Metals", "Acetates"],
        "gender": "masculine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "montura",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Frame", "Mount"],
        "gender": "feminine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_MATERIAL",
      "has_pro_drop_subject": true,
      "terminal_focus": "SLOT_COMPONENT"
    },
    "metrics": {
      "originality_entropy_score": 0.97,
      "functional_token_ratio": 0.630,
      "has_human_glitch": true
    }
  },

  // ==========================================
  // ANATOMICAL_FIT (10 Bricks)
  // ==========================================
  {
    "donor_id": "golden_mm_11",
    "brick_id": "brick_000926",
    "source_domain": "opticauniversitaria.es",
    "source_origin": "retail_human_glitch",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "ANATOMICAL_FIT",
    "rhetorical_relation": "CAT_06_ORAL_WORKSHOP_MARKER",
    "glitch_type": "CAT_06_INVERSION_NEGACION_Y_QUIEBRES_ORALES_DE_MOSTRADOR",
    "raw_text": "Olvídate de las marcas en la cara. Las gafas de pasta no necesitan incorporar almohadillas en el puente de la nariz a modo de sujeción, así que no te dejarán las pequeñas marcas que algunas gafas con montura de metal sí que dejan en la cara y se apoyarán a tu nariz cómodamente.",
    "syntactic_skeleton": "Olvídate de las marcas en la [SLOT_FACIAL_FEATURE]. Las [SLOT_COMPONENT] de [SLOT_MATERIAL] no necesitan incorporar [SLOT_COMPONENT] en el [SLOT_COMPONENT] de la [SLOT_FACIAL_FEATURE] a modo de sujeción, así que no te dejarán las pequeñas marcas que algunas gafas con [SLOT_COMPONENT] de [SLOT_MATERIAL] sí que dejan en la [SLOT_FACIAL_FEATURE] y se apoyarán a tu [SLOT_FACIAL_FEATURE] cómodamente.",
    "word_count": 53,
    "slots_count": 10,
    "slots": [
      {
        "slot_id": "SLOT_FACIAL_FEATURE_1",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "cara",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Face", "Cheeks"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "gafas",
        "syntactic_role": "subject",
        "allowed_types": ["Component", "Glasses", "Eyewear"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_MATERIAL_1",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "pasta",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Material", "Paste", "Acetate"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_2",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "almohadillas",
        "syntactic_role": "direct_object",
        "allowed_types": ["Component", "Nosepads", "Pads"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_COMPONENT_3",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "puente",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Bridge", "Keyhole"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_2",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "nariz",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Nose", "Bridge"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_4",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "montura",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Frame"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_MATERIAL_2",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "metal",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Material", "Metal", "Steel"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_3",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "cara",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Face"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_4",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "nariz",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Nose"],
        "gender": "feminine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_FACIAL_FEATURE",
      "has_pro_drop_subject": true,
      "terminal_focus": "SLOT_FACIAL_FEATURE"
    },
    "metrics": {
      "originality_entropy_score": 0.98,
      "functional_token_ratio": 0.585,
      "has_human_glitch": true
    }
  },
  {
    "donor_id": "golden_mm_12",
    "brick_id": "brick_006286",
    "source_domain": "catalogo_frases_raras",
    "source_origin": "retail_human_glitch",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "ANATOMICAL_FIT",
    "rhetorical_relation": "CAT_01_AD_SENSUM",
    "glitch_type": "CAT_01_DISCORDANCIA_AD_SENSUM",
    "raw_text": "Según el perfil y los ángulos de la cara nos sentará mejor una forma de gafas u otros.",
    "syntactic_skeleton": "Según el perfil y los ángulos de la [SLOT_FACIAL_FEATURE] nos sentará mejor una forma de [SLOT_COMPONENT] u otros.",
    "word_count": 18,
    "slots_count": 2,
    "slots": [
      {
        "slot_id": "SLOT_FACIAL_FEATURE_1",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "cara",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Face", "Visage"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "gafas",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Glasses", "Eyewear"],
        "gender": "feminine",
        "number": "plural"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_FACIAL_FEATURE",
      "has_pro_drop_subject": true,
      "terminal_focus": "SLOT_COMPONENT"
    },
    "metrics": {
      "originality_entropy_score": 0.97,
      "functional_token_ratio": 0.611,
      "has_human_glitch": true
    }
  },
  {
    "donor_id": "golden_mm_13",
    "brick_id": "brick_001300",
    "source_domain": "T3_RicardoVillalba",
    "source_origin": "retail_human_glitch",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "ANATOMICAL_FIT",
    "rhetorical_relation": "CAT_03_ILLICIT_PUNCTUATION_BREAK",
    "glitch_type": "CAT_03_FRACTURA_ILICITA_TRAS_PUNTO",
    "raw_text": "Elegir una montura no es tarea fácil. Ya que las mejores monturas de gafas no siempre serán las más caras, o las más bonitas. Sino aquellas que nos sientan mejor según nuestro aspecto.",
    "syntactic_skeleton": "Elegir una [SLOT_COMPONENT] no es tarea fácil. Ya que las mejores [SLOT_COMPONENT] no siempre serán las más caras, o las más bonitas. Sino aquellas que nos sientan mejor según nuestro aspecto.",
    "word_count": 33,
    "slots_count": 2,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "montura",
        "syntactic_role": "direct_object",
        "allowed_types": ["Component", "Frame", "Mount"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_2",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "monturas de gafas",
        "syntactic_role": "subject",
        "allowed_types": ["Component", "Eyewear frames"],
        "gender": "feminine",
        "number": "plural"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_COMPONENT",
      "has_pro_drop_subject": true,
      "terminal_focus": "SLOT_COMPONENT"
    },
    "metrics": {
      "originality_entropy_score": 0.98,
      "functional_token_ratio": 0.636,
      "has_human_glitch": true
    }
  },
  {
    "donor_id": "golden_mm_14",
    "brick_id": "brick_006290",
    "source_domain": "catalogo_frases_raras",
    "source_origin": "retail_human_glitch",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "ANATOMICAL_FIT",
    "rhetorical_relation": "CAT_06_ORAL_WORKSHOP_MARKER",
    "glitch_type": "CAT_06_INVERSION_NEGACION_Y_QUIEBRES_ORALES_DE_MOSTRADOR",
    "raw_text": "Así, lo primero que debes tener en cuenta cuando te pruebes unas gafas es si te resultan cómodas y se ajustan bien a tu rostro. Actualmente las patillas llevan un refuerzo metálico interno que les permite ajustar, tanto su longitud como su curvatura, adaptándose así perfectamente, como un guante, a todas las caras. Pruébalas y no te arrepentirás, es más ¡No podrás dejar de usarlas!",
    "syntactic_skeleton": "Así, lo primero que debes tener en cuenta cuando te pruebes unas [SLOT_COMPONENT] es si te resultan cómodas y se ajustan bien a tu [SLOT_FACIAL_FEATURE]. Actualmente las [SLOT_COMPONENT] llevan un refuerzo [SLOT_MATERIAL] interno que les permite ajustar, tanto su longitud como su curvatura, adaptándose así perfectamente, como un guante, a todas las [SLOT_FACIAL_FEATURE]. Pruébalas y no te arrepentirás, es más ¡No podrás dejar de usarlas!",
    "word_count": 65,
    "slots_count": 5,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "gafas",
        "syntactic_role": "direct_object",
        "allowed_types": ["Component", "Glasses"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_1",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "rostro",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Face", "Visage"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_2",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "patillas",
        "syntactic_role": "subject",
        "allowed_types": ["Component", "Temples", "Arms"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_MATERIAL_1",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "metálico",
        "syntactic_role": "modifier",
        "allowed_types": ["Material", "Metal", "Metallic"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_2",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "caras",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Faces"],
        "gender": "feminine",
        "number": "plural"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_FACIAL_FEATURE",
      "has_pro_drop_subject": true,
      "terminal_focus": "SLOT_COMPONENT"
    },
    "metrics": {
      "originality_entropy_score": 0.99,
      "functional_token_ratio": 0.585,
      "has_human_glitch": true
    }
  },
  {
    "donor_id": "golden_mm_15",
    "brick_id": "brick_001328",
    "source_domain": "T3_RicardoVillalba",
    "source_origin": "retail_human_glitch",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "ANATOMICAL_FIT",
    "rhetorical_relation": "CAT_03_ILLICIT_PUNCTUATION_BREAK",
    "glitch_type": "CAT_03_FRACTURA_ILICITA_TRAS_PUNTO",
    "raw_text": "Si tienes la cara triangular: Este tipo de rostro triangular encaja mejor con una montura que minimice la anchura del mentón. Con lo que puedes centrarte en formas que se abran hacia las mejillas.",
    "syntactic_skeleton": "Si tienes la [SLOT_FACIAL_FEATURE] triangular: Este tipo de [SLOT_FACIAL_FEATURE] encaja mejor con una [SLOT_COMPONENT] que minimice la anchura del [SLOT_FACIAL_FEATURE]. Con lo que puedes centrarte en formas que se abran hacia las [SLOT_FACIAL_FEATURE].",
    "word_count": 34,
    "slots_count": 5,
    "slots": [
      {
        "slot_id": "SLOT_FACIAL_FEATURE_1",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "cara",
        "syntactic_role": "direct_object",
        "allowed_types": ["FacialFeature", "Face"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_2",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "rostro triangular",
        "syntactic_role": "subject",
        "allowed_types": ["FacialFeature", "Triangular face"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "montura",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Frame"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_3",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "mentón",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Chin", "Jaw"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_4",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "mejillas",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Cheeks"],
        "gender": "feminine",
        "number": "plural"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_FACIAL_FEATURE",
      "has_pro_drop_subject": false,
      "terminal_focus": "SLOT_FACIAL_FEATURE"
    },
    "metrics": {
      "originality_entropy_score": 0.96,
      "functional_token_ratio": 0.559,
      "has_human_glitch": true
    }
  },
  {
    "donor_id": "golden_mm_16",
    "brick_id": "brick_000715",
    "source_domain": "generaloptica.es",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "ANATOMICAL_FIT",
    "rhetorical_relation": "CAT_04_ANACOLUTHON_OR_PSEUDO_CLEFT",
    "glitch_type": "CAT_04_ANACOLUTO_HENDIDA_E_INFINITIVO_SUSTANTIVADO",
    "raw_text": "Las gafas de sol, aunque son indispensables durante todo el año, es ahora cuando se convierten en el complemento estrella de este verano.",
    "syntactic_skeleton": "Las [SLOT_COMPONENT], aunque son indispensables durante todo el año, es ahora cuando se convierten en el complemento estrella de este verano.",
    "word_count": 23,
    "slots_count": 1,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "gafas de sol",
        "syntactic_role": "subject",
        "allowed_types": ["Component", "Sunglasses", "Eyewear"],
        "gender": "feminine",
        "number": "plural"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_COMPONENT",
      "has_pro_drop_subject": false,
      "terminal_focus": "SLOT_COMPONENT"
    },
    "metrics": {
      "originality_entropy_score": 0.97,
      "functional_token_ratio": 0.609,
      "has_human_glitch": true
    }
  },
  {
    "donor_id": "golden_mm_17",
    "brick_id": "brick_002595",
    "source_domain": "opticasflorida.com",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "ANATOMICAL_FIT",
    "rhetorical_relation": "CONDITION_RESULT",
    "glitch_type": null,
    "raw_text": "Es decir, si la frente es ancha, no llamemos la atención sobre ella; si nuestra cara es redonda, cortémosla con líneas rectas para estilizar el óvalo facial.",
    "syntactic_skeleton": "Es decir, si la [SLOT_FACIAL_FEATURE] es ancha, no llamemos la atención sobre ella; si nuestra [SLOT_FACIAL_FEATURE] es redonda, cortémosla con líneas rectas para estilizar el [SLOT_FACIAL_FEATURE].",
    "word_count": 27,
    "slots_count": 3,
    "slots": [
      {
        "slot_id": "SLOT_FACIAL_FEATURE_1",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "frente",
        "syntactic_role": "subject",
        "allowed_types": ["FacialFeature", "Forehead"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_2",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "cara",
        "syntactic_role": "subject",
        "allowed_types": ["FacialFeature", "Face"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_3",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "óvalo facial",
        "syntactic_role": "direct_object",
        "allowed_types": ["FacialFeature", "Facial oval", "Profile"],
        "gender": "masculine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_FACIAL_FEATURE",
      "has_pro_drop_subject": true,
      "terminal_focus": "SLOT_FACIAL_FEATURE"
    },
    "metrics": {
      "originality_entropy_score": 0.94,
      "functional_token_ratio": 0.593,
      "has_human_glitch": false
    }
  },
  {
    "donor_id": "golden_mm_18",
    "brick_id": "brick_004524",
    "source_domain": "opticauniversitaria.es",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "ANATOMICAL_FIT",
    "rhetorical_relation": "DESCRIPTIVE_ELABORATION",
    "glitch_type": null,
    "raw_text": "Las gafas de metal cuentan con almohadillas blandas y antideslizantes a cada lado del puente de la nariz, lo que permite graduar la altura de apoyo y evitar marcas sobre la piel.",
    "syntactic_skeleton": "Las [SLOT_COMPONENT] de [SLOT_MATERIAL] cuentan con [SLOT_COMPONENT] blandas y antideslizantes a cada lado del [SLOT_COMPONENT] de la [SLOT_FACIAL_FEATURE], lo que permite graduar la altura de apoyo y evitar marcas sobre la piel.",
    "word_count": 31,
    "slots_count": 5,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "gafas",
        "syntactic_role": "subject",
        "allowed_types": ["Component", "Glasses"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_MATERIAL_1",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "metal",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Material", "Metal", "Steel"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_2",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "almohadillas",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Pads", "Nosepads"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_COMPONENT_3",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "puente",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Bridge"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_1",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "nariz",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Nose", "Nasal septum"],
        "gender": "feminine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_COMPONENT",
      "has_pro_drop_subject": false,
      "terminal_focus": "SLOT_FACIAL_FEATURE"
    },
    "metrics": {
      "originality_entropy_score": 0.93,
      "functional_token_ratio": 0.548,
      "has_human_glitch": false
    }
  },
  {
    "donor_id": "golden_mm_19",
    "brick_id": "brick_006122",
    "source_domain": "qvision.es",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "ANATOMICAL_FIT",
    "rhetorical_relation": "CAT_05_DEISMO_OR_PRAGMATIC_RODEO",
    "glitch_type": "CAT_05_DEISMO_COMA_SUJETO_VERBO_Y_RODEO_PRAGMATICO",
    "raw_text": "En cuanto a la adaptación, es importante que la montura se asiente bien en la nariz, el peso de la montura debe repartirse uniformemente sobre el tabique nasal.",
    "syntactic_skeleton": "En cuanto a la adaptación, es importante que la [SLOT_COMPONENT] se asiente bien en la [SLOT_FACIAL_FEATURE], el [SLOT_PROPERTY] de la [SLOT_COMPONENT] debe repartirse uniformemente sobre el [SLOT_FACIAL_FEATURE].",
    "word_count": 27,
    "slots_count": 4,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "montura",
        "syntactic_role": "subject",
        "allowed_types": ["Component", "Frame", "Mount"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_1",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "nariz",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Nose"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_PROPERTY_1",
        "slot_type": "SLOT_PROPERTY",
        "raw_value": "peso",
        "syntactic_role": "subject",
        "allowed_types": ["Property", "Weight", "Load"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_2",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "tabique nasal",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Nasal septum", "Nose"],
        "gender": "masculine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_COMPONENT",
      "has_pro_drop_subject": false,
      "terminal_focus": "SLOT_FACIAL_FEATURE"
    },
    "metrics": {
      "originality_entropy_score": 0.95,
      "functional_token_ratio": 0.556,
      "has_human_glitch": true
    }
  },
  {
    "donor_id": "golden_mm_20",
    "brick_id": "brick_006292",
    "source_domain": "catalogo_frases_raras",
    "source_origin": "retail_human_glitch",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "ANATOMICAL_FIT",
    "rhetorical_relation": "CAT_06_ORAL_WORKSHOP_MARKER",
    "glitch_type": "CAT_06_INVERSION_NEGACION_Y_QUIEBRES_ORALES_DE_MOSTRADOR",
    "raw_text": "Con patillas flexibles y puente cómodo, son unas monturas ligeras para el día a día. Olvídate de las marcas en la cara.",
    "syntactic_skeleton": "Con [SLOT_COMPONENT] flexibles y [SLOT_COMPONENT] cómodo, son unas [SLOT_COMPONENT] [SLOT_PROPERTY] para el día a día. Olvídate de las marcas en la [SLOT_FACIAL_FEATURE].",
    "word_count": 22,
    "slots_count": 5,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "patillas",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Temples", "Arms"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_COMPONENT_2",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "puente",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Bridge"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_3",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "monturas",
        "syntactic_role": "attribute",
        "allowed_types": ["Component", "Frames"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_PROPERTY_1",
        "slot_type": "SLOT_PROPERTY",
        "raw_value": "ligeras",
        "syntactic_role": "modifier",
        "allowed_types": ["Property", "Lightweight"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_1",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "cara",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Face"],
        "gender": "feminine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_COMPONENT",
      "has_pro_drop_subject": true,
      "terminal_focus": "SLOT_FACIAL_FEATURE"
    },
    "metrics": {
      "originality_entropy_score": 0.97,
      "functional_token_ratio": 0.545,
      "has_human_glitch": true
    }
  },

  // ==========================================
  // MECHANICAL_FUNCTION (10 Bricks)
  // ==========================================
  {
    "donor_id": "golden_mm_21",
    "brick_id": "brick_006271",
    "source_domain": "xn--opticabarrea-khb.es",
    "source_origin": "retail_human_glitch",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MECHANICAL_FUNCTION",
    "rhetorical_relation": "CAT_06_ORAL_WORKSHOP_MARKER",
    "glitch_type": "CAT_06_INVERSION_NEGACION_Y_QUIEBRES_ORALES_DE_MOSTRADOR",
    "raw_text": "Actualmente las patillas llevan un refuerzo metálico interno que les permite ajustar, tanto su longitud como su curvatura, adaptándose así perfectamente, como un guante, a todas las caras.",
    "syntactic_skeleton": "Actualmente las [SLOT_COMPONENT] llevan un refuerzo [SLOT_MATERIAL] interno que les permite ajustar, tanto su longitud como su curvatura, adaptándose así perfectamente, como un guante, a todas las [SLOT_FACIAL_FEATURE].",
    "word_count": 28,
    "slots_count": 3,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "patillas",
        "syntactic_role": "subject",
        "allowed_types": ["Component", "Temples", "Arms"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_MATERIAL_1",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "metálico",
        "syntactic_role": "modifier",
        "allowed_types": ["Material", "Metal", "Steel wire"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_1",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "caras",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Faces"],
        "gender": "feminine",
        "number": "plural"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_COMPONENT",
      "has_pro_drop_subject": false,
      "terminal_focus": "SLOT_FACIAL_FEATURE"
    },
    "metrics": {
      "originality_entropy_score": 0.99,
      "functional_token_ratio": 0.571,
      "has_human_glitch": true
    }
  },
  {
    "donor_id": "golden_mm_22",
    "brick_id": "brick_006268",
    "source_domain": "xn--opticabarrea-khb.es",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MECHANICAL_FUNCTION",
    "rhetorical_relation": "DESCRIPTIVE_ELABORATION",
    "glitch_type": null,
    "raw_text": "De líneas puras y ya con su inconfundible flecha bisagra, elemento funcional y decorativo símbolo de la marca en todo el mundo.",
    "syntactic_skeleton": "De líneas puras y ya con su inconfundible [SLOT_COMPONENT], elemento funcional y decorativo símbolo de [SLOT_BRAND] en todo el mundo.",
    "word_count": 22,
    "slots_count": 2,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "flecha bisagra",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Hinge", "Supreme Arrow"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_BRAND_1",
        "slot_type": "SLOT_BRAND",
        "raw_value": "la marca",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Brand", "Persol", "Ray-Ban"],
        "gender": "feminine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_COMPONENT",
      "has_pro_drop_subject": true,
      "terminal_focus": "SLOT_BRAND"
    },
    "metrics": {
      "originality_entropy_score": 0.95,
      "functional_token_ratio": 0.545,
      "has_human_glitch": false
    }
  },
  {
    "donor_id": "golden_mm_23",
    "brick_id": "brick_006269",
    "source_domain": "xn--opticabarrea-khb.es",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MECHANICAL_FUNCTION",
    "rhetorical_relation": "DESCRIPTIVE_ELABORATION",
    "glitch_type": null,
    "raw_text": "Ideado a finales de los años treinta, dotó a las gafas de patillas flexibles permitiendo que se adaptasen a cualquier rostro, ofreciendo una comodidad absoluta.",
    "syntactic_skeleton": "Ideado a finales de los años treinta, dotó a las [SLOT_COMPONENT] de [SLOT_COMPONENT] flexibles permitiendo que se adaptasen a cualquier [SLOT_FACIAL_FEATURE], ofreciendo una [SLOT_PROPERTY].",
    "word_count": 26,
    "slots_count": 4,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "gafas",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Glasses"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_COMPONENT_2",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "patillas",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Temples"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_1",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "rostro",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Face"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_PROPERTY_1",
        "slot_type": "SLOT_PROPERTY",
        "raw_value": "comodidad absoluta",
        "syntactic_role": "direct_object",
        "allowed_types": ["Property", "Absolute comfort"],
        "gender": "feminine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_COMPONENT",
      "has_pro_drop_subject": true,
      "terminal_focus": "SLOT_PROPERTY"
    },
    "metrics": {
      "originality_entropy_score": 0.96,
      "functional_token_ratio": 0.500,
      "has_human_glitch": false
    }
  },
  {
    "donor_id": "golden_mm_24",
    "brick_id": "brick_004823",
    "source_domain": "xn--opticabarrea-khb.es",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MECHANICAL_FUNCTION",
    "rhetorical_relation": "DESCRIPTIVE_ELABORATION",
    "glitch_type": null,
    "raw_text": "Hoy es la flecha plateada Supreme. Otro elemento distintivo de marca es el sistema Meflecto, consistente en cilindros de nylon insertados en el acetato de la varilla.",
    "syntactic_skeleton": "Hoy es la [SLOT_COMPONENT]. Otro elemento distintivo de marca es el [SLOT_MODEL], consistente en cilindros de [SLOT_MATERIAL] insertados en el [SLOT_MATERIAL] de la [SLOT_COMPONENT].",
    "word_count": 27,
    "slots_count": 5,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "flecha plateada Supreme",
        "syntactic_role": "attribute",
        "allowed_types": ["Component", "Supreme Arrow", "Hinge"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_MODEL_1",
        "slot_type": "SLOT_MODEL",
        "raw_value": "sistema Meflecto",
        "syntactic_role": "attribute",
        "allowed_types": ["Model", "System", "Meflecto"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_MATERIAL_1",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "nylon",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Material", "Nylon", "Metal cylinders"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_MATERIAL_2",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "acetato",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Material", "Acetate"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_2",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "varilla",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Temple", "Arm"],
        "gender": "feminine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_MODEL",
      "has_pro_drop_subject": false,
      "terminal_focus": "SLOT_COMPONENT"
    },
    "metrics": {
      "originality_entropy_score": 0.95,
      "functional_token_ratio": 0.481,
      "has_human_glitch": false
    }
  },
  {
    "donor_id": "golden_mm_25",
    "brick_id": "brick_005926",
    "source_domain": "opticafernandezbaca.com",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MECHANICAL_FUNCTION",
    "rhetorical_relation": "DESCRIPTIVE_ELABORATION",
    "glitch_type": null,
    "raw_text": "Un diseño lineal con varillas flexibles -gracias al sistema Meflecto- y lentes de cristal mineral templado.",
    "syntactic_skeleton": "Un diseño lineal con [SLOT_COMPONENT] flexibles -gracias al [SLOT_MODEL]- y [SLOT_COMPONENT] de [SLOT_MATERIAL].",
    "word_count": 16,
    "slots_count": 4,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "varillas",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Temples"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_MODEL_1",
        "slot_type": "SLOT_MODEL",
        "raw_value": "sistema Meflecto",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Model", "System", "Meflecto"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_2",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "lentes",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Lenses"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_MATERIAL_1",
        "slot_type": "SLOT_MATERIAL",
        "raw_value": "cristal mineral",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Material", "Mineral glass"],
        "gender": "masculine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_COMPONENT",
      "has_pro_drop_subject": true,
      "terminal_focus": "SLOT_MATERIAL"
    },
    "metrics": {
      "originality_entropy_score": 0.94,
      "functional_token_ratio": 0.500,
      "has_human_glitch": false
    }
  },
  {
    "donor_id": "golden_mm_26",
    "brick_id": "brick_006246",
    "source_domain": "vipsual.com",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MECHANICAL_FUNCTION",
    "rhetorical_relation": "DESCRIPTIVE_ELABORATION",
    "glitch_type": null,
    "raw_text": "En la actualidad el sistema meflecto sigue siendo un elemento diferenciador de la montura, aportando una articulación elástica que alivia la presión temporal.",
    "syntactic_skeleton": "En la actualidad el [SLOT_MODEL] sigue siendo un elemento diferenciador de la [SLOT_COMPONENT], aportando una [SLOT_PROPERTY] que alivia la presión temporal.",
    "word_count": 24,
    "slots_count": 3,
    "slots": [
      {
        "slot_id": "SLOT_MODEL_1",
        "slot_type": "SLOT_MODEL",
        "raw_value": "sistema meflecto",
        "syntactic_role": "subject",
        "allowed_types": ["Model", "System", "Meflecto"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "montura",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Frame"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_PROPERTY_1",
        "slot_type": "SLOT_PROPERTY",
        "raw_value": "articulación elástica",
        "syntactic_role": "direct_object",
        "allowed_types": ["Property", "Elastic hinge", "Flexibility"],
        "gender": "feminine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_MODEL",
      "has_pro_drop_subject": false,
      "terminal_focus": "SLOT_PROPERTY"
    },
    "metrics": {
      "originality_entropy_score": 0.93,
      "functional_token_ratio": 0.542,
      "has_human_glitch": false
    }
  },
  {
    "donor_id": "golden_mm_27",
    "brick_id": "brick_000910",
    "source_domain": "opticauniversitaria.es",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MECHANICAL_FUNCTION",
    "rhetorical_relation": "CAUSE_EFFECT",
    "glitch_type": null,
    "raw_text": "Longitud de las varillas: de esta medida depende que las gafas se ajusten bien a tu cabeza, por lo que una longitud excesiva o demasiado corta hará que las gafas se muevan o te aprieten detrás de las orejas.",
    "syntactic_skeleton": "Longitud de las [SLOT_COMPONENT]: de esta medida depende que las [SLOT_COMPONENT] se ajusten bien a tu [SLOT_FACIAL_FEATURE], por lo que una longitud excesiva o demasiado corta hará que las gafas se muevan o te aprieten detrás de las [SLOT_FACIAL_FEATURE].",
    "word_count": 38,
    "slots_count": 4,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "varillas",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Temples", "Arms"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_COMPONENT_2",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "gafas",
        "syntactic_role": "subject",
        "allowed_types": ["Component", "Glasses"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_1",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "cabeza",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Head"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_2",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "orejas",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Ears"],
        "gender": "feminine",
        "number": "plural"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_COMPONENT",
      "has_pro_drop_subject": false,
      "terminal_focus": "SLOT_FACIAL_FEATURE"
    },
    "metrics": {
      "originality_entropy_score": 0.95,
      "functional_token_ratio": 0.553,
      "has_human_glitch": false
    }
  },
  {
    "donor_id": "golden_mm_28",
    "brick_id": "brick_000755",
    "source_domain": "T3_RicardoVillalba",
    "source_origin": "retail_human_glitch",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MECHANICAL_FUNCTION",
    "rhetorical_relation": "CAT_03_ILLICIT_PUNCTUATION_BREAK",
    "glitch_type": "CAT_03_FRACTURA_ILICITA_TRAS_PUNTO",
    "raw_text": "Gafas sin montura, o lentes al aire. Éstas se sujetan directamente a las varillas mediante micro-tornillos. Este tipo de montura, al contrario que la primera, ocupa poco espacio visual. Y por tanto resta importancia a la frente.",
    "syntactic_skeleton": "[SLOT_COMPONENT] sin [SLOT_COMPONENT], o [SLOT_COMPONENT] al aire. Éstas se sujetan directamente a las [SLOT_COMPONENT] mediante micro-tornillos. Este tipo de [SLOT_COMPONENT], al contrario que la primera, ocupa poco espacio visual. Y por tanto resta importancia a la [SLOT_FACIAL_FEATURE].",
    "word_count": 36,
    "slots_count": 6,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "Gafas",
        "syntactic_role": "subject",
        "allowed_types": ["Component", "Glasses"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_COMPONENT_2",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "montura",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Frame"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_3",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "lentes",
        "syntactic_role": "subject",
        "allowed_types": ["Component", "Lenses"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_COMPONENT_4",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "varillas",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Temples"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_COMPONENT_5",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "montura",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Frame"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_1",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "frente",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Forehead"],
        "gender": "feminine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_COMPONENT",
      "has_pro_drop_subject": false,
      "terminal_focus": "SLOT_FACIAL_FEATURE"
    },
    "metrics": {
      "originality_entropy_score": 0.98,
      "functional_token_ratio": 0.556,
      "has_human_glitch": true
    }
  },
  {
    "donor_id": "golden_mm_29",
    "brick_id": "brick_001334",
    "source_domain": "T3_RicardoVillalba",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MECHANICAL_FUNCTION",
    "rhetorical_relation": "CONDITION_RESULT",
    "glitch_type": null,
    "raw_text": "Evitaremos diseños o varillas con decoraciones excesivas, ya que estas enfatizarían la parte superior de la cara y descompensarían el peso del armazón.",
    "syntactic_skeleton": "Evitaremos diseños o [SLOT_COMPONENT] con decoraciones excesivas, ya que estas enfatizarían la parte superior de la [SLOT_FACIAL_FEATURE] y descompensarían el [SLOT_PROPERTY] del [SLOT_COMPONENT].",
    "word_count": 24,
    "slots_count": 4,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "varillas",
        "syntactic_role": "direct_object",
        "allowed_types": ["Component", "Temples", "Arms"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_FACIAL_FEATURE_1",
        "slot_type": "SLOT_FACIAL_FEATURE",
        "raw_value": "cara",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["FacialFeature", "Face"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_PROPERTY_1",
        "slot_type": "SLOT_PROPERTY",
        "raw_value": "peso",
        "syntactic_role": "direct_object",
        "allowed_types": ["Property", "Weight", "Balance"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_2",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "armazón",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Frame", "Chassis"],
        "gender": "masculine",
        "number": "singular"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_COMPONENT",
      "has_pro_drop_subject": true,
      "terminal_focus": "SLOT_COMPONENT"
    },
    "metrics": {
      "originality_entropy_score": 0.94,
      "functional_token_ratio": 0.542,
      "has_human_glitch": false
    }
  },
  {
    "donor_id": "golden_mm_30",
    "brick_id": "brick_004303",
    "source_domain": "milyunagafas.com",
    "source_origin": "verified_valid_donors",
    "tier": "TIER_1_WORKSHOP",
    "voice_category": "WORKSHOP_CLINICAL",
    "exclude_from_humanization": false,
    "frame": "MECHANICAL_FUNCTION",
    "rhetorical_relation": "DESCRIPTIVE_ELABORATION",
    "glitch_type": null,
    "raw_text": "Frota suavemente por ambas caras de la lente, el frontal y las varillas, prestando especial cuidado a las charnelas de los goznes para retirar la salitre acumulada.",
    "syntactic_skeleton": "Frota suavemente por ambas caras de la [SLOT_COMPONENT], el [SLOT_COMPONENT] y las [SLOT_COMPONENT], prestando especial cuidado a las [SLOT_COMPONENT] de los goznes para retirar la salitre acumulada.",
    "word_count": 27,
    "slots_count": 4,
    "slots": [
      {
        "slot_id": "SLOT_COMPONENT_1",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "lente",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Lens"],
        "gender": "feminine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_2",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "frontal",
        "syntactic_role": "direct_object",
        "allowed_types": ["Component", "Front", "Rim"],
        "gender": "masculine",
        "number": "singular"
      },
      {
        "slot_id": "SLOT_COMPONENT_3",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "varillas",
        "syntactic_role": "direct_object",
        "allowed_types": ["Component", "Temples", "Arms"],
        "gender": "feminine",
        "number": "plural"
      },
      {
        "slot_id": "SLOT_COMPONENT_4",
        "slot_type": "SLOT_COMPONENT",
        "raw_value": "charnelas",
        "syntactic_role": "prepositional_complement",
        "allowed_types": ["Component", "Hinges", "Joints"],
        "gender": "feminine",
        "number": "plural"
      }
    ],
    "centering_signature": {
      "promoted_entity_role": "SLOT_COMPONENT",
      "has_pro_drop_subject": true,
      "terminal_focus": "SLOT_COMPONENT"
    },
    "metrics": {
      "originality_entropy_score": 0.95,
      "functional_token_ratio": 0.519,
      "has_human_glitch": false
    }
  }
];

// Write file
fs.writeFileSync(OUTPUT_PATH, JSON.stringify(goldenBricks, null, 2), 'utf8');

console.log('Successfully saved Top 30 Golden Bricks to:', OUTPUT_PATH);
console.log('Total Bricks:', goldenBricks.length);

const frameDist = {};
const glitchCount = { true: 0, false: 0 };
goldenBricks.forEach(b => {
  frameDist[b.frame] = (frameDist[b.frame] || 0) + 1;
  if (b.metrics.has_human_glitch) glitchCount.true++;
  else glitchCount.false++;
});

console.log('Frame Distribution:', frameDist);
console.log('Human Glitches Count:', glitchCount);
