import { SiteConfig, NavItem } from './types';

// PALETTE DEFINITION (Blue Paper 2.2)
export const PALETTE = {
  pureWhite: '#FFFFFF',
  isabelline: '#F4F0E4',
  powderBlue: '#B0E0E6',
  deepCharcoal: '#1C1C1C',
};

export const ANIMATION_CONFIG = {
  transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  stagger: 0.1,
  viewport: { once: true, margin: "-10%" }
};

export const SITE_CONFIG: SiteConfig = {
  author: "Simón Sandrea",
  role: "Arquitecto-Ejecutor SEO",
  h1: "SEO Inteligente",
  subheadline: "Estrategia Clara, Realista y Potente",
  contactEmail: "contacto@simonsandreaseo.com",
  attributes: [
    {
      id: 'clara',
      title: "Clara",
      subtitle: "Planes de Ejecución",
      description: "Eliminamos la ambigüedad. Si tu arquitectura no soporta el crecimiento, diseñamos una nueva. Sin rodeos.",
      hexColor: PALETTE.powderBlue,
      path: '#clara'
    },
    {
      id: 'realista',
      title: "Realista",
      subtitle: "Viabilidad de Nicho",
      description: "Te digo si tu proyecto es una mina de oro o un pozo sin fondo antes de que gastes un solo euro.",
      hexColor: PALETTE.isabelline,
      path: '#realista'
    },
    {
      id: 'potente',
      title: "Potente",
      subtitle: "Asalto al SERP",
      description: "Dominio basado en datos crudos de Search Console. Ejecución técnica quirúrgica para resultados innegociables.",
      hexColor: PALETTE.deepCharcoal,
      path: '#potente'
    }
  ]
};

export const NAV_ITEMS: NavItem[] = [
  { id: 'estrategia', label: 'Consultoría', href: '#servicios' },
  { id: 'academia', label: 'Academia', href: '#formaciones' },
  { id: 'laboratorio', label: 'Laboratorio', href: '#herramientas' },
  { id: 'contacto', label: 'Diagnóstico', href: '#contacto' },
];

export const SERVICES = [
  {
    id: 1,
    title: "Análisis de Viabilidad",
    slug: "analisis-viabilidad",
    description: "Evaluación realista de tu mercado. Analizamos la competencia y tus activos actuales para determinar si tu plan de asalto es ejecutable o un suicidio financiero.",
    tags: ["Realismo Estratégico", "Due Diligence", "Datos Crudos"]
  },
  {
    id: 2,
    title: "Arquitectura de Dominio",
    slug: "arquitectura-dominio",
    description: "Diseño estructural de SILOs y flujos de autoridad. Construimos el esqueleto técnico que obliga a Google a entender y priorizar tu negocio.",
    tags: ["Ingeniería Técnica", "Estructura", "Escalabilidad"]
  },
  {
    id: 3,
    title: "Plan de Ejecución Anual",
    slug: "plan-ejecucion",
    description: "No es un PDF de 80 páginas. Es una hoja de ruta táctica mes a mes basada en lo que Search Console exige para dominar tu sector.",
    tags: ["Acción Directa", "Roadmap", "Resultados"]
  }
];

export const FORMATIONS = [
  {
    id: 1,
    title: "Estrategia y Análisis de Datos",
    level: "Nivel Senior",
    description: "Aprende a mirar Search Console como un estratega, no como un contable. Toma decisiones basadas en la verdad del dato."
  },
  {
    id: 2,
    title: "Arquitectura Web Avanzada",
    level: "Especialización",
    description: "Domina el arte de estructurar portales masivos. Aprende a diseñar la lógica que domina las intenciones de búsqueda."
  },
  {
    id: 3,
    title: "Python para Consultores",
    level: "Productividad",
    description: "Automatización de auditorías y procesamiento de datos. Deja de ejecutar tareas manuales y empieza a diseñar sistemas."
  }
];

