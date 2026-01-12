// Multi-Industry Configuration for AI Sales System
// Defines supported industries with their specific keywords, pain points, and value propositions

export interface IndustryConfig {
  id: string;
  name: string;
  icon: string;
  keywords: string[];
  subCategories: string[];
  defaultCostPerLead: number;
  painPoints: string[];
  valuePropositions: string[];
  analysisPromptFocus: string[];
  callPersona: string;
  voicemailIntro: string;
}

export const INDUSTRY_CONFIGS: Record<string, IndustryConfig> = {
  healthcare: {
    id: 'healthcare',
    name: 'Healthcare',
    icon: '🏥',
    keywords: [
      'medical', 'clinic', 'doctor', 'hospital', 'dental', 'dentist', 'therapy', 
      'therapist', 'physician', 'surgery', 'urgent care', 'medspa', 'med spa',
      'chiropractor', 'optometrist', 'dermatology', 'cardiology', 'pediatric',
      'orthopedic', 'physical therapy', 'mental health', 'psychiatry', 'pharmacy',
      'veterinary', 'vet clinic', 'health center', 'wellness center', 'rehab',
      'nursing', 'hospice', 'home health', 'diagnostic', 'radiology', 'laboratory'
    ],
    subCategories: ['dental', 'urgent_care', 'specialist', 'therapy', 'medspa', 'veterinary'],
    defaultCostPerLead: 150,
    painPoints: [
      'Missed appointments costing you revenue',
      'Staff drowning in phone calls',
      'Patients not returning for follow-ups'
    ],
    valuePropositions: [
      'Most practices lose $150-200 per no-show. If you have 10 a week, that\'s $8,000 a month walking out the door. We cut no-shows by 40% with automated reminders. That\'s $3,200 back in your pocket monthly.',
      'Your front desk probably handles 80+ calls a day. If half could be handled automatically - scheduling, refills, basic questions - that\'s 4 hours saved daily. That\'s one FTE worth of productivity back.',
      'Practices lose 20% of patients annually just from lack of follow-up. For a 2,000 patient practice, that\'s 400 patients. At $500 lifetime value each, you\'re leaving $200K on the table.'
    ],
    analysisPromptFocus: [
      'Patient scheduling and appointment management',
      'Insurance and billing efficiency',
      'Patient engagement and retention',
      'HIPAA compliance considerations',
      'Medical staff workflow optimization'
    ],
    callPersona: 'ScrapeX Healthcare Solutions',
    voicemailIntro: 'Hi, this is Alex from ScrapeX Healthcare Solutions'
  },

  restaurant: {
    id: 'restaurant',
    name: 'Restaurant & Food Service',
    icon: '🍽️',
    keywords: [
      'restaurant', 'cafe', 'coffee shop', 'bakery', 'catering', 'food', 'dining',
      'pizzeria', 'bistro', 'bar', 'grill', 'kitchen', 'eatery', 'deli',
      'fast food', 'takeout', 'delivery', 'food truck', 'brewery', 'winery',
      'sushi', 'steakhouse', 'seafood', 'mexican', 'italian', 'chinese',
      'thai', 'indian', 'burger', 'sandwich', 'salad', 'dessert', 'ice cream'
    ],
    subCategories: ['fine_dining', 'casual', 'fast_casual', 'catering', 'food_truck'],
    defaultCostPerLead: 50,
    painPoints: [
      'Reservation no-shows eating into your revenue',
      'Online ordering gaps losing customers to competitors',
      'Negative reviews hurting your reputation'
    ],
    valuePropositions: [
      'Restaurants lose $150-300 per no-show reservation. With 5 weekly no-shows, that\'s $3,000-6,000 monthly. Our automated confirmation system cuts no-shows by 35%.',
      'Restaurants without proper online ordering lose 30% of potential orders to competitors. We help you capture those orders and increase average ticket size by 15%.',
      'One negative review costs you an average of 30 customers. Our review management system helps you respond quickly and turn unhappy diners into loyal customers.'
    ],
    analysisPromptFocus: [
      'Reservation and table management',
      'Online ordering and delivery optimization',
      'Review and reputation management',
      'Staff scheduling and labor costs',
      'Menu optimization and pricing'
    ],
    callPersona: 'ScrapeX Restaurant Growth',
    voicemailIntro: 'Hi, this is Alex from ScrapeX Restaurant Growth Solutions'
  },

  legal: {
    id: 'legal',
    name: 'Legal Services',
    icon: '⚖️',
    keywords: [
      'attorney', 'lawyer', 'law firm', 'legal', 'paralegal', 'litigation',
      'criminal defense', 'personal injury', 'family law', 'divorce', 'estate planning',
      'bankruptcy', 'immigration', 'corporate law', 'intellectual property',
      'real estate law', 'employment law', 'tax attorney', 'civil rights',
      'medical malpractice', 'wrongful death', 'workers compensation'
    ],
    subCategories: ['personal_injury', 'family_law', 'criminal', 'corporate', 'estate'],
    defaultCostPerLead: 500,
    painPoints: [
      'Slow response time losing leads to competitors',
      'Client intake bottlenecks wasting attorney time',
      'Follow-up gaps letting cases go cold'
    ],
    valuePropositions: [
      'Studies show 78% of clients hire the first attorney who responds. If you\'re losing 5 leads monthly due to slow response, at $3,000 average case value, that\'s $15,000 walking away.',
      'Partners spend 2-3 hours daily on intake calls. At $300/hour, that\'s $150,000 annually in lost billable time. Our automated intake captures and qualifies leads 24/7.',
      'Law firms lose 40% of potential cases due to poor follow-up. For every 10 consultations, 4 go cold. Our nurture system converts 25% more consultations to retained clients.'
    ],
    analysisPromptFocus: [
      'Client intake and case qualification',
      'Lead response time and conversion',
      'Document management efficiency',
      'Billing and time tracking',
      'Client communication and updates'
    ],
    callPersona: 'ScrapeX Legal Solutions',
    voicemailIntro: 'Hi, this is Alex from ScrapeX Legal Practice Solutions'
  },

  real_estate: {
    id: 'real_estate',
    name: 'Real Estate',
    icon: '🏠',
    keywords: [
      'realtor', 'real estate', 'property', 'broker', 'realty', 'homes for sale',
      'real estate agent', 'property management', 'commercial real estate',
      'residential', 'mortgage', 'lending', 'title company', 'escrow',
      'appraisal', 'property listing', 'mls', 'housing', 'apartment', 'condo'
    ],
    subCategories: ['residential', 'commercial', 'property_management', 'mortgage'],
    defaultCostPerLead: 300,
    painPoints: [
      'Lead response time costing you listings',
      'Showing scheduling chaos eating your time',
      'Leads going cold from lack of follow-up'
    ],
    valuePropositions: [
      'Agents who respond within 5 minutes are 100x more likely to connect with leads. If you\'re missing just 3 leads monthly at $9,000 average commission, that\'s $27,000 lost annually.',
      'The average agent spends 15 hours weekly coordinating showings. Our automated scheduling system cuts that in half, giving you 7+ hours back for selling.',
      'Only 12% of real estate leads convert on first contact. Our 90-day nurture sequence increases conversion by 40%, turning cold leads into closed deals.'
    ],
    analysisPromptFocus: [
      'Lead capture and response time',
      'Property listing and marketing',
      'Showing scheduling and coordination',
      'Client nurturing and follow-up',
      'Market analysis and pricing tools'
    ],
    callPersona: 'ScrapeX Real Estate Growth',
    voicemailIntro: 'Hi, this is Alex from ScrapeX Real Estate Solutions'
  },

  automotive: {
    id: 'automotive',
    name: 'Automotive Services',
    icon: '🚗',
    keywords: [
      'auto repair', 'mechanic', 'car', 'vehicle', 'automotive', 'auto body',
      'collision', 'tire', 'oil change', 'brake', 'transmission', 'engine',
      'car dealership', 'used cars', 'car wash', 'detailing', 'towing',
      'fleet service', 'motorcycle', 'rv', 'boat', 'diesel', 'hybrid'
    ],
    subCategories: ['repair_shop', 'dealership', 'body_shop', 'specialty'],
    defaultCostPerLead: 75,
    painPoints: [
      'Missed appointment reminders losing customers',
      'Service follow-up gaps hurting retention',
      'Phone tag making scheduling a nightmare'
    ],
    valuePropositions: [
      'Auto shops lose $200 per missed appointment. With 5 weekly no-shows, that\'s $4,000 monthly. Our reminder system cuts no-shows by 50%, putting $2,000 back in your pocket.',
      'Shops that follow up on declined services see 35% of customers return within 90 days. That\'s thousands in recaptured revenue from work you already quoted.',
      'The average shop misses 20% of calls. At $400 average repair order, missing 5 calls weekly costs you $8,000 monthly. Our 24/7 booking captures those jobs.'
    ],
    analysisPromptFocus: [
      'Appointment scheduling and reminders',
      'Service follow-up and upselling',
      'Customer retention and loyalty',
      'Inventory and parts management',
      'Technician scheduling and efficiency'
    ],
    callPersona: 'ScrapeX Auto Shop Solutions',
    voicemailIntro: 'Hi, this is Alex from ScrapeX Automotive Solutions'
  },

  home_services: {
    id: 'home_services',
    name: 'Home Services',
    icon: '🔧',
    keywords: [
      'plumber', 'plumbing', 'electrician', 'electrical', 'hvac', 'heating',
      'cooling', 'air conditioning', 'contractor', 'construction', 'roofing',
      'roofer', 'landscaping', 'lawn care', 'pest control', 'cleaning',
      'maid service', 'handyman', 'painting', 'flooring', 'remodeling',
      'garage door', 'security', 'locksmith', 'pool service', 'moving'
    ],
    subCategories: ['plumbing', 'electrical', 'hvac', 'construction', 'maintenance'],
    defaultCostPerLead: 150,
    painPoints: [
      'Missed calls sending customers to competitors',
      'Quote follow-up falling through the cracks',
      'Seasonal demand swings crushing cash flow'
    ],
    valuePropositions: [
      'Home service companies miss 30% of calls. At $500 average job, missing 10 calls weekly costs you $20,000 monthly. Our 24/7 answering captures those jobs.',
      'Only 20% of contractors follow up on quotes. Of those who do, 40% close the deal. That\'s leaving money on the table with every unanswered quote.',
      'Smart contractors smooth seasonal peaks by booking maintenance in slow months. Our automated scheduling fills your calendar year-round.'
    ],
    analysisPromptFocus: [
      'Lead capture and call handling',
      'Quote generation and follow-up',
      'Scheduling and dispatch efficiency',
      'Customer reviews and reputation',
      'Seasonal demand management'
    ],
    callPersona: 'ScrapeX Home Services',
    voicemailIntro: 'Hi, this is Alex from ScrapeX Home Services Solutions'
  },

  professional_services: {
    id: 'professional_services',
    name: 'Professional Services',
    icon: '💼',
    keywords: [
      'accounting', 'accountant', 'cpa', 'bookkeeping', 'consulting', 'consultant',
      'marketing agency', 'digital marketing', 'seo', 'web design', 'it services',
      'staffing', 'recruiting', 'hr', 'human resources', 'insurance agency',
      'financial advisor', 'wealth management', 'architecture', 'engineering',
      'surveying', 'design firm', 'public relations', 'advertising'
    ],
    subCategories: ['accounting', 'consulting', 'marketing', 'it', 'financial'],
    defaultCostPerLead: 200,
    painPoints: [
      'Proposal delays losing deals to competitors',
      'Client communication gaps hurting retention',
      'Project scope creep eating into margins'
    ],
    valuePropositions: [
      'Firms that send proposals within 24 hours win 60% more deals. Our automated proposal system cuts turnaround from days to hours.',
      'Client retention is 5x cheaper than acquisition. Our automated check-ins and updates increase retention by 25%.',
      'Scope creep costs the average firm 15% of project profit. Our project tracking and alerts keep projects on budget and clients informed.'
    ],
    analysisPromptFocus: [
      'Proposal and quote generation',
      'Client communication and updates',
      'Project management and tracking',
      'Time tracking and billing',
      'Client retention and upselling'
    ],
    callPersona: 'ScrapeX Business Solutions',
    voicemailIntro: 'Hi, this is Alex from ScrapeX Business Solutions'
  },

  spa_wellness: {
    id: 'spa_wellness',
    name: 'Spa & Wellness',
    icon: '💆',
    keywords: [
      'spa', 'massage', 'yoga', 'fitness', 'salon', 'hair salon', 'nail salon',
      'beauty', 'esthetician', 'facial', 'waxing', 'tanning', 'gym',
      'personal training', 'pilates', 'meditation', 'acupuncture',
      'wellness center', 'day spa', 'resort spa', 'barber', 'barbershop'
    ],
    subCategories: ['spa', 'salon', 'fitness', 'wellness', 'beauty'],
    defaultCostPerLead: 60,
    painPoints: [
      'Booking gaps leaving chairs and rooms empty',
      'Membership cancellations hurting revenue',
      'Gift card revenue sitting unused'
    ],
    valuePropositions: [
      'Empty slots cost you $50-150 each. With 10 weekly gaps, that\'s $2,000-6,000 monthly. Our smart scheduling fills cancellations automatically.',
      'The average spa loses 20% of members annually. At $100/month, 50 lost members costs $60,000 yearly. Our retention system cuts churn by 30%.',
      '20% of gift cards go unredeemed. For every $10,000 in gift card sales, $2,000 sits unused. Our reminder system brings those customers back.'
    ],
    analysisPromptFocus: [
      'Appointment booking and optimization',
      'Membership and package management',
      'Client retention and rebooking',
      'Gift card and promotion tracking',
      'Staff scheduling and utilization'
    ],
    callPersona: 'ScrapeX Spa & Wellness Solutions',
    voicemailIntro: 'Hi, this is Alex from ScrapeX Wellness Solutions'
  },

  general: {
    id: 'general',
    name: 'General Business',
    icon: '🏢',
    keywords: [],
    subCategories: ['retail', 'service', 'manufacturing', 'other'],
    defaultCostPerLead: 100,
    painPoints: [
      'Missed opportunities from slow response times',
      'Customer retention challenges',
      'Operational inefficiencies hurting margins'
    ],
    valuePropositions: [
      'Businesses that respond within an hour are 7x more likely to qualify leads. Our automation ensures instant response every time.',
      'Acquiring a new customer costs 5-25x more than keeping one. Our retention tools help you maximize customer lifetime value.',
      'Most businesses lose 20-30% of revenue to inefficiency. Our optimization tools help you recapture that lost revenue.'
    ],
    analysisPromptFocus: [
      'Lead capture and response',
      'Customer communication',
      'Sales process optimization',
      'Operational efficiency',
      'Growth opportunities'
    ],
    callPersona: 'ScrapeX Business Solutions',
    voicemailIntro: 'Hi, this is Alex from ScrapeX Business Solutions'
  }
};

