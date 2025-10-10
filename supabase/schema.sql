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
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_import_timestamp TIMESTAMPTZ
);

-- Posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  caption TEXT NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'published', 'refactor', 'late_approved')),
  post_type TEXT NOT NULL CHECK (post_type IN ('photo', 'carousel', 'reel', 'story')),
  platforms TEXT[] NOT NULL,
  media_urls TEXT[] NOT NULL,
  created_by UUID REFERENCES public.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
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
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
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

-- User Insight Views table
CREATE TABLE IF NOT EXISTS public.user_insight_views (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  last_viewed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
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

-- RLS
ALTER TABLE public.user_insight_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own view timestamps" ON public.user_insight_views;
CREATE POLICY "Users can manage their own view timestamps" ON public.user_insight_views
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);
  
-- (Ensure other RLS policies are present)

-- FUNCTION & TRIGGER FOR INSIGHTS
CREATE OR REPLACE FUNCTION public.handle_new_insight_notification()
RETURNS TRIGGER AS $$
DECLARE
  creator_role TEXT;
  creator_name TEXT;
  client_name TEXT;
  client_user_id UUID;
  admin_record RECORD;
BEGIN
  SELECT role, full_name INTO creator_role, creator_name FROM public.users WHERE id = NEW.created_by;
  IF creator_role = 'client' THEN
    SELECT name INTO client_name FROM public.clients WHERE id = NEW.client_id;
    FOR admin_record IN SELECT id FROM public.users WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (admin_record.id, 'Nova Ideia de Cliente', client_name || ' adicionou uma nova ideia.', '/admin/insights');
    END LOOP;
  ELSIF creator_role = 'admin' THEN
    SELECT user_id INTO client_user_id FROM public.clients WHERE id = NEW.client_id;
    IF client_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (client_user_id, 'Nova Ideia da Agência', creator_name || ' compartilhou uma nova ideia.', '/client/insights');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_insight_created_send_notification ON public.insights;
CREATE TRIGGER on_insight_created_send_notification
  AFTER INSERT ON public.insights
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_insight_notification();

-- FUNCTION & TRIGGER FOR POST STATUS
CREATE OR REPLACE FUNCTION public.handle_post_status_change()
RETURNS TRIGGER AS $$
DECLARE
  client_user_id UUID;
  client_name TEXT;
  admin_record RECORD;
BEGIN
  SELECT user_id, name INTO client_user_id, client_name FROM public.clients WHERE id = NEW.client_id;
  IF OLD.status <> 'refactor' AND NEW.status = 'refactor' THEN
    FOR admin_record IN SELECT id FROM public.users WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (admin_record.id, 'Pedido de Refação', client_name || ' solicitou refação em um post.', '/admin/dashboard');
    END LOOP;
  END IF;
  IF OLD.status = 'refactor' AND NEW.status = 'pending' THEN
    IF client_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (client_user_id, 'Post Reenviado para Análise', 'Um post foi alterado e está pronto para sua revisão.', '/client/dashboard');
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_status_change_send_notification ON public.posts;
CREATE TRIGGER on_post_status_change_send_notification
  AFTER UPDATE OF status ON public.posts
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_post_status_change();

-- Drafts table for auto-save
CREATE TABLE IF NOT EXISTS public.drafts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE, -- For editing existing posts
  form_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own drafts" ON public.drafts
  FOR ALL USING (auth.uid() = user_id);

  -- =================================================================
-- FUNÇÃO CENTRALIZADA PARA NOTIFICAÇÕES DE STATUS DE POST
-- =================================================================
CREATE OR REPLACE FUNCTION public.handle_post_status_notifications()
RETURNS TRIGGER AS $$
DECLARE
  client_user_id UUID;
  client_name TEXT;
  admin_record RECORD;
  post_creator_record RECORD;