export const TOOLS = [
  {
    id: 1,
    name: "Navaja Suiza SEO",
    status: "Disponible",
    function: "Suite completa para análisis de canibalización y datos de Search Console.",
    path: "/herramientas/seo-suite"
  },
  {
    id: 2,
    name: "BlogViz AI",
    status: "Disponible",
    function: "Generación de imágenes optimizadas para blogs y artículos.",
    path: "/herramientas/blog-viz"
  },
  {
    id: 3,
    name: "Content Studio",
    status: "Beta",
    function: "Redacción profesional asistida por IA para contenido de alto ranking.",
    path: "/herramientas/redactor-ia"
  },
  {
    id: 4,
    name: "Generador Informes",
    status: "Interno",
    function: "Creación automatizada de informes de rendimiento y auditoría.",
    path: "/herramientas/generador-informes"
  },
  {
    id: 5,
    name: "Redactor IA 2.0",
    status: "Beta Pro",
    function: "Versión avanzada con análisis de investigación y reportes automáticos.",
    path: "/herramientas/redactor-ia-2"
  }
];

export const INSIGHTS = [
  {
    id: 1,
    category: "Realismo",
    date: "OCT 2025",
    title: "Search Console no miente: El polígrafo de tu negocio",
    excerpt: "Cómo leer la realidad de tu tráfico sin el sesgo del optimismo corporativo."
  },
  {
    id: 2,
    category: "Arquitectura",
    date: "SEP 2025",
    title: "Por qué tu estructura actual está matando tu conversión",
    excerpt: "Análisis de laberintos web y cómo derribarlos para crear flujos de dominación."
  },
  {
    id: 3,
    category: "Estrategia",
    date: "AGO 2025",
    title: "Viabilidad SEO: Cuándo es mejor retirarse",
    excerpt: "Saber cuándo no invertir es tan importante como saber dónde poner todo el presupuesto."
  }
];

export const METRICS = [
  {
    id: 1,
    value: "100%",
    label: "Transparencia Radical",
    context: "Informes de viabilidad crudos. Si el proyecto no va a funcionar, lo sabrás en la primera semana."
  },
  {
    id: 2,
    value: "+3.5%",
    label: "Tasa de Conversión",
    context: "Media de mejora en CR tras implementar arquitecturas de dominio centradas en el usuario."
  },
  {
    id: 3,
    value: "8/10",
    label: "Retención de Élite",
    context: "Ocho de cada diez clientes que pasan nuestro filtro inicial renuevan su plan de ejecución anual."
  }
];

export const TECH_STACK = [
  { id: 1, name: "Search Console" },
  { id: 2, name: "Python" },
  { id: 3, name: "BigQuery" },
  { id: 4, name: "Data Studio" },
  { id: 5, name: "Screaming Frog" },
  { id: 6, name: "NLP" },
  { id: 7, name: "API Analysis" },
  { id: 8, name: "Pandas" }
];

export const CASE_STUDIES = [
  {
    id: 1,
    industry: "Finanzas",
    client: "Inversión Segura",
    tags: ["Viabilidad", "Estrategia"],
    challenge: "Inversión masiva en contenidos sin retorno claro ni arquitectura lógica.",
    solution: "Rediseño total de SILOs basado en clústeres de intención de alta rentabilidad.",
    result: "Dominio del Nicho"
  },
  {
    id: 2,
    industry: "Retail Tech",
    client: "GadgetMaster",
    tags: ["Técnico", "Ejecución"],
    challenge: "Pérdida de autoridad tras una migración 'profesional' mal ejecutada.",
    solution: "Auditoría forense y recuperación de activos mediante plan de ejecución quirúrgico.",
    result: "Tráfico Recuperado"
  }
];

export const BIO_EVENTS = [
  {
    year: "2023 - Presente",
    role: "Arquitecto-Ejecutor SEO",
    company: "Simón Sandrea"
  },
  {
    year: "2021",
    role: "Consultor de Viabilidad Estratégica",
    company: "Proyectos de Alto Valor"
  },
  {
    year: "2018",
    role: "Ingeniero de Sistemas y SEO Técnico",
    company: "Agencia de Ejecución"
  }
];