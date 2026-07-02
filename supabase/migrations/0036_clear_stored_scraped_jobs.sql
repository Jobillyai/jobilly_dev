-- Reset all stored job listings and scrape cache (fresh start).

delete from public.scraped_jobs;
delete from public.job_role_scrapes;
