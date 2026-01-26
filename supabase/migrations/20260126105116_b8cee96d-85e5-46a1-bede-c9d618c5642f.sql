-- Restrict scrape_jobs to admin-only access
DROP POLICY IF EXISTS "Public read access" ON public.scrape_jobs;

CREATE POLICY "Admins can read scrape_jobs"
ON public.scrape_jobs FOR SELECT
USING (public.is_admin());

-- Restrict scrape_job_events to admin-only access
DROP POLICY IF EXISTS "Public read access" ON public.scrape_job_events;

CREATE POLICY "Admins can read scrape_job_events"
ON public.scrape_job_events FOR SELECT
USING (public.is_admin());