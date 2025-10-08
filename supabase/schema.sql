-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin profiles table
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  company_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  brand_color TEXT DEFAULT '#8b5cf6',
  is_active BOOLEAN DEFAULT true,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  caption TEXT NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'published')),
  post_type TEXT NOT NULL CHECK (post_type IN ('photo', 'carousel', 'reel', 'story')),
  platforms TEXT[] NOT NULL,
  media_urls TEXT[] NOT NULL,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Edit history table
CREATE TABLE IF NOT EXISTS public.edit_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  edited_by UUID REFERENCES public.users(id) NOT NULL,
  changes JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Caption templates table
CREATE TABLE IF NOT EXISTS public.caption_templates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_client_caption FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Hashtag groups table
CREATE TABLE IF NOT EXISTS public.hashtag_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  hashtags TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_client_hashtag FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Special dates table
CREATE TABLE IF NOT EXISTS public.special_dates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  recurrent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insights table
CREATE TABLE IF NOT EXISTS public.insights (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post comments table
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.users(id) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drafts table (for auto-save)
CREATE TABLE IF NOT EXISTS public.drafts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, client_id)
);

-- User Insight Views table
CREATE TABLE IF NOT EXISTS public.user_insight_views (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  last_viewed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS
ALTER TABLE public.user_insight_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own view timestamps" ON public.user_insight_views
  FOR ALL USING (auth.uid() = user_id);

-- Other RLS policies... (truncated for brevity, ensure they are in your file)

-- Database Function and Trigger for Insight Notifications
CREATE OR REPLACE FUNCTION public.handle_new_insight_notification()
RETURNS TRIGGER AS $$
DECLARE
  creator_role TEXT;
  creator_name TEXT;
  client_name TEXT;
  client_user_id UUID;
  admin_record RECORD;
  client_last_viewed TIMESTAMPTZ;
  admin_last_viewed TIMESTAMPTZ;
BEGIN
  -- Get creator info
  SELECT role, full_name INTO creator_role, creator_name FROM public.users WHERE id = NEW.created_by;

  IF creator_role = 'client' THEN
    -- Client created an insight, notify all admins who haven't seen it
    SELECT name INTO client_name FROM public.clients WHERE id = NEW.client_id;
    FOR admin_record IN SELECT id FROM public.users WHERE role = 'admin' LOOP
      SELECT last_viewed_at INTO admin_last_viewed FROM public.user_insight_views WHERE user_id = admin_record.id;
      
      IF admin_last_viewed IS NULL OR admin_last_viewed < NEW.created_at THEN
        INSERT INTO public.notifications (user_id, title, message, link)
        VALUES (admin_record.id, 'Nova Ideia de Cliente', client_name || ' adicionou uma nova ideia.', '/admin/insights');
      END IF;
    END LOOP;

  ELSIF creator_role = 'admin' THEN
    -- Admin created an insight, notify the client if they haven't seen it
    SELECT user_id INTO client_user_id FROM public.clients WHERE id = NEW.client_id;
    IF client_user_id IS NOT NULL THEN
      SELECT last_viewed_at INTO client_last_viewed FROM public.user_insight_views WHERE user_id = client_user_id;

      IF client_last_viewed IS NULL OR client_last_viewed < NEW.created_at THEN
        INSERT INTO public.notifications (user_id, title, message, link)
        VALUES (client_user_id, 'Nova Ideia da Agência', creator_name || ' compartilhou uma nova ideia.', '/client/insights');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_insight_created_send_notification ON public.insights;
CREATE TRIGGER on_insight_created_send_notification
  AFTER INSERT ON public.insights
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_insight_notification();

-- Functions and Triggers

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_profiles_updated_at BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drafts_updated_at BEFORE UPDATE ON public.drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();