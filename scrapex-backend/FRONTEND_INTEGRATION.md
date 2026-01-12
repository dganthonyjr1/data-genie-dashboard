# ScrapeX Frontend Integration Guide

## Public API Endpoint

Your backend is now live and accessible at:

```
https://8000-ik9i2dchjtkl1r0wo65x9-9b119bb8.us2.manus.computer
```

API Documentation: `https://8000-ik9i2dchjtkl1r0wo65x9-9b119bb8.us2.manus.computer/docs`

---

## Integration Overview

Your ScrapeX frontend needs to call the backend API to:

1. Scrape healthcare facility websites
2. Analyze the data for opportunities
3. Trigger autonomous calls
4. Display results and call history

---

## Step-by-Step Integration

### Step 1: Update Your Dashboard Component

Replace your "Analyze a Business" button handler with this code:

```javascript
const BASE_URL = 'https://8000-ik9i2dchjtkl1r0wo65x9-9b119bb8.us2.manus.computer';

async function scrapeFacility(url) {
  try {
    // Step 1: Start scraping
    console.log('Starting scrape...');
    const scrapeRes = await fetch(`${BASE_URL}/api/v1/scrape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    const { job_id } = await scrapeRes.json();
    console.log('Scrape job started:', job_id);
    
    // Step 2: Poll for scrape results
    let scrapeResult = null;
    let attempts = 0;
    while (!scrapeResult && attempts < 30) {
      await new Promise(r => setTimeout(r, 1000));
      const jobRes = await fetch(`${BASE_URL}/api/v1/jobs/${job_id}`);
      const job = await jobRes.json();
      
      if (job.status === 'completed') {
        scrapeResult = job.result;
        console.log('Scrape completed');
        break;
      }
      attempts++;
    }
    
    if (!scrapeResult) {
      throw new Error('Scraping timed out');
    }
    
    // Step 3: Start analysis
    console.log('Starting analysis...');
    const analysisRes = await fetch(`${BASE_URL}/api/v1/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facility_data: scrapeResult })
    });
    
    const { job_id: analysisJobId } = await analysisRes.json();
    
    // Step 4: Poll for analysis results
    let analysis = null;
    attempts = 0;
    while (!analysis && attempts < 30) {
      await new Promise(r => setTimeout(r, 1000));
      const jobRes = await fetch(`${BASE_URL}/api/v1/jobs/${analysisJobId}`);
      const job = await jobRes.json();
      
      if (job.status === 'completed') {
        analysis = job.result;
        console.log('Analysis completed');
        break;
      }
      attempts++;
    }
    
    if (!analysis) {
      throw new Error('Analysis timed out');
    }
    
    return { scrapeResult, analysis };
    
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

### Step 2: Update Your Leads Page

Add this function to display scraped leads:

```javascript
async function displayFacilityAnalysis(scrapeResult, analysis) {
  // Extract key data
  const facility = {
    name: scrapeResult.facility_name,
    url: scrapeResult.url,
    phone: scrapeResult.phone?.[0] || 'Not found',
    address: scrapeResult.address || 'Not found',
    services: scrapeResult.services || [],
    specialties: scrapeResult.specialties || [],
    websiteQuality: scrapeResult.website_quality?.percentage || 0,
  };
  
  const opportunities = analysis.revenue_opportunities || [];
  const gaps = analysis.operational_gaps || [];
  const leadScore = analysis.lead_score || 0;
  
  // Display in your UI
  document.getElementById('facility-name').textContent = facility.name;
  document.getElementById('facility-phone').textContent = facility.phone;
  document.getElementById('facility-address').textContent = facility.address;
  document.getElementById('lead-score').textContent = leadScore;
  document.getElementById('website-quality').textContent = `${facility.websiteQuality}%`;
  
  // Display opportunities
  const oppList = document.getElementById('opportunities-list');
  oppList.innerHTML = opportunities.map(opp => 
    `<li>${opp}</li>`
  ).join('');
  
  // Display gaps
  const gapsList = document.getElementById('gaps-list');
  gapsList.innerHTML = gaps.map(gap => 
    `<li>${gap}</li>`
  ).join('');
  
  // Store for later use
  window.currentFacility = {
    ...facility,
    analysis: analysis
  };
}
```

### Step 3: Update Your Call Attempts Page

Add this function to trigger calls:

```javascript
async function triggerCall(facility) {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/call`, {
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
      console.log('Call initiated:', result.call_id);
      showNotification(`Call initiated: ${result.call_id}`);
      
      // Refresh call history
      await loadCallHistory();
    } else {
      showError(`Call failed: ${result.error}`);
    }
    
    return result;
    
  } catch (error) {
    console.error('Error triggering call:', error);
    showError('Failed to trigger call');
  }
}
```

### Step 4: Display Call History

Add this function to your Call Attempts page:

```javascript
async function loadCallHistory() {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/calls`);
    const data = await response.json();
    
    // Display call history table
    const table = document.getElementById('calls-table');
    table.innerHTML = data.calls.map(call => `
      <tr>
        <td>${call.facility_name}</td>
        <td>${call.phone_number}</td>
        <td>${call.status}</td>
        <td>${call.outcome || 'N/A'}</td>
        <td>${call.duration || 0}s</td>
        <td>${new Date(call.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');
    
    // Display statistics
    const stats = data.statistics;
    document.getElementById('total-calls').textContent = stats.total_calls;
    document.getElementById('success-rate').textContent = `${stats.success_rate.toFixed(0)}%`;
    document.getElementById('avg-duration').textContent = `${stats.average_duration.toFixed(0)}s`;
    
  } catch (error) {
    console.error('Error loading call history:', error);
  }
}

// Load on page load
loadCallHistory();
```

---

## API Endpoints Reference

### Scrape a Facility

```
POST /api/v1/scrape
Content-Type: application/json

{
  "url": "https://www.example-clinic.com",
  "facility_name": "Example Clinic"
}

Response:
{
  "job_id": "job_000001",
  "status": "processing",
  "message": "Scraping job started"
}
```

### Analyze Facility Data

```
POST /api/v1/analyze
Content-Type: application/json

{
  "facility_data": {
    "facility_name": "Community Health Clinic",
    "url": "https://clinic.com",
    "phone": ["(555) 123-4567"],
    "address": "123 Main St",
    "services": ["Primary Care", "Urgent Care"],
    "specialties": [],
    "website_quality": {"percentage": 60}
  }
}

Response:
{
  "job_id": "job_000002",
  "status": "processing",
  "message": "Analysis job started"
}
```

### Get Job Status

```
GET /api/v1/jobs/{job_id}

Response:
{
  "id": "job_000001",
  "type": "scrape",
  "status": "completed",
  "created_at": "2026-01-11T16:53:02.174722",
  "url": "https://www.mayoclinic.org",
  "facility_name": "Mayo Clinic",
  "result": {
    "facility_name": "Transforming your care",
    "phone": [],
    "address": null,
    "services": ["Vision"],
    "specialties": [],
    "website_quality": {
      "score": 6,
      "max_score": 10,
      "percentage": 60.0
    }
  }
}
```

### Trigger a Call

```
POST /api/v1/call
Content-Type: application/json

{
  "facility_name": "Community Health Clinic",
  "phone_number": "(555) 123-4567",
  "analysis_data": {
    "lead_score": 85,
    "revenue_opportunities": ["Staffing", "Equipment"]
  }
}

Response:
{
  "success": true,
  "call_id": "call_e6f76104eb6c",
  "status": "initiated",
  "facility_name": "Community Health Clinic",
  "phone_number": "(555) 123-4567",
  "outcome": "no_answer",
  "duration": 0,
  "note": "Simulated call (Twilio not configured)"
}
```

### Get Call History

```
GET /api/v1/calls
GET /api/v1/calls?facility_name=Community%20Health%20Clinic

Response:
{
  "total_calls": 5,
  "statistics": {
    "total_calls": 5,
    "completed_calls": 3,
    "failed_calls": 0,
    "success_rate": 60.0,
    "average_duration": 120,
    "by_status": {
      "completed": 3,
      "no_answer": 2
    }
  },
  "calls": [
    {
      "id": "call_e6f76104eb6c",
      "facility_name": "Community Health Clinic",
      "phone_number": "(555) 123-4567",
      "status": "completed",
      "outcome": "interested",
      "duration": 180,
      "created_at": "2026-01-11T17:00:00.000000"
    }
  ]
}
```

### Get Call Statistics

```
GET /api/v1/calls/statistics

Response:
{
  "total_calls": 5,
  "completed_calls": 3,
  "failed_calls": 0,
  "success_rate": 60.0,
  "average_duration": 120,
  "by_status": {
    "completed": 3,
    "no_answer": 2
  }
}
```

---

## Error Handling

All API endpoints may return errors. Handle them like this:

```javascript
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'API error');
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

---

## Complete Example: Full Workflow

```javascript
async function fullWorkflow(url) {
  try {
    // 1. Scrape and analyze
    console.log('Starting full workflow...');
    const { scrapeResult, analysis } = await scrapeFacility(url);
    
    // 2. Display results
    await displayFacilityAnalysis(scrapeResult, analysis);
    
    // 3. User can now trigger a call
    const facility = window.currentFacility;
    
    // 4. Trigger call
    const callResult = await triggerCall(facility);
    
    // 5. Refresh call history
    await loadCallHistory();
    
    console.log('Workflow complete');
    
  } catch (error) {
    console.error('Workflow error:', error);
    showError('Workflow failed: ' + error.message);
  }
}

// Usage
document.getElementById('analyze-button').addEventListener('click', () => {
  const url = document.getElementById('url-input').value;
  fullWorkflow(url);
});
```

---

## Testing

Test the API directly using curl:

```bash
# Test health
curl https://8000-ik9i2dchjtkl1r0wo65x9-9b119bb8.us2.manus.computer/health

# Test scrape
curl -X POST https://8000-ik9i2dchjtkl1r0wo65x9-9b119bb8.us2.manus.computer/api/v1/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.mayoclinic.org"}'

# Get job status
curl https://8000-ik9i2dchjtkl1r0wo65x9-9b119bb8.us2.manus.computer/api/v1/jobs/job_000001

# Trigger call
curl -X POST https://8000-ik9i2dchjtkl1r0wo65x9-9b119bb8.us2.manus.computer/api/v1/call \
  -H "Content-Type: application/json" \
  -d '{
    "facility_name": "Test Clinic",
    "phone_number": "(555) 123-4567",
    "analysis_data": {"lead_score": 85}
  }'
```

---

## Test Data Available

I've generated test data from real healthcare facilities. You can use this for testing:

**File:** `test_data.json` - Raw scraped data
**File:** `test_analysis.json` - Analyzed data with lead scores

Top performing facilities:
1. Cleveland Clinic - Lead Score: 83
2. Mayo Clinic - Lead Score: 71
3. UCSF - Lead Score: 71

---

## Next Steps

1. Copy the JavaScript code above into your ScrapeX frontend
2. Update the `BASE_URL` variable to point to the public API
3. Test the full workflow with the test data
4. Deploy your updated frontend
5. Start scraping real healthcare facilities

---

## Support

For API documentation, visit: `https://8000-ik9i2dchjtkl1r0wo65x9-9b119bb8.us2.manus.computer/docs`

For issues or questions, check the server logs or contact support.
