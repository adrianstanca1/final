import { TenderOpportunity } from '../types/procurement';

export const sampleTenders: TenderOpportunity[] = [
  {
    id: 'tender-001',
    title: 'New Primary School Construction - Hertfordshire',
    description: 'Construction of a new 420-pupil primary school including main teaching block, sports hall, dining hall, and outdoor facilities. The project requires sustainable construction methods and must achieve BREEAM Very Good rating minimum. Phased construction to allow continued operation of existing temporary facilities.',
    client: 'Hertfordshire County Council',
    value: 8500000,
    location: 'Stevenage, Hertfordshire',
    deadline: '2025-11-15',
    publishDate: '2025-09-15',
    category: 'education',
    requirements: [
      'BREEAM Very Good rating minimum',
      'Phased construction plan to minimize disruption',
      'Sustainable materials and construction methods',
      'Experience in education sector projects',
      'Local supply chain preference',
      'H&S record - zero accidents in last 24 months',
      'ISO 9001 and ISO 14001 certification',
      'Financial capacity for £8.5M project value',
      'Completion within 18-month timeframe'
    ],
    url: 'https://www.hertfordshire.gov.uk/tenders/tender-001',
    contactInfo: {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@hertfordshire.gov.uk',
      phone: '01707 292000'
    }
  },
  {
    id: 'tender-002',
    title: 'Grade II Listed Library Restoration - Canterbury',
    description: 'Comprehensive restoration and modernization of a Grade II listed Victorian library building. Work includes structural repairs, heritage restoration, installation of modern accessibility features, and energy efficiency improvements while preserving historical character.',
    client: 'Canterbury City Council',
    value: 4200000,
    location: 'Canterbury, Kent',
    deadline: '2025-10-30',
    publishDate: '2025-09-10',
    category: 'heritage',
    requirements: [
      'Proven experience with Grade II listed buildings',
      'Historic England approval process management',
      'Heritage material sourcing and restoration techniques',
      'Modern accessibility compliance (DDA)',
      'Energy efficiency improvements within heritage constraints',
      'Local authority planning permission experience',
      'Specialist heritage insurance requirements',
      'Conservation accredited professionals on team',
      'Minimum 15 years heritage construction experience'
    ],
    url: 'https://www.canterbury.gov.uk/tenders/library-restoration',
    contactInfo: {
      name: 'Michael Thompson',
      email: 'm.thompson@canterbury.gov.uk',
      phone: '01227 862000'
    }
  },
  {
    id: 'tender-003',
    title: 'Commercial Office Development - Canary Wharf',
    description: 'Construction of a 12-story commercial office building with ground floor retail units. BREEAM Outstanding rating required. Project includes basement parking, rooftop garden, and integrated renewable energy systems. Fast-track delivery essential.',
    client: 'Canary Wharf Group',
    value: 24000000,
    location: 'Canary Wharf, London E14',
    deadline: '2025-12-01',
    publishDate: '2025-09-20',
    category: 'commercial',
    requirements: [
      'BREEAM Outstanding rating mandatory',
      'High-rise construction experience (10+ stories)',
      'Fast-track delivery capability',
      'London construction experience essential',
      'Financial capacity for £24M+ projects',
      'Renewable energy integration experience',
      'Complex urban site management',
      'BIM Level 2 capability',
      'CDM Principal Designer role capability',
      'Minimum £50M bonding capacity'
    ],
    url: 'https://www.canarywharf.com/tenders/office-development-2025',
    contactInfo: {
      name: 'James Mitchell',
      email: 'j.mitchell@canarywharf.com',
      phone: '020 7418 2000'
    }
  },
  {
    id: 'tender-004',
    title: 'Social Housing Development - Dagenham',
    description: 'Construction of 85 affordable homes across 3 blocks including 1, 2, and 3-bedroom units. Project emphasizes community integration, energy efficiency, and sustainable construction. Local employment and apprenticeship opportunities required.',
    client: 'Barking and Dagenham Council',
    value: 12000000,
    location: 'Dagenham, Essex',
    deadline: '2025-11-20',
    publishDate: '2025-09-12',
    category: 'residential',
    requirements: [
      'Social housing construction experience',
      'Energy efficiency - SAP rating 92+',
      'Local employment scheme (20% minimum)',
      'Apprenticeship program commitment',
      'Community consultation experience',
      'Secure by Design certification',
      'Lifetime Homes standard compliance',
      'Local supplier engagement (30% target)',
      'Completion within 24 months'
    ],
    url: 'https://www.lbbd.gov.uk/tenders/social-housing-2025',
    contactInfo: {
      name: 'Emma Clarke',
      email: 'emma.clarke@lbbd.gov.uk',
      phone: '020 8227 2000'
    }
  },
  {
    id: 'tender-005',
    title: 'Hospital Wing Extension - NHS Foundation Trust',
    description: 'Two-story extension to existing hospital including new surgical suites, recovery wards, and support facilities. Project requires specialized healthcare construction experience and must maintain full hospital operations during construction.',
    client: 'East Kent Hospitals NHS Foundation Trust',
    value: 15500000,
    location: 'Ashford, Kent',
    deadline: '2025-12-10',
    publishDate: '2025-09-18',
    category: 'healthcare',
    requirements: [
      'Healthcare construction specialization',
      'Live hospital environment experience',
      'Infection control procedures expertise',
      'Medical gas and electrical systems',
      'HBN and HTM compliance knowledge',
      '24/7 construction capability',
      'Phased handover experience',
      'NHS procurement procedures familiarity',
      'Enhanced DBS clearance for all site staff',
      'Specialist healthcare insurance requirements'
    ],
    url: 'https://www.ekhuft.nhs.uk/tenders/hospital-extension',
    contactInfo: {
      name: 'Dr. Robert Williams',
      email: 'robert.williams@nhs.net',
      phone: '01233 616000'
    }
  }
];

export const getSampleTenders = (): TenderOpportunity[] => {
  return sampleTenders;
};

export const getTenderById = (id: string): TenderOpportunity | undefined => {
  return sampleTenders.find(tender => tender.id === id);
};