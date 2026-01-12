# ScrapeX Backend Integration Guide

## Overview

This backend provides three core services for your healthcare facility scraping application:

1. **Healthcare Facility Scraper** - Extracts data from healthcare websites
2. **AI Analysis Engine** - Analyzes facilities for revenue opportunities
3. **Autonomous Call Manager** - Triggers AI-powered calls to facilities

## Quick Start

### 1. Install Dependencies

```bash
cd /home/ubuntu/scrapex-backend
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

Required API keys:
- **OpenAI API Key**: For AI analysis and call script generation
- **Twilio Credentials**: For autonomous calling (optional for testing)

### 3. Run the Backend

```bash
python main.py
```

The API will be available at `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

## API Endpoints

### Health Check
```
GET /health
```

Returns service status.

### Scrape Single Facility
```
POST /api/v1/scrape
Content-Type: application/json

{
  "url": "https://example-clinic.com",
  "facility_name": "Example Clinic"
}
```

Returns: `{ "job_id": "job_000001", "status": "processing" }`

### Bulk Scrape Multiple Facilities
```
POST /api/v1/bulk-scrape
Content-Type: application/json

{
  "urls": [
    "https://clinic1.com",
    "https://clinic2.com",
    "https://clinic3.com"
  ]
}
```

Returns: `{ "job_id": "job_000002", "status": "processing" }`

### Analyze Facility Data
```
POST /api/v1/analyze
Content-Type: application/json

{
  "facility_data": {
    "facility_name": "Community Health Clinic",
    "url": "https://clinic.com",
    "phone": ["(555) 123-4567"],
    "address": "123 Main St, Springfield, IL",
    "services": ["Primary Care", "Urgent Care"],
    "specialties": [],
    "insurance": {
      "accepts_insurance": true,
      "accepts_medicare": true,
      "accepts_medicaid": false
    },
    "website_quality": {"percentage": 45},
    "contact_methods": {
      "phone": true,
      "email": false,
      "contact_form": false,
      "online_booking": false
    }
  }
}
```

Returns: `{ "job_id": "job_000003", "status": "processing" }`

### Trigger Autonomous Call
```
POST /api/v1/call
Content-Type: application/json

{
  "facility_name": "Community Health Clinic",
  "phone_number": "(555) 123-4567",
  "analysis_data": {
    "lead_score": 85,
    "revenue_opportunities": ["Staffing", "Equipment"],
    "urgency": "high"
  }
}
```

Returns:
```json
{
  "success": true,
  "call_id": "call_abc123def456",
  "status": "initiated",
  "facility_name": "Community Health Clinic",
  "phone_number": "(555) 123-4567"
}
```

### Get Job Status
```
GET /api/v1/jobs/{job_id}
```

Returns job status and results.

### List All Jobs
```
GET /api/v1/jobs?limit=50
```

Returns list of recent jobs.

### Get Call History
```
GET /api/v1/calls
GET /api/v1/calls?facility_name=Community%20Health%20Clinic
```

Returns call history and statistics.

### Get Call Statistics
```
GET /api/v1/calls/statistics
```

Returns aggregated call metrics.

## Integration with ScrapeX Frontend

### Step 1: Update Dashboard to Call Backend

In your ScrapeX frontend, update the "Analyze a Business" form to call the backend:

```javascript
// In your dashboard component
const handleAnalyze = async (url) => {
  try {
    // Step 1: Scrape the facility
    const scrapeResponse = await fetch('http://localhost:8000/api/v1/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    const { job_id } = await scrapeResponse.json();
    
    // Step 2: Poll for results
    let result = null;
    while (!result) {
      const jobResponse = await fetch(`http://localhost:8000/api/v1/jobs/${job_id}`);
      const job = await jobResponse.json();
      
      if (job.status === 'completed') {
        result = job.result;
        break;
      }
      
      // Wait 2 seconds before polling again
      await new Promise(r => setTimeout(r, 2000));
    }
    
    // Step 3: Analyze the scraped data
    const analysisResponse = await fetch('http://localhost:8000/api/v1/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facility_data: result })
    });
    
    const { job_id: analysisJobId } = await analysisResponse.json();
    
    // Step 4: Poll for analysis results
    let analysis = null;
    while (!analysis) {
      const jobResponse = await fetch(`http://localhost:8000/api/v1/jobs/${analysisJobId}`);
      const job = await jobResponse.json();
      
      if (job.status === 'completed') {
        analysis = job.result;
        break;
      }
      
      await new Promise(r => setTimeout(r, 2000));
    }
    
    // Step 5: Display results in your UI
    displayAnalysisResults(analysis);
    
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### Step 2: Add Call Triggering

In your Call Attempts section:

```javascript
const handleTriggerCall = async (facility) => {
  try {
    const response = await fetch('http://localhost:8000/api/v1/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        facility_name: facility.name,
        phone_number: facility.phone,
        analysis_data: facility.analysis
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showNotification(`Call initiated: ${result.call_id}`);
      // Refresh call history
      loadCallHistory();
    } else {
      showError(`Call failed: ${result.error}`);
    }
  } catch (error) {
    console.error('Error triggering call:', error);
  }
};
```

### Step 3: Display Call History

