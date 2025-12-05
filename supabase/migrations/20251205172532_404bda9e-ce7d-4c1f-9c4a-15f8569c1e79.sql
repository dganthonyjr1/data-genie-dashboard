-- Add new columns for advanced scraping features
ALTER TABLE public.scraping_jobs 
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS template_id TEXT,
ADD COLUMN IF NOT EXISTS auto_paginate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_pages INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS pages_scraped INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS proxy_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS api_key_id UUID,
ADD COLUMN IF NOT EXISTS extraction_config JSONB DEFAULT '{}';

-- Create API keys table for programmatic access
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- API keys policies
CREATE POLICY "Users can view their own API keys" ON public.api_keys
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own API keys" ON public.api_keys
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" ON public.api_keys
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own API keys" ON public.api_keys
FOR DELETE USING (auth.uid() = user_id);

-- Create webhooks table
CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT[] NOT NULL DEFAULT ARRAY['job.completed'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_triggered_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on webhooks
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- Webhooks policies
CREATE POLICY "Users can view their own webhooks" ON public.webhooks
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own webhooks" ON public.webhooks
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own webhooks" ON public.webhooks
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own webhooks" ON public.webhooks
FOR DELETE USING (auth.uid() = user_id);

-- Create scraping templates table
CREATE TABLE IF NOT EXISTS public.scraping_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  scrape_type TEXT NOT NULL,
  ai_instructions TEXT,
  extraction_config JSONB DEFAULT '{}',
  icon TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on templates
ALTER TABLE public.scraping_templates ENABLE ROW LEVEL SECURITY;

-- Templates policies - system templates are public, user templates are private
CREATE POLICY "Anyone can view system templates" ON public.scraping_templates
FOR SELECT USING (is_system = true);

CREATE POLICY "Users can view their own templates" ON public.scraping_templates
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own templates" ON public.scraping_templates
FOR INSERT WITH CHECK (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can update their own templates" ON public.scraping_templates
FOR UPDATE USING (auth.uid() = user_id AND is_system = false);

CREATE POLICY "Users can delete their own templates" ON public.scraping_templates
FOR DELETE USING (auth.uid() = user_id AND is_system = false);

-- Insert system templates for common use cases
INSERT INTO public.scraping_templates (name, description, category, scrape_type, ai_instructions, icon, is_system) VALUES
('Business Directory', 'Extract business listings from directories like Yelp, Yellow Pages', 'directories', 'complete_business_data', 'Extract all business listings including name, address, phone, website, hours, and reviews. Focus on structured business data.', 'building-2', true),
('E-commerce Products', 'Extract product data from e-commerce sites', 'ecommerce', 'custom_ai_extraction', 'Extract product details: name, price, original price, discount, description, SKU, availability, images, ratings, reviews count, category, and specifications.', 'shopping-cart', true),
('Restaurant Menu', 'Extract menu items and prices from restaurant websites', 'food', 'custom_ai_extraction', 'Extract menu items including: item name, description, price, category (appetizers, mains, desserts, drinks), dietary info (vegetarian, vegan, gluten-free), and any modifiers or add-ons.', 'utensils', true),
('Real Estate Listings', 'Extract property listings from real estate sites', 'real_estate', 'custom_ai_extraction', 'Extract property listings: address, price, bedrooms, bathrooms, square footage, lot size, year built, property type, listing status, agent info, and key features.', 'home', true),
('Job Postings', 'Extract job listings from career sites', 'jobs', 'custom_ai_extraction', 'Extract job postings: title, company, location, salary range, job type (full-time, part-time, contract), experience level, skills required, description, and application deadline.', 'briefcase', true),
('Contact Pages', 'Extract contact information from any website', 'contacts', 'complete_business_data', 'Focus on extracting all contact information: emails, phone numbers, addresses, social media links, contact form URLs, and business hours.', 'contact', true),
('News Articles', 'Extract article content from news sites', 'content', 'custom_ai_extraction', 'Extract article: headline, author, publish date, updated date, category, tags, main content, summary, and related articles.', 'newspaper', true),
('Event Listings', 'Extract events from event pages', 'events', 'custom_ai_extraction', 'Extract events: title, date, time, venue name, venue address, ticket price, organizer, description, and registration URL.', 'calendar', true),
('Social Profiles', 'Extract profile data from social media', 'social', 'custom_ai_extraction', 'Extract profile: display name, username/handle, bio, follower count, following count, post count, location, website, and verification status.', 'users', true),
('Email Lists', 'Extract email addresses from any page', 'emails', 'emails', NULL, 'mail', true),
('Phone Numbers', 'Extract phone numbers from any page', 'phones', 'phone_numbers', NULL, 'phone', true),
('All Links', 'Extract all links from a page for crawling', 'links', 'custom_ai_extraction', 'Extract all links on the page: URL, anchor text, whether internal or external, and link context (navigation, content, footer).', 'link', true)
ON CONFLICT DO NOTHING;