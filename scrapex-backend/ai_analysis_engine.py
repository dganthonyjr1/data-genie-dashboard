"""
AI Analysis Engine for Healthcare Facilities
Uses LLM to analyze scraped data and identify revenue opportunities
"""

import json
import logging
from typing import Dict, List, Optional
from datetime import datetime
from openai import OpenAI

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HealthcareAIAnalyzer:
    """Analyzes healthcare facility data using AI to identify opportunities"""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize with OpenAI API key"""
        try:
            self.client = OpenAI(api_key=api_key)
        except Exception as e:
            logger.warning(f"Failed to initialize OpenAI client: {str(e)}. Analysis will be limited.")
            self.client = None
        self.model = "gpt-4.1-mini"  # Using available model

    def analyze_facility(self, facility_data: Dict) -> Dict:
        """
        Analyze a healthcare facility for revenue opportunities
        
        Args:
            facility_data: Dictionary with scraped facility information
            
        Returns:
            Dictionary with analysis results and opportunities
        """
        if not self.client:
            logger.warning("OpenAI client not available, returning basic analysis")
            return self._generate_basic_analysis(facility_data)
        
        try:
            # Prepare analysis prompt
            analysis_prompt = self._create_analysis_prompt(facility_data)
            
            # Call LLM
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1500,
                messages=[
                    {
                        "role": "user",
                        "content": analysis_prompt
                    }
                ]
            )
            
            analysis_text = response.content[0].text
            
            # Parse the analysis
            analysis_result = self._parse_analysis(analysis_text, facility_data)
            
            logger.info(f"Successfully analyzed facility: {facility_data.get('facility_name', 'Unknown')}")
            return analysis_result
            
        except Exception as e:
            logger.error(f"Failed to analyze facility: {str(e)}")
            return self._generate_basic_analysis(facility_data)

    def _create_analysis_prompt(self, facility_data: Dict) -> str:
        """Create a detailed analysis prompt for the LLM"""
        
        prompt = f"""
You are an expert healthcare business consultant analyzing a healthcare facility for revenue opportunities and operational gaps.

FACILITY INFORMATION:
- Name: {facility_data.get('facility_name', 'Unknown')}
- Website: {facility_data.get('url', 'N/A')}
- Phone Numbers: {', '.join(facility_data.get('phone', ['Not found']))}
- Address: {facility_data.get('address', 'Not found')}
- Services: {', '.join(facility_data.get('services', ['Not specified']))}
- Specialties: {', '.join(facility_data.get('specialties', ['Not specified']))}
- Website Quality Score: {facility_data.get('website_quality', {}).get('percentage', 0):.0f}%
- Insurance Accepted: {facility_data.get('insurance', {})}
- Contact Methods: {facility_data.get('contact_methods', {})}

ANALYSIS TASK:
Please provide a comprehensive analysis in JSON format with the following structure:
{{
    "revenue_opportunities": [
        {{
            "opportunity": "specific opportunity",
            "description": "why this is an opportunity",
            "potential_impact": "high/medium/low",
            "implementation_difficulty": "easy/medium/hard"
        }}
    ],
    "operational_gaps": [
        {{
            "gap": "identified gap",
            "description": "why this is a gap",
            "recommendation": "how to address it"
        }}
    ],
    "competitive_positioning": {{
        "strengths": ["strength1", "strength2"],
        "weaknesses": ["weakness1", "weakness2"],
        "opportunities": ["opportunity1", "opportunity2"]
    }},
    "lead_score": 0-100,
    "lead_score_reasoning": "explanation of the score",
    "recommended_pitch": "personalized sales pitch for this facility",
    "urgency": "high/medium/low",
    "next_steps": ["step1", "step2", "step3"]
}}

Focus on:
1. Revenue leaks (services not offered, gaps in specialties)
2. Digital presence gaps (poor website, missing online booking)
3. Operational inefficiencies (limited contact methods, poor accessibility)
4. Market opportunities (underserved specialties, growth potential)
5. Compliance and accreditation gaps

Be specific and actionable. Base recommendations on the data provided.
"""
        return prompt

    def _parse_analysis(self, analysis_text: str, facility_data: Dict) -> Dict:
        """Parse LLM response and structure the analysis"""
        
        try:
            # Extract JSON from response
            json_start = analysis_text.find('{')
            json_end = analysis_text.rfind('}') + 1
            
            if json_start >= 0 and json_end > json_start:
                json_str = analysis_text[json_start:json_end]
                analysis_json = json.loads(json_str)
            else:
                analysis_json = {"raw_analysis": analysis_text}
            
            # Combine with facility data
            result = {
                'facility_name': facility_data.get('facility_name', 'Unknown'),
                'url': facility_data.get('url'),
                'analyzed_at': datetime.now().isoformat(),
                'analysis': analysis_json,
                'lead_score': analysis_json.get('lead_score', 0),
                'urgency': analysis_json.get('urgency', 'medium'),
                'revenue_opportunities': analysis_json.get('revenue_opportunities', []),
                'operational_gaps': analysis_json.get('operational_gaps', []),
                'recommended_pitch': analysis_json.get('recommended_pitch', ''),
            }
            
            return result
            
        except json.JSONDecodeError:
            logger.warning("Failed to parse JSON from LLM response, returning raw analysis")
            return {
                'facility_name': facility_data.get('facility_name', 'Unknown'),
                'url': facility_data.get('url'),
                'analyzed_at': datetime.now().isoformat(),
                'raw_analysis': analysis_text,
                'lead_score': 0,
            }

    def analyze_multiple_facilities(self, facilities_data: List[Dict]) -> List[Dict]:
        """Analyze multiple facilities and return ranked results"""
        
        analyses = []
        for facility in facilities_data:
            if 'error' not in facility:
                analysis = self.analyze_facility(facility)
                analyses.append(analysis)
        
        # Sort by lead score (highest first)
        analyses.sort(key=lambda x: x.get('lead_score', 0), reverse=True)
        
        return analyses

    def generate_call_script(self, facility_analysis: Dict) -> str:
        """Generate a personalized call script based on analysis"""
        
        try:
            prompt = f"""
Based on this healthcare facility analysis, create a concise, professional 30-second cold call script.

Facility: {facility_analysis.get('facility_name')}
Analysis: {json.dumps(facility_analysis.get('analysis', {}), indent=2)}
Recommended Pitch: {facility_analysis.get('recommended_pitch')}

Create a script that:
1. Opens with a compelling hook about their specific opportunity
2. References a specific gap or opportunity identified
3. Proposes a brief conversation
4. Ends with a clear call-to-action

Format as a natural conversation script.
"""
            
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            script = response.content[0].text
            logger.info(f"Generated call script for {facility_analysis.get('facility_name')}")
            return script
            
        except Exception as e:
            logger.error(f"Failed to generate call script: {str(e)}")
            return "Unable to generate script at this time."

    def score_leads(self, analyses: List[Dict]) -> List[Dict]:
        """Score and rank leads by conversion potential"""
        
        scored_leads = []
        
        for analysis in analyses:
            lead = {
                'facility_name': analysis.get('facility_name'),
                'url': analysis.get('url'),
                'lead_score': analysis.get('lead_score', 0),
                'urgency': analysis.get('urgency', 'medium'),
                'revenue_opportunities_count': len(analysis.get('revenue_opportunities', [])),
                'operational_gaps_count': len(analysis.get('operational_gaps', [])),
                'recommended_pitch': analysis.get('recommended_pitch', ''),
                'rank': 0  # Will be set after sorting
            }
            scored_leads.append(lead)
        
        # Sort by lead score
        scored_leads.sort(key=lambda x: x['lead_score'], reverse=True)
        
        # Add rank
        for i, lead in enumerate(scored_leads, 1):
            lead['rank'] = i
        
        return scored_leads

    def _generate_basic_analysis(self, facility_data: Dict) -> Dict:
        """Generate basic analysis without LLM (fallback)"""
        
        lead_score = 50
        if facility_data.get('phone'):
            lead_score += 10
        if facility_data.get('address'):
            lead_score += 10
        if facility_data.get('services'):
            lead_score += 15
        quality = facility_data.get('website_quality', {}).get('percentage', 0)
        lead_score += int(quality / 10)
        lead_score = min(lead_score, 100)
        
        return {
            'facility_name': facility_data.get('facility_name', 'Unknown'),
            'url': facility_data.get('url'),
            'analyzed_at': datetime.now().isoformat(),
            'analysis': {
                'revenue_opportunities': ['Improved online presence', 'Better contact methods'],
                'operational_gaps': ['Limited online booking'],
                'lead_score': lead_score,
                'urgency': 'medium',
            },
            'lead_score': lead_score,
            'urgency': 'medium',
            'revenue_opportunities': ['Improved online presence', 'Better contact methods'],
            'operational_gaps': ['Limited online booking'],
            'recommended_pitch': 'We help healthcare facilities improve patient engagement.',
            'note': 'Basic analysis (AI not available)'
        }


# Example usage
if __name__ == "__main__":
    analyzer = HealthcareAIAnalyzer()
    
    # Example facility data
    example_facility = {
        'facility_name': 'Community Health Clinic',
        'url': 'https://example-clinic.com',
        'phone': ['(555) 123-4567'],
        'address': '123 Main St, Springfield, IL',
        'services': ['Primary Care', 'Urgent Care'],
        'specialties': [],
        'insurance': {
            'accepts_insurance': True,
            'accepts_medicare': True,
            'accepts_medicaid': False
        },
        'website_quality': {'percentage': 45},
        'contact_methods': {
            'phone': True,
            'email': False,
            'contact_form': False,
            'online_booking': False
        }
    }
    
    analysis = analyzer.analyze_facility(example_facility)
    print(json.dumps(analysis, indent=2))

