# Lovable Cloud Integration Guide - Step by Step

This guide will walk you through integrating the ScrapeX backend into your Lovable Cloud project.

## Overview

You will:
1. Create database tables
2. Add three Edge Functions (scrape, analyze, call)
3. Update your frontend to call these functions
4. Test the full workflow

**Estimated Time: 30-45 minutes**

---

## Step 1: Create Database Tables

### What This Does
Creates the tables needed to store scraping jobs, call records, and analysis results.

### Instructions

1. Go to your Lovable Cloud project: https://lovable.dev/projects/8b5ad5ea-d6c0-4487-8f81-c25b236dc2ee?view=cloud

2. Click on **Database** in the left sidebar

3. Click **SQL Editor** or **New Query**

4. Copy and paste the entire contents of `lovable_database_schema.sql`

5. Click **Run** or **Execute**

6. You should see success messages for each table creation

### What Was Created

- `call_records` - Stores all call attempts and outcomes
- `facility_analysis` - Stores detailed facility analysis
- `scraping_jobs` - Already exists, we added columns
- `call_statistics` - View for call metrics
- `lead_quality` - View for lead performance

---

## Step 2: Create the Scraping Edge Function

### What This Does
Creates an API endpoint that scrapes healthcare facility websites and extracts data.

### Instructions

1. In Lovable Cloud, click **Edge Functions** in the left sidebar

2. Click **Create New Function** or **+**

3. Name it: `scrape-facility`

4. Copy the entire contents of `lovable_edge_functions_scrape.ts` into the editor

5. Click **Deploy** or **Save**

6. You should see a success message

### What This Function Does

- Accepts a URL to scrape
- Extracts facility name, phone, address, services, specialties
- Calculates website quality score
- Stores results in the database
- Returns job ID for status tracking

---

## Step 3: Create the Analysis Edge Function

### What This Does
Creates an API endpoint that analyzes scraped facility data to identify opportunities and generate lead scores.

### Instructions

1. Click **Edge Functions** → **Create New Function**

2. Name it: `analyze-facility`

3. Copy the entire contents of `lovable_edge_functions_analyze.ts` into the editor

4. Click **Deploy** or **Save**

### What This Function Does

- Analyzes facility data
- Generates lead score (0-100)
- Identifies revenue opportunities
- Identifies operational gaps
- Generates personalized sales pitch
- Determines urgency level

---

## Step 4: Create the Call Management Edge Function

### What This Does
Creates an API endpoint that triggers autonomous calls and tracks outcomes.

### Instructions

1. Click **Edge Functions** → **Create New Function**

2. Name it: `trigger-call`

3. Copy the entire contents of `lovable_edge_functions_call.ts` into the editor

4. Click **Deploy** or **Save**

### What This Function Does

- Validates phone number format
- Checks TCPA compliance (business hours, Do Not Call list)
- Simulates call outcome
- Stores call record in database
- Returns call ID and status

---

## Step 5: Update Your Frontend

### Add Scraping Function

In your React/Vue component, add this function:

```javascript
async function scrapeFacility(url) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-facility`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ url })
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Scraping failed');
    }

    // Poll for results
    let result = null;
    let attempts = 0;
    
    while (!result && attempts < 30) {
      await new Promise(r => setTimeout(r, 1000));
      
      const jobResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/scraping_jobs?id=eq.${data.job_id}`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          }
        }
      );
      
      const jobs = await jobResponse.json();
      
      if (jobs.length > 0 && jobs[0].status === 'completed') {
        result = jobs[0].result;
        break;
      }
      
      attempts++;
    }

    return result;
  } catch (error) {
    console.error('Scraping error:', error);
    throw error;
  }
}
```

### Add Analysis Function

```javascript
async function analyzeFacility(facilityData) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-facility`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ facility_data: facilityData })
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Analysis failed');
    }

    return data.result;
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}
```

### Add Call Trigger Function

```javascript
async function triggerCall(facilityName, phoneNumber, analysisData) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trigger-call`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          facility_name: facilityName,
          phone_number: phoneNumber,
          analysis_data: analysisData
        })
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Call trigger failed');
    }

    return data;
  } catch (error) {
    console.error('Call trigger error:', error);
    throw error;
  }
}
```

### Add Call History Function

```javascript
async function getCallHistory() {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/call_records?order=created_at.desc&limit=100`,
      {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        }
      }
    );

    return await response.json();
  } catch (error) {
    console.error('Error fetching call history:', error);
    throw error;
  }
}
```

---

## Step 6: Test the Full Workflow

### Test Scraping

1. In your frontend, enter a healthcare facility URL:
   ```
   https://www.mayoclinic.org
   ```

2. Click "Analyze" or your scrape button

3. Wait for results (should take 5-10 seconds)

4. You should see:
   - Facility name
   - Phone numbers
   - Services
   - Website quality score

### Test Analysis

1. After scraping completes, the analysis should run automatically

2. You should see:
   - Lead score (0-100)
   - Revenue opportunities
   - Operational gaps
   - Recommended pitch

### Test Call Triggering

1. Click "Call" button on the analyzed facility

2. You should see:
   - Call ID
   - Status (initiated, completed, no_answer, etc.)
   - Outcome

3. Go to your database and check `call_records` table - you should see the call logged

### Test Call History

1. Click "Call History" or similar button

2. You should see a list of all calls made

3. Check the statistics (total calls, success rate, etc.)

---

## Step 7: Verify Everything Works

### Check Database

1. Go to **Database** in Lovable Cloud

2. Click **call_records** table

3. You should see call records with:
   - call_id
   - facility_name
   - phone_number
   - status
   - outcome
   - created_at

### Check Edge Functions

1. Go to **Edge Functions** in Lovable Cloud

2. You should see three functions:
   - scrape-facility
   - analyze-facility
   - trigger-call

3. Each should show "Deployed" status

### Check Logs

1. Click on each Edge Function

2. Check the logs for any errors

3. If there are errors, they'll show what went wrong

---

## Troubleshooting

### Issue: "Function not found" error

**Solution:**
- Make sure all three Edge Functions are deployed
- Check function names match exactly: `scrape-facility`, `analyze-facility`, `trigger-call`
- Refresh the page and try again

### Issue: "Authorization failed" error

**Solution:**
- Check that `VITE_SUPABASE_PUBLISHABLE_KEY` is set correctly
- Make sure you're using the correct Supabase URL
- Verify the API key has permission to call Edge Functions

### Issue: Database tables don't exist

**Solution:**
- Go back to Step 1
- Run the SQL schema again
- Check for error messages in the SQL output
- Make sure you're in the correct database

### Issue: Scraping returns empty results

**Solution:**
- The website might block scrapers
- Try with a different URL
- Check that the URL is accessible (not behind login)
- Check Edge Function logs for errors

### Issue: Calls not being recorded

**Solution:**
- Make sure `call_records` table exists (Step 1)
- Check that the call trigger function is deployed
- Check the Edge Function logs for errors
- Verify phone number format is correct

---

## Next Steps

Once everything is working:

1. **Add Real Twilio Integration** - Replace simulated calls with real calls
2. **Add OpenAI Integration** - Use AI for better analysis
3. **Customize for Your Vendor** - Modify scraping and analysis for specific vendor needs
4. **Set Up Monitoring** - Add error tracking and alerting
5. **Deploy to Production** - Move from testing to live

---

## Support

If you get stuck:

1. Check the troubleshooting section above
2. Check Edge Function logs for error messages
3. Verify all three functions are deployed
4. Make sure database tables were created successfully
5. Test with the provided example URLs

---

## Files Reference

- `lovable_edge_functions_scrape.ts` - Scraping function
- `lovable_edge_functions_analyze.ts` - Analysis function
- `lovable_edge_functions_call.ts` - Call management function
- `lovable_database_schema.sql` - Database tables and views

All files are ready to copy-paste into Lovable Cloud.
