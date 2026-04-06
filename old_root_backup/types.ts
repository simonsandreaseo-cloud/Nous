export interface NavItem {
  id: string;
  label: string;
  href: string;
}

export interface StrategicAttribute {
  id: 'clara' | 'realista' | 'potente';
  title: string; // The Concept
  subtitle: string; // The Application
  description: string; // The Manifest
  hexColor: string;
  path: string;
}

export interface SiteConfig {
  author: string;
  role: string;
  h1: string;
  subheadline: string;
  attributes: StrategicAttribute[];
  contactEmail: string;
}