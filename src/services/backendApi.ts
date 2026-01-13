// Direct backend API service
const BACKEND_URL = 'https://scrapex-backend.onrender.com/api/v1';

export interface ScrapeJobRequest {
  url: string;
  business_name?: string;
  business_type?: string;
}

export interface ScrapeJobResponse {
  job_id: string;
  status: string;
  message: string;
}

export interface JobStatusResponse {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  created_at: string;
  completed_at?: string;
}

export class BackendApiService {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  async createScrapeJob(request: ScrapeJobRequest): Promise<ScrapeJobResponse> {
    const response = await fetch(`${this.baseUrl}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create scrape job: ${error}`);
    }

    return response.json();
  }

  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get job status: ${error}`);
    }

    return response.json();
  }

  async waitForJobCompletion(jobId: string, maxAttempts: number = 30): Promise<JobStatusResponse> {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getJobStatus(jobId);

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      // Wait 2 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Job timeout: exceeded maximum wait time');
  }

  async scrapeAndWait(request: ScrapeJobRequest): Promise<any> {
    // Create job
    const job = await this.createScrapeJob(request);

    // Wait for completion
    const result = await this.waitForJobCompletion(job.job_id);

    if (result.status === 'failed') {
      throw new Error(result.error || 'Scraping failed');
    }

    return result.result;
  }
}

export const backendApi = new BackendApiService();