BEGIN
  -- Obter informações do cliente
  SELECT user_id, name INTO client_user_id, client_name FROM public.clients WHERE id = NEW.client_id;
  -- Obter informações do criador do post
  SELECT full_name, role INTO post_creator_record FROM public.users WHERE id = NEW.created_by;

  -- Cenário 1: Post enviado para aprovação (notificar o cliente)
  IF (OLD.status = 'draft' OR OLD.status = 'refactor') AND NEW.status = 'pending' THEN
    IF client_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (client_user_id, 'Novo Post para Revisão', post_creator_record.full_name || ' enviou um novo post para sua aprovação.', '/client/dashboard?postId=' || NEW.id);
    END IF;

  -- Cenário 2: Cliente APROVOU um post (notificar todos os admins)
  ELSIF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    FOR admin_record IN SELECT id FROM public.users WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (admin_record.id, 'Post Aprovado', client_name || ' aprovou um post.', '/admin/calendar?postId=' || NEW.id);
    END LOOP;

  -- Cenário 3: Cliente APROVOU com ATRASO (notificar todos os admins)
  ELSIF OLD.status = 'pending' AND NEW.status = 'late_approved' THEN
    FOR admin_record IN SELECT id FROM public.users WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (admin_record.id, 'Aprovação Atrasada', client_name || ' aprovou um post com atraso. É necessária publicação manual.', '/admin/dashboard?postId=' || NEW.id);
    END LOOP;

  -- Cenário 4: Cliente REJEITOU ou pediu REFAÇÃO (notificar todos os admins)
  ELSIF OLD.status = 'pending' AND (NEW.status = 'rejected' OR NEW.status = 'refactor') THEN
    FOR admin_record IN SELECT id FROM public.users WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (admin_record.id, 'Alteração Solicitada', client_name || ' solicitou alterações em um post.', '/admin/calendar?postId=' || NEW.id);
    END LOOP;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- FUNÇÃO CENTRALIZADA PARA NOTIFICAÇÕES DE STATUS DE POST
-- =================================================================
CREATE OR REPLACE FUNCTION public.handle_post_status_notifications()
RETURNS TRIGGER AS $$
DECLARE
  client_user_id UUID;
  client_name TEXT;
  admin_record RECORD;
  post_creator_record RECORD;
BEGIN
  -- Obter informações do cliente
  SELECT user_id, name INTO client_user_id, client_name FROM public.clients WHERE id = NEW.client_id;
  -- Obter informações do criador do post
  SELECT full_name, role INTO post_creator_record FROM public.users WHERE id = NEW.created_by;

  -- Cenário 1: Post enviado para aprovação (notificar o cliente)
  IF (OLD.status = 'draft' OR OLD.status = 'refactor') AND NEW.status = 'pending' THEN
    IF client_user_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (client_user_id, 'Novo Post para Revisão', post_creator_record.full_name || ' enviou um novo post para sua aprovação.', '/client/dashboard?postId=' || NEW.id);
    END IF;

  -- Cenário 2: Cliente APROVOU um post (notificar todos os admins)
  ELSIF OLD.status = 'pending' AND NEW.status = 'approved' THEN
    FOR admin_record IN SELECT id FROM public.users WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (admin_record.id, 'Post Aprovado', client_name || ' aprovou um post.', '/admin/calendar?postId=' || NEW.id);
    END LOOP;

  -- Cenário 3: Cliente APROVOU com ATRASO (notificar todos os admins)
  ELSIF OLD.status = 'pending' AND NEW.status = 'late_approved' THEN
    FOR admin_record IN SELECT id FROM public.users WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (admin_record.id, 'Aprovação Atrasada', client_name || ' aprovou um post com atraso. É necessária publicação manual.', '/admin/dashboard?postId=' || NEW.id);
    END LOOP;

  -- Cenário 4: Cliente REJEITOU ou pediu REFAÇÃO (notificar todos os admins)
  ELSIF OLD.status = 'pending' AND (NEW.status = 'rejected' OR NEW.status = 'refactor') THEN
    FOR admin_record IN SELECT id FROM public.users WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, message, link)
      VALUES (admin_record.id, 'Alteração Solicitada', client_name || ' solicitou alterações em um post.', '/admin/calendar?postId=' || NEW.id);
    END LOOP;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- REMOVER TRIGGER ANTIGO E ADICIONAR O NOVO E MAIS COMPLETO
-- =================================================================
DROP TRIGGER IF EXISTS on_post_status_change_send_notification ON public.posts; -- Remove o antigo se existir
DROP TRIGGER IF EXISTS on_post_created_send_notification ON public.posts; -- Garante que não haja duplicatas
DROP TRIGGER IF EXISTS on_post_updated_send_notification ON public.posts; -- Garante que não haja duplicatas

CREATE TRIGGER on_post_updated_send_notification
  AFTER UPDATE OF status ON public.posts
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_post_status_notifications();

CREATE TRIGGER on_post_created_send_notification
  AFTER INSERT ON public.posts
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.handle_post_status_notifications();

-- Remove a função antiga que não será mais usada
DROP FUNCTION IF EXISTS public.handle_post_status_change();