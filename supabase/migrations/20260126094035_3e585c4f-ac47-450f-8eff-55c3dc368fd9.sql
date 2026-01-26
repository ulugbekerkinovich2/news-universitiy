-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create profiles table for user info
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS policies for profiles
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- RLS policies for user_roles (only admins can manage)
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
USING (public.is_admin());

-- DROP old public write policies on universities
DROP POLICY IF EXISTS "Public insert access" ON public.universities;
DROP POLICY IF EXISTS "Public update access" ON public.universities;
DROP POLICY IF EXISTS "Public delete access" ON public.universities;

-- DROP old public write policies on news_posts
DROP POLICY IF EXISTS "Public insert access" ON public.news_posts;
DROP POLICY IF EXISTS "Public update access" ON public.news_posts;
DROP POLICY IF EXISTS "Public delete access" ON public.news_posts;

-- DROP old public write policies on media_assets
DROP POLICY IF EXISTS "Public insert access" ON public.media_assets;
DROP POLICY IF EXISTS "Public update access" ON public.media_assets;

-- DROP old public write policies on scrape_jobs
DROP POLICY IF EXISTS "Public insert access" ON public.scrape_jobs;
DROP POLICY IF EXISTS "Public update access" ON public.scrape_jobs;

-- DROP old public write policies on scrape_job_events
DROP POLICY IF EXISTS "Public insert access" ON public.scrape_job_events;

-- Create admin-only write policies for universities
CREATE POLICY "Admins can insert universities"
ON public.universities FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update universities"
ON public.universities FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete universities"
ON public.universities FOR DELETE
USING (public.is_admin());

-- Create admin-only write policies for news_posts
CREATE POLICY "Admins can insert news_posts"
ON public.news_posts FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update news_posts"
ON public.news_posts FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete news_posts"
ON public.news_posts FOR DELETE
USING (public.is_admin());

-- Create admin-only write policies for media_assets
CREATE POLICY "Admins can insert media_assets"
ON public.media_assets FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update media_assets"
ON public.media_assets FOR UPDATE
USING (public.is_admin());

CREATE POLICY "Admins can delete media_assets"
ON public.media_assets FOR DELETE
USING (public.is_admin());

-- Create admin-only write policies for scrape_jobs
CREATE POLICY "Admins can insert scrape_jobs"
ON public.scrape_jobs FOR INSERT
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update scrape_jobs"
ON public.scrape_jobs FOR UPDATE
USING (public.is_admin());

-- Create admin-only write policies for scrape_job_events
CREATE POLICY "Admins can insert scrape_job_events"
ON public.scrape_job_events FOR INSERT
WITH CHECK (public.is_admin());