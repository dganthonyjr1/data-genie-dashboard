import { createContext, useContext, useState, ReactNode } from "react";

// Sample data that showcases the full scrape-to-call pipeline
export const DEMO_LEADS = [
  {
    id: "demo-1",
    business_name: "Sunshine Dental Care",
    phone: "+1 (555) 123-4567",
    email: "info@sunshinedentalcare.com",
    website: "https://sunshinedentalcare.com",
    address: "1234 Oak Street, San Francisco, CA 94102",
    niche: "Dental Practice",
    description: "Family dentistry practice offering general and cosmetic services since 1995.",
    services: ["General Dentistry", "Cosmetic Dentistry", "Orthodontics", "Dental Implants"],
    rating: 4.2,
    reviews_count: 127,
    pain_score: 78,
    estimated_revenue_leak: 8500,
    evidence: [
      "No online booking system detected - losing potential after-hours appointments",
      "Website not mobile-optimized - 60% of searches are mobile",
      "No patient reviews response strategy - negative reviews unanswered",
      "Missing Google Business Profile optimization"
    ],
    scraped_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    call_status: "completed",
    // Predictive scoring
    prediction: {
      conversionProbability: 87,
      confidence: "high",
      optimalContactTime: "10:00 AM",
      optimalContactDay: "Tuesday",
      urgencyLevel: "high",
      reasoning: "High pain score combined with significant revenue leak creates strong motivation. Multiple unaddressed pain points indicate openness to solutions.",
      keyFactors: ["High pain score (78)", "Revenue leak $8,500/mo", "Unanswered negative reviews"],
      recommendedApproach: "Lead with mobile optimization ROI and online booking benefits."
    }
  },
  {
    id: "demo-2", 
    business_name: "Elite Auto Repair",
    phone: "+1 (555) 234-5678",
    email: "service@eliteautorepair.com",
    website: "https://eliteautorepair.com",
    address: "567 Main Boulevard, Austin, TX 78701",
    niche: "Auto Repair",
    description: "Full-service auto repair shop specializing in European vehicles.",
    services: ["Oil Changes", "Brake Service", "Engine Repair", "Transmission", "Diagnostics"],
    rating: 4.7,
    reviews_count: 312,
    pain_score: 45,
    estimated_revenue_leak: 3200,
    evidence: [
      "Competitors outranking for key service terms",
      "No service reminder system in place",
      "Missing customer loyalty program"
    ],
    scraped_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    call_status: "pending",
    prediction: {
      conversionProbability: 52,
      confidence: "medium",
      optimalContactTime: "2:00 PM",
      optimalContactDay: "Wednesday",
      urgencyLevel: "medium",
      reasoning: "Moderate pain indicators with strong existing reviews. May be satisfied with current state but open to growth opportunities.",
      keyFactors: ["Moderate pain score (45)", "Strong reviews (4.7)", "Competitor pressure"],
      recommendedApproach: "Focus on competitive advantage and customer retention tools."
    }
  },
  {
    id: "demo-3",
    business_name: "Harmony Wellness Spa",
    phone: "+1 (555) 345-6789",
    email: "book@harmonywellness.com", 
    website: "https://harmonywellnessspa.com",
    address: "890 Serenity Lane, Miami, FL 33101",
    niche: "Spa & Wellness",
    description: "Luxury day spa offering massage, facials, and holistic wellness treatments.",
    services: ["Massage Therapy", "Facials", "Body Treatments", "Meditation", "Yoga Classes"],
    rating: 4.9,
    reviews_count: 489,
    pain_score: 32,
    estimated_revenue_leak: 2100,
    evidence: [
      "Gift card program underutilized",
      "No membership/subscription model",
      "Social media engagement below industry average"
    ],
    scraped_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    call_status: "scheduled",
    prediction: {
      conversionProbability: 34,
      confidence: "medium",
      optimalContactTime: "11:00 AM",
      optimalContactDay: "Thursday",
      urgencyLevel: "low",
      reasoning: "Excellent reviews and low pain score indicate satisfaction. Growth opportunities exist but urgency is low.",
      keyFactors: ["Low pain score (32)", "Excellent reviews (4.9)", "Untapped revenue streams"],
      recommendedApproach: "Position as growth acceleration, not problem-solving."
    }
  },
  {
    id: "demo-4",
    business_name: "ProTech IT Solutions",
    phone: "+1 (555) 456-7890",
    email: "support@protechit.com",
    website: "https://protechitsolutions.com",
    address: "2345 Tech Park Drive, Seattle, WA 98101",
    niche: "IT Services",
    description: "Managed IT services and cybersecurity solutions for small businesses.",
    services: ["Managed IT", "Cybersecurity", "Cloud Migration", "Help Desk", "Network Setup"],
    rating: 4.4,
    reviews_count: 67,
    pain_score: 89,
    estimated_revenue_leak: 15000,
    evidence: [
      "Website has no SSL certificate - ironic for cybersecurity company",
      "No case studies or testimonials visible",
      "Pricing page is outdated (shows 2022 rates)",
      "No live chat or immediate contact option",
      "Blog hasn't been updated in 8 months"
    ],
    scraped_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    call_status: "in_progress",
    prediction: {
      conversionProbability: 94,
      confidence: "high",
      optimalContactTime: "9:00 AM",
      optimalContactDay: "Monday",
      urgencyLevel: "critical",
      reasoning: "Extremely high pain score with massive revenue leak. Multiple critical issues indicate urgent need for help and high likelihood of conversion.",
      keyFactors: ["Critical pain score (89)", "Massive leak $15,000/mo", "Credibility issues"],
      recommendedApproach: "Lead with SSL/security credibility issue - it's embarrassing for a cybersecurity company."
    }
  },
  {
    id: "demo-5",
    business_name: "Golden Years Senior Care",
    phone: "+1 (555) 567-8901",
    email: "care@goldenyearssenior.com",
    website: "https://goldenyearsseniorcare.com",
    address: "678 Comfort Avenue, Phoenix, AZ 85001",
    niche: "Senior Care",
    description: "In-home senior care services providing companionship and daily assistance.",
    services: ["Companionship", "Personal Care", "Medication Reminders", "Light Housekeeping", "Transportation"],
    rating: 4.8,
    reviews_count: 156,
    pain_score: 56,
    estimated_revenue_leak: 6800,
    evidence: [
      "No caregiver spotlight or trust signals",
      "Missing accreditation badges",
      "No family portal for care updates",
      "Competitors have 24/7 availability messaging"
    ],
    scraped_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    call_status: "failed",
    prediction: {
      conversionProbability: 71,
      confidence: "high",
      optimalContactTime: "3:00 PM",
      optimalContactDay: "Tuesday",
      urgencyLevel: "high",
      reasoning: "Trust is paramount in senior care. Missing accreditation badges and family portal are significant competitive disadvantages.",
      keyFactors: ["Trust signals missing", "Revenue leak $6,800/mo", "Competitor advantages"],
      recommendedApproach: "Emphasize trust-building features that drive family decision-making."
    }
  },
];

export const DEMO_JOBS = [
  {
    id: "demo-job-1",
    url: "plumbers in San Francisco CA",
    scrape_type: "google_business_profiles",
    status: "completed",
    results_count: 47,
    fields_count: 12,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-job-2",
    url: "https://example-business.com",
    scrape_type: "complete_business_data",
    status: "completed",
    results_count: 1,
    fields_count: 24,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000 + 45000).toISOString(),
  },
  {
    id: "demo-job-3",
    url: "dental practices in Austin TX",
    scrape_type: "bulk_business_search",
    status: "processing",
    results_count: 23,
    fields_count: 0,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
  {
    id: "demo-job-4",
    url: "auto repair shops Miami FL",
    scrape_type: "google_business_profiles",
    status: "pending",
    results_count: 0,
    fields_count: 0,
    created_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
  },
];

export const DEMO_CALL_ATTEMPTS = [
  {
    id: "demo-call-1",
    business_name: "Sunshine Dental Care",
    phone_number: "+15551234567",
    status: "completed",
    auto_triggered: true,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    payload: { niche: "Dental Practice", pain_score: 78 },
  },
  {
    id: "demo-call-2",
    business_name: "ProTech IT Solutions",
    phone_number: "+15554567890",
    status: "in_progress",
    auto_triggered: true,
    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    payload: { niche: "IT Services", pain_score: 89 },
  },
  {
    id: "demo-call-3",
    business_name: "Golden Years Senior Care",
    phone_number: "+15555678901",
    status: "failed",
    auto_triggered: false,
    error_message: "Call declined by recipient",
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    payload: { niche: "Senior Care", pain_score: 56 },
  },
  {
    id: "demo-call-4",
    business_name: "Elite Auto Repair",
    phone_number: "+15552345678",
    status: "pending",
    auto_triggered: true,
    created_at: new Date(Date.now() - 30 * 1000).toISOString(),
    payload: { niche: "Auto Repair", pain_score: 45 },
  },
];

export const DEMO_STATS = {
  totalJobs: 156,
  completedJobs: 142,
  failedJobs: 8,
  pendingJobs: 6,
  successRate: 94.7,
  avgProcessingTime: 12.4,
  totalLeads: 1847,
  callsInitiated: 892,
  callsCompleted: 734,
  conversionRate: 23.5,
};

interface DemoModeContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  demoLeads: typeof DEMO_LEADS;
  demoJobs: typeof DEMO_JOBS;
  demoCallAttempts: typeof DEMO_CALL_ATTEMPTS;
  demoStats: typeof DEMO_STATS;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

export const DemoModeProvider = ({ children }: { children: ReactNode }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);

  const toggleDemoMode = () => {
    setIsDemoMode((prev) => !prev);
  };

  return (
    <DemoModeContext.Provider
      value={{
        isDemoMode,
        toggleDemoMode,
        demoLeads: DEMO_LEADS,
        demoJobs: DEMO_JOBS,
        demoCallAttempts: DEMO_CALL_ATTEMPTS,
        demoStats: DEMO_STATS,
      }}
    >
      {children}
    </DemoModeContext.Provider>
  );
};

export const useDemoMode = () => {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error("useDemoMode must be used within a DemoModeProvider");
  }
  return context;
};