// Get all industry IDs for dropdown
export const INDUSTRY_OPTIONS = Object.keys(INDUSTRY_CONFIGS).filter(id => id !== 'general');

// Detect industry from scraped content using keyword matching
export function detectIndustryFromContent(content: string): { industry: string; confidence: 'high' | 'medium' | 'low'; matchedKeywords: string[] } {
  const lowerContent = content.toLowerCase();
  const scores: Record<string, { count: number; keywords: string[] }> = {};

  // Score each industry based on keyword matches
  for (const [industryId, config] of Object.entries(INDUSTRY_CONFIGS)) {
    if (industryId === 'general') continue;
    
    scores[industryId] = { count: 0, keywords: [] };
    
    for (const keyword of config.keywords) {
      // Count occurrences of each keyword
      const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = lowerContent.match(regex);
      if (matches) {
        scores[industryId].count += matches.length;
        if (!scores[industryId].keywords.includes(keyword)) {
          scores[industryId].keywords.push(keyword);
        }
      }
    }
  }

  // Find the industry with the highest score
  let bestMatch = 'general';
  let highestScore = 0;
  let matchedKeywords: string[] = [];

  for (const [industryId, { count, keywords }] of Object.entries(scores)) {
    if (count > highestScore) {
      highestScore = count;
      bestMatch = industryId;
      matchedKeywords = keywords;
    }
  }

  // Determine confidence based on match strength
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (highestScore >= 10 && matchedKeywords.length >= 3) {
    confidence = 'high';
  } else if (highestScore >= 5 && matchedKeywords.length >= 2) {
    confidence = 'medium';
  } else if (highestScore >= 2) {
    confidence = 'low';
  } else {
    bestMatch = 'general';
  }

  return { industry: bestMatch, confidence, matchedKeywords };
}

// Get industry config by ID with fallback to general
export function getIndustryConfig(industryId: string): IndustryConfig {
  return INDUSTRY_CONFIGS[industryId] || INDUSTRY_CONFIGS.general;
}