```javascript
const loadCallHistory = async () => {
  try {
    const response = await fetch('http://localhost:8000/api/v1/calls');
    const data = await response.json();
    
    // Update your Call Attempts UI with data.calls
    updateCallHistoryTable(data.calls);
    updateCallStatistics(data.statistics);
    
  } catch (error) {
    console.error('Error loading call history:', error);
  }
};
```

## Module Documentation

### HealthcareFacilityScraper

Extracts data from healthcare facility websites.

**Key Methods:**
- `scrape_facility_website(url)` - Scrape a single facility
- `scrape_multiple_facilities(urls)` - Scrape multiple facilities

**Extracted Data:**
- Facility name
- Phone numbers
- Address
- Business hours
- Services offered
- Medical specialties
- Staff information
- Insurance acceptance
- Website quality assessment
- Contact methods

### HealthcareAIAnalyzer

Analyzes scraped data using OpenAI API.

**Key Methods:**
- `analyze_facility(facility_data)` - Analyze a facility for opportunities
- `analyze_multiple_facilities(facilities_data)` - Analyze multiple facilities
- `generate_call_script(facility_analysis)` - Generate personalized call script
- `score_leads(analyses)` - Score and rank leads

**Analysis Output:**
- Revenue opportunities
- Operational gaps
- Competitive positioning
- Lead score (0-100)
- Recommended sales pitch
- Urgency level
- Next steps

### AutonomousCallManager

Manages autonomous calls to healthcare facilities.

**Key Methods:**
- `trigger_call(facility_name, phone_number, analysis, call_script)` - Trigger a call
- `is_compliant_to_call(phone_number)` - Check TCPA compliance
- `get_call_history(facility_name)` - Get call history
- `get_call_statistics()` - Get call metrics

**Features:**
- TCPA compliance checking
- Do Not Call list support
- Business hours enforcement
- Call recording (with Twilio)
- Call transcript generation
- Call outcome tracking

## Deployment

### Option 1: Local Development

```bash
python main.py
```

### Option 2: Production with Gunicorn

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 main:app
```

### Option 3: Docker

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:

```bash
docker build -t scrapex-backend .
docker run -p 8000:8000 -e OPENAI_API_KEY=your_key scrapex-backend
```

### Option 4: Deploy to Cloud

**AWS Lambda + API Gateway:**
- Package with `serverless` framework
- Use AWS RDS for database
- Use AWS SQS for job queue

**Google Cloud Run:**
- Deploy Docker container
- Use Cloud Firestore for database
- Use Cloud Tasks for job queue

**Heroku:**
```bash
heroku create scrapex-backend
git push heroku main
```

## HIPAA Compliance Considerations

For healthcare data handling:

1. **Data Encryption**: Enable HTTPS/TLS for all API calls
2. **Access Control**: Implement authentication and authorization
3. **Audit Logging**: Log all data access and modifications
4. **Data Retention**: Implement automatic data deletion policies
5. **Backup & Recovery**: Regular backups with encryption
6. **Incident Response**: Have a breach notification plan

## Testing

### Test Scraper

```python
from healthcare_scraper import HealthcareFacilityScraper

scraper = HealthcareFacilityScraper()
result = scraper.scrape_facility_website("https://www.mayoclinic.org")
print(result)
```

### Test Analyzer

```python
from ai_analysis_engine import HealthcareAIAnalyzer

analyzer = HealthcareAIAnalyzer()
analysis = analyzer.analyze_facility(facility_data)
print(analysis)
```

### Test Call Manager

```python
from autonomous_caller import AutonomousCallManager

caller = AutonomousCallManager()
result = caller.trigger_call(
    facility_name="Test Clinic",
    phone_number="(555) 123-4567",
    analysis={},
    call_script="Test script"
)
print(result)
```

## Troubleshooting

### Issue: OpenAI API errors

**Solution**: Verify API key is set in `.env` and has sufficient credits.

### Issue: Twilio calls not working

**Solution**: 
1. Verify Twilio credentials in `.env`
2. Check phone number format
3. Ensure account has credits
4. Check call logs in Twilio dashboard

### Issue: Scraping fails for specific websites

**Solution**:
1. Check if website requires authentication
2. Verify website doesn't block scrapers
3. Check if website structure changed
4. Try with different User-Agent

### Issue: Analysis takes too long

**Solution**:
1. Check OpenAI API rate limits
2. Use smaller batch sizes
3. Implement caching for repeated analyses
4. Consider using faster model (gpt-4.1-nano)

## Next Steps

1. **Database Integration**: Replace in-memory job storage with database
2. **Authentication**: Add API key authentication
3. **Rate Limiting**: Implement rate limiting per user
4. **Webhooks**: Add webhook support for job completion notifications
5. **Advanced Analytics**: Add detailed reporting and dashboards
6. **CRM Integration**: Connect to Salesforce, HubSpot, etc.
7. **Scheduled Jobs**: Implement recurring scraping schedules
8. **Lead Prioritization**: Advanced lead scoring algorithms

## Support

For issues or questions:
1. Check the API documentation at `/docs`
2. Review logs for error messages
3. Test endpoints using provided curl examples
4. Check GitHub issues for similar problems

## License

This backend is part of the ScrapeX application.
