// All site copy lives here so it can be edited without touching the 3D code.
// Source: https://www.desert-technologies.com/companies/nurun

export const CONTACT_URL = 'https://www.desert-technologies.com/Contact';

export const hero = {
  eyebrow: 'Nurun · A Desert Technologies company',
  title: ['Clean energy,', 'engineered for', 'the desert.'],
  body:
    'Integrated clean energy solutions and intelligent mobility platforms that power sustainable transformation, built for harsh desert conditions, deployed at speed and guaranteed for performance.',
};

export const chain = {
  eyebrow: 'One integrated platform',
  title: 'From sunlight to the road, one system.',
  body:
    'Nurun connects every link of the clean energy chain: we generate it, store it, put it to work in vehicles, and keep the whole system running.',
  steps: [
    { k: '01', t: 'Generate', d: 'Utility-scale solar PV, designed for heat, dust and sand.' },
    { k: '02', t: 'Store', d: 'Battery storage that turns daylight into power on demand.' },
    { k: '03', t: 'Charge', d: 'Smart EV charging fed by clean, stored energy.' },
    { k: '04', t: 'Operate', d: 'EPC delivery and long-term O&M under one roof.' },
  ],
};

export type Vertical = {
  id: string;
  index: string;
  name: string;
  tagline: string;
  body: string;
  points: string[];
  href: string;
};

export const verticals: Vertical[] = [
  {
    id: 'power',
    index: '02',
    name: 'Nurun Power',
    tagline: 'Energy storage that keeps the grid steady.',
    body:
      'Advanced energy storage systems that change how renewable energy is captured, stored and used. They optimise the integration of renewables, improve grid stability and provide backup power.',
    points: ['Grid-scale projects', 'Commercial & industrial', 'Residential', 'Rural & off-grid'],
    href: 'https://www.desert-technologies.com/solutions/electrification-and-digital-energy',
  },
  {
    id: 'mobility',
    index: '03',
    name: 'Nurun Mobility',
    tagline: 'Charging for the electric era.',
    body:
      'E-mobility solutions that speed up EV adoption: smart charging infrastructure and intelligent energy management, building a seamless e-mobility ecosystem that reduces dependence on fossil fuels.',
    points: ['Smart charging infrastructure', 'Intelligent energy management', 'For drivers, fleets & public entities'],
    href: 'https://www.desert-technologies.com/solutions/e-mobility',
  },
  {
    id: 'engineering',
    index: '04',
    name: 'Nurun Engineering',
    tagline: 'Solar projects, delivered end to end.',
    body:
      'Engineering, Procurement and Construction (EPC) plus Operations & Maintenance. From feasibility studies and design to high-quality components and construction, we deliver solar projects tailored to each client.',
    points: ['Feasibility & design', 'Procurement', 'Construction', 'Operations & maintenance'],
    href: 'https://www.desert-technologies.com/solutions/engineering-development-services',
  },
];

export const contact = {
  eyebrow: '05 · Let’s build',
  title: 'Power your next project with Nurun.',
  body: 'Tell us about your site, fleet or grid challenge. Our team will design the right mix of solar, storage and charging.',
};

export const nav = [
  { href: '#power', label: 'Power' },
  { href: '#mobility', label: 'Mobility' },
  { href: '#engineering', label: 'Engineering' },
];

// Section ids in scroll order. The camera has one keyframe per section.
export const SECTIONS = ['hero', 'chain', 'power', 'mobility', 'engineering', 'contact'] as const;
