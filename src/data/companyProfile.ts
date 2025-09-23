export interface CompanyProfile {
  name: string;
  coreServices: string[];
  specializations: string[];
  certifications: string[];
  keyPersonnel: {
    name: string;
    role: string;
    experience: string;
    specialties: string[];
  }[];
  teamSize: {
    total: number;
    skilled: number;
    certified: number;
  };
  pastProjects: {
    name: string;
    year: number;
    value: number;
    type: string;
    location: string;
    highlights: string[];
    status: 'completed' | 'ongoing';
  }[];
  uniqueSellingPoints: string[];
  geographicFocus: string[];
  financialCapacity: {
    maxProjectValue: number;
    bondingCapacity: number;
    insuranceCoverage: number;
  };
  sustainability: {
    certifications: string[];
    practices: string[];
    achievements: string[];
  };
  performanceMetrics: {
    onTimeDeliveryRate: number;
    budgetComplianceRate: number;
    safetyRecord: string;
    clientSatisfactionScore: number;
  };
}

export const defaultCompanyProfile: CompanyProfile = {
  name: "Premier Construction Solutions Ltd",
  coreServices: [
    "Commercial new builds (offices, retail units)",
    "Government infrastructure projects (schools, public facilities)",
    "High-end residential developments",
    "Renovation and refurbishment projects",
    "Design and build contracts"
  ],
  specializations: [
    "Sustainable building practices and green materials",
    "Heritage building restoration",
    "Modern Methods of Construction (MMC)",
    "BIM and digital construction technologies",
    "Complex structural engineering projects"
  ],
  certifications: [
    "ISO 9001 Quality Management",
    "ISO 14001 Environmental Management",
    "OHSAS 18001 Health & Safety",
    "BREEAM Certified Professionals",
    "CHAS Accredited",
    "Constructionline Gold Member"
  ],
  keyPersonnel: [
    {
      name: "James Patterson",
      role: "Managing Director",
      experience: "25 years in construction management",
      specialties: ["Project delivery", "Client relations", "Strategic planning"]
    },
    {
      name: "Sarah Mitchell",
      role: "Lead Architect",
      experience: "18 years in sustainable design",
      specialties: ["Eco-friendly designs", "Planning permissions", "Heritage projects"]
    },
    {
      name: "David Thompson",
      role: "Construction Manager",
      experience: "22 years in site management",
      specialties: ["Large-scale projects", "Health & safety", "Quality control"]
    },
    {
      name: "Emma Clarke",
      role: "Quantity Surveyor",
      experience: "15 years in cost management",
      specialties: ["Cost estimation", "Value engineering", "Contract administration"]
    }
  ],
  teamSize: {
    total: 85,
    skilled: 65,
    certified: 45
  },
  pastProjects: [
    {
      name: "Central London Office Complex",
      year: 2024,
      value: 15000000,
      type: "Commercial",
      location: "Central London",
      highlights: [
        "5-story commercial office block",
        "Delivered 2 weeks ahead of schedule",
        "15% under budget due to innovative waste-reduction system",
        "BREEAM 'Very Good' rating achieved"
      ],
      status: "completed"
    },
    {
      name: "Grade II Listed Library Renovation",
      year: 2023,
      value: 5000000,
      type: "Heritage/Public",
      location: "Kent",
      highlights: [
        "Sensitive restoration of Grade II listed building",
        "Praised by Historic England for heritage material handling",
        "Incorporated modern accessibility features",
        "Won Regional Heritage Award 2023"
      ],
      status: "completed"
    },
    {
      name: "Sustainable Homes Development",
      year: 2022,
      value: 10000000,
      type: "Residential",
      location: "Kent",
      highlights: [
        "50 sustainable homes with renewable energy systems",
        "BREEAM 'Excellent' rating achieved",
        "100% social housing for local council",
        "Featured in Construction News as best practice example"
      ],
      status: "completed"
    },
    {
      name: "Primary School Extension",
      year: 2024,
      value: 3500000,
      type: "Education",
      location: "Essex",
      highlights: [
        "Phased construction to minimize disruption",
        "Delivered during term time with zero safety incidents",
        "Energy-efficient design reduces running costs by 40%"
      ],
      status: "ongoing"
    }
  ],
  uniqueSellingPoints: [
    "Sustainability Focus: Leaders in low-carbon construction in the South East",
    "On-Time Guarantee: 98% on-time project completion rate",
    "Local Supply Chain: Priority given to local suppliers in Greater London area",
    "Digital Innovation: Early adopters of BIM and construction technology",
    "Heritage Expertise: Specialist team for listed building projects",
    "Zero Accident Culture: Outstanding health and safety record"
  ],
  geographicFocus: [
    "Greater London",
    "South East England",
    "Kent",
    "Essex",
    "Surrey",
    "Hertfordshire"
  ],
  financialCapacity: {
    maxProjectValue: 25000000,
    bondingCapacity: 50000000,
    insuranceCoverage: 10000000
  },
  sustainability: {
    certifications: [
      "BREEAM Certified Company",
      "Carbon Trust Standard",
      "Supply Chain Sustainability School Gold Member"
    ],
    practices: [
      "Waste reduction and circular economy principles",
      "Local material sourcing where possible",
      "Energy-efficient construction methods",
      "Renewable energy integration",
      "Biodiversity enhancement on projects"
    ],
    achievements: [
      "50% reduction in construction waste over 3 years",
      "Carbon neutral operations since 2023",
      "Winner of Green Construction Awards 2023"
    ]
  },
  performanceMetrics: {
    onTimeDeliveryRate: 98,
    budgetComplianceRate: 95,
    safetyRecord: "Zero accidents in 24+ months",
    clientSatisfactionScore: 4.8
  }
};

export const getCompanyProfile = (): CompanyProfile => {
  // In a real app, this would fetch from API or local storage
  return defaultCompanyProfile;
};

export const updateCompanyProfile = (profile: CompanyProfile): void => {
  // In a real app, this would save to API or local storage
  localStorage.setItem('companyProfile', JSON.stringify(profile));
};