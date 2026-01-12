"""
Healthcare Facility Scraper
Extracts business data from healthcare facility websites and directories
"""

import requests
from bs4 import BeautifulSoup
import json
import re
from typing import Dict, List, Optional
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HealthcareFacilityScraper:
    """Scrapes healthcare facility data from websites"""

    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        self.timeout = 10

    def scrape_facility_website(self, url: str) -> Dict:
        """
        Scrape a healthcare facility website for key information
        
        Args:
            url: Website URL to scrape
            
        Returns:
            Dictionary with extracted facility data
        """
        try:
            response = requests.get(url, headers=self.headers, timeout=self.timeout)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')
            
            facility_data = {
                'url': url,
                'scraped_at': datetime.now().isoformat(),
                'facility_name': self._extract_facility_name(soup),
                'phone': self._extract_phone(soup),
                'address': self._extract_address(soup),
                'hours': self._extract_hours(soup),
                'services': self._extract_services(soup),
                'specialties': self._extract_specialties(soup),
                'staff_info': self._extract_staff_info(soup),
                'insurance': self._extract_insurance_info(soup),
                'website_quality': self._assess_website_quality(soup),
                'contact_methods': self._extract_contact_methods(soup),
            }
            
            logger.info(f"Successfully scraped {url}")
            return facility_data
            
        except requests.RequestException as e:
            logger.error(f"Failed to scrape {url}: {str(e)}")
            return {
                'url': url,
                'error': str(e),
                'scraped_at': datetime.now().isoformat()
            }

    def _extract_facility_name(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract facility name from various HTML elements"""
        # Try common patterns
        patterns = [
            soup.find('h1'),
            soup.find('title'),
            soup.find('meta', {'property': 'og:title'}),
            soup.find('meta', {'name': 'title'}),
        ]
        
        for element in patterns:
            if element:
                text = element.get('content') if element.name == 'meta' else element.get_text()
                if text:
                    return text.strip()[:200]
        return None

    def _extract_phone(self, soup: BeautifulSoup) -> List[str]:
        """Extract phone numbers from the page"""
        phones = []
        phone_pattern = r'\+?1?\s*\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})'
        
        text = soup.get_text()
        matches = re.findall(phone_pattern, text)
        
        for match in matches:
            phone = f"({match[0]}) {match[1]}-{match[2]}"
            if phone not in phones:
                phones.append(phone)
        
        return phones[:5]  # Return top 5 unique numbers

    def _extract_address(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract physical address"""
        # Look for address tags and structured data
        address_patterns = [
            soup.find('address'),
            soup.find(class_=re.compile('address', re.I)),
            soup.find(class_=re.compile('location', re.I)),
        ]
        
        for element in address_patterns:
            if element:
                return element.get_text().strip()[:300]
        
        return None

    def _extract_hours(self, soup: BeautifulSoup) -> Optional[Dict]:
        """Extract business hours"""
        hours_data = {}
        
        # Look for common hours patterns
        hours_elements = soup.find_all(class_=re.compile('hours|schedule|operating', re.I))
        
        if hours_elements:
            for element in hours_elements:
                text = element.get_text()
                if text:
                    hours_data['raw'] = text.strip()[:500]
                    break
        
        return hours_data if hours_data else None

    def _extract_services(self, soup: BeautifulSoup) -> List[str]:
        """Extract healthcare services offered"""
        services = []
        
        # Common healthcare service keywords
        service_keywords = [
            'emergency', 'urgent care', 'surgery', 'cardiology', 'pediatrics',
            'orthopedics', 'neurology', 'oncology', 'radiology', 'laboratory',
            'physical therapy', 'mental health', 'psychiatry', 'dermatology',
            'primary care', 'family medicine', 'internal medicine', 'dental',
            'vision', 'pharmacy', 'rehabilitation', 'hospice', 'home health'
        ]
        
        page_text = soup.get_text().lower()
        
        for keyword in service_keywords:
            if keyword in page_text:
                services.append(keyword.title())
        
        return list(set(services))[:15]  # Return unique services

    def _extract_specialties(self, soup: BeautifulSoup) -> List[str]:
        """Extract medical specialties"""
        specialties = []
        
        specialty_keywords = [
            'cardiologist', 'neurologist', 'orthopedic', 'surgeon', 'pediatrician',
            'dermatologist', 'psychiatrist', 'oncologist', 'radiologist', 'urologist',
            'gastroenterologist', 'rheumatologist', 'endocrinologist', 'nephrologist'
        ]
        
        page_text = soup.get_text().lower()
        
        for specialty in specialty_keywords:
            if specialty in page_text:
                specialties.append(specialty.title())
        
        return list(set(specialties))[:10]

    def _extract_staff_info(self, soup: BeautifulSoup) -> Dict:
        """Extract staff information if available"""
        staff_info = {}
        
        # Look for staff/team sections
        staff_sections = soup.find_all(class_=re.compile('staff|team|provider|doctor|physician', re.I))
        
        if staff_sections:
            staff_info['has_staff_section'] = True
            staff_info['staff_count'] = len(staff_sections)
        
        return staff_info

    def _extract_insurance_info(self, soup: BeautifulSoup) -> Dict:
        """Extract insurance acceptance information"""
        insurance_info = {}
        
        page_text = soup.get_text().lower()
        
        insurance_keywords = {
            'accepts_insurance': 'insurance' in page_text,
            'accepts_medicare': 'medicare' in page_text,
            'accepts_medicaid': 'medicaid' in page_text,
            'accepts_tricare': 'tricare' in page_text,
        }
        
        insurance_info.update(insurance_keywords)
        return insurance_info

    def _extract_contact_methods(self, soup: BeautifulSoup) -> Dict:
        """Extract available contact methods"""
        contact_methods = {
            'phone': len(self._extract_phone(soup)) > 0,
            'email': bool(re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', soup.get_text())),
            'contact_form': bool(soup.find('form', class_=re.compile('contact', re.I))),
            'online_booking': bool(re.search(r'book|appointment|schedule', soup.get_text(), re.I)),
        }
        return contact_methods

    def _assess_website_quality(self, soup: BeautifulSoup) -> Dict:
        """Assess the quality and completeness of the website"""
        quality_score = 0
        max_score = 10
        
        checks = {
            'has_title': bool(soup.find('title')),
            'has_meta_description': bool(soup.find('meta', {'name': 'description'})),
            'has_contact_info': bool(re.search(r'\d{3}[-.]?\d{3}[-.]?\d{4}', soup.get_text())),
            'has_address': bool(soup.find('address')),
            'has_images': len(soup.find_all('img')) > 3,
            'has_services_info': len(soup.find_all(class_=re.compile('service|specialty', re.I))) > 0,
            'is_mobile_responsive': bool(soup.find('meta', {'name': 'viewport'})),
            'has_ssl': True,  # Assuming HTTPS
            'has_social_links': len(soup.find_all('a', href=re.compile(r'facebook|twitter|linkedin|instagram', re.I))) > 0,
            'has_navigation': bool(soup.find('nav')),
        }
        
        quality_score = sum(checks.values())
        
        return {
            'score': quality_score,
            'max_score': max_score,
            'percentage': (quality_score / max_score) * 100,
            'checks': checks
        }

    def scrape_multiple_facilities(self, urls: List[str]) -> List[Dict]:
        """Scrape multiple facility websites"""
        results = []
        for url in urls:
            if not url.startswith(('http://', 'https://')):
                url = 'https://' + url
            result = self.scrape_facility_website(url)
            results.append(result)
        return results


# Example usage
if __name__ == "__main__":
    scraper = HealthcareFacilityScraper()
    
    # Test with example healthcare facilities
    test_urls = [
        "https://www.mayoclinic.org",
        "https://www.clevelandclinic.org",
    ]
    
    results = scraper.scrape_multiple_facilities(test_urls)
    print(json.dumps(results, indent=2))
