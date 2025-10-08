-- Queries Úteis para Gerenciamento do Social Media Planner

-- ====================================
-- CRIAR USUÁRIO ADMIN MANUALMENTE
-- ====================================

-- Primeiro, crie o usuário via Authentication > Users no Supabase Dashboard
-- Depois execute (substitua os valores):

INSERT INTO public.users (id, email, role, full_name)
VALUES (
  'uuid-do-usuario-criado',
  'admin@exemplo.com',
  'admin',
  'Nome do Administrador'
);

-- ====================================
-- CRIAR USUÁRIO CLIENTE MANUALMENTE
-- ====================================

-- 1. Crie o usuário via Authentication > Users
-- 2. Insira na tabela users:

INSERT INTO public.users (id, email, role, full_name)
VALUES (
  'uuid-do-usuario-criado',
  'cliente@exemplo.com',
  'client',
  'Nome do Cliente'
);

-- 3. Crie o registro do cliente:

INSERT INTO public.clients (name, email, user_id, brand_color, is_active)
VALUES (
  'Nome da Empresa',
  'cliente@exemplo.com',
  'uuid-do-usuario-criado',
  '#8b5cf6',
  true
);

-- ====================================
-- MUDAR ROLE DE UM USUÁRIO
-- ====================================

-- De cliente para admin:
UPDATE public.users 
SET role = 'admin' 
WHERE email = 'usuario@exemplo.com';

-- De admin para cliente:
UPDATE public.users 
SET role = 'client' 
WHERE email = 'usuario@exemplo.com';

-- ====================================
-- LISTAR TODOS OS POSTS COM CLIENTES
-- ====================================

SELECT 
  p.*,
  c.name as client_name,
  c.brand_color,
  u.full_name as created_by_name
FROM posts p
LEFT JOIN clients c ON p.client_id = c.id
LEFT JOIN users u ON p.created_by = u.id
ORDER BY p.scheduled_date DESC;

-- ====================================
-- POSTS PENDENTES DE APROVAÇÃO
-- ====================================

SELECT 
  p.id,
  p.caption,
  p.scheduled_date,
  c.name as client_name,
  c.email as client_email
FROM posts p
JOIN clients c ON p.client_id = c.id
WHERE p.status = 'pending'
ORDER BY p.scheduled_date ASC;

-- ====================================
-- ESTATÍSTICAS POR CLIENTE
-- ====================================

SELECT 
  c.name as cliente,
  COUNT(*) as total_posts,
  COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pendentes,
  COUNT(CASE WHEN p.status = 'approved' THEN 1 END) as aprovados,
  COUNT(CASE WHEN p.status = 'rejected' THEN 1 END) as rejeitados,
  COUNT(CASE WHEN p.status = 'published' THEN 1 END) as publicados
FROM clients c
LEFT JOIN posts p ON c.id = p.client_id
GROUP BY c.id, c.name
ORDER BY total_posts DESC;

-- ====================================
-- POSTS AGENDADOS PARA OS PRÓXIMOS 7 DIAS
-- ====================================

SELECT 
  p.scheduled_date,
  c.name as cliente,
  p.post_type,
  p.platforms,
  p.status,
  LEFT(p.caption, 50) || '...' as preview
FROM posts p
JOIN clients c ON p.client_id = c.id
WHERE p.scheduled_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  AND p.status = 'approved'
ORDER BY p.scheduled_date ASC;

-- ====================================
-- HISTÓRICO DE EDIÇÕES DE UM POST
-- ====================================

SELECT 
  eh.created_at,
  u.full_name as editado_por,
  eh.changes
FROM edit_history eh
JOIN users u ON eh.edited_by = u.id
WHERE eh.post_id = 'uuid-do-post'
ORDER BY eh.created_at DESC;

-- ====================================
-- COMENTÁRIOS DE UM POST COM AUTORES
-- ====================================

SELECT 
  pc.created_at,
  u.full_name as autor,
  u.role,
  pc.content
FROM post_comments pc
JOIN users u ON pc.user_id = u.id
WHERE pc.post_id = 'uuid-do-post'
ORDER BY pc.created_at ASC;

-- ====================================
-- NOTIFICAÇÕES NÃO LIDAS POR USUÁRIO
-- ====================================

SELECT 
  title,
  message,
  created_at,
  link
FROM notifications
WHERE user_id = 'uuid-do-usuario'
  AND is_read = false
ORDER BY created_at DESC;

-- ====================================
-- LIMPAR NOTIFICAÇÕES ANTIGAS (30+ dias)
-- ====================================

DELETE FROM notifications
WHERE created_at < NOW() - INTERVAL '30 days'
  AND is_read = true;

-- ====================================
-- TEMPLATES DE LEGENDA MAIS USADOS
-- ====================================

-- Primeiro, precisaria adicionar uma coluna usage_count
-- ou fazer tracking de uso. Query exemplo:

SELECT 
  title,
  LEFT(content, 100) || '...' as preview,
  created_at
FROM caption_templates
WHERE admin_id = 'uuid-do-admin'
ORDER BY created_at DESC;

-- ====================================
-- INSIGHTS POR CLIENTE
-- ====================================

SELECT 
  i.created_at,
  u.full_name as autor,
  u.role,
  i.content
FROM insights i
JOIN users u ON i.created_by = u.id
WHERE i.client_id = 'uuid-do-cliente'
ORDER BY i.created_at DESC;

-- ====================================
-- DATAS COMEMORATIVAS DO MÊS
-- ====================================

SELECT 
  c.name as cliente,
  sd.title,
  sd.date,
  sd.description
FROM special_dates sd
JOIN clients c ON sd.client_id = c.id
WHERE EXTRACT(MONTH FROM sd.date) = EXTRACT(MONTH FROM CURRENT_DATE)
  AND EXTRACT(YEAR FROM sd.date) = EXTRACT(YEAR FROM CURRENT_DATE)
ORDER BY sd.date ASC;

-- ====================================
-- CLIENTES ATIVOS E INATIVOS
-- ====================================

SELECT 
  is_active,
  COUNT(*) as quantidade
FROM clients
GROUP BY is_active;

-- ====================================
-- DESATIVAR CLIENTE E SEUS POSTS
-- ====================================

BEGIN;

-- Desativar cliente
UPDATE clients 
SET is_active = false 
WHERE id = 'uuid-do-cliente';

-- Opcional: Cancelar posts futuros pendentes
UPDATE posts 
SET status = 'draft' 
WHERE client_id = 'uuid-do-cliente'
  AND status IN ('pending', 'approved')
  AND scheduled_date > NOW();

COMMIT;

-- ====================================
-- REATIVAR CLIENTE
-- ====================================

UPDATE clients 
SET is_active = true 
WHERE id = 'uuid-do-cliente';

-- ====================================
-- BACKUP: EXPORTAR POSTS DE UM CLIENTE
-- ====================================

-- Execute no SQL Editor e exporte o resultado como CSV

SELECT 
  p.scheduled_date,
  p.status,
  p.post_type,
  p.platforms,
  p.caption,
  p.media_urls,
  p.created_at,
  p.updated_at
FROM posts p
WHERE p.client_id = 'uuid-do-cliente'
ORDER BY p.scheduled_date ASC;

-- ====================================
-- VERIFICAR INTEGRIDADE DO BANCO
-- ====================================

-- Posts sem cliente (não deveria existir):
SELECT COUNT(*) as posts_orfaos
FROM posts p
LEFT JOIN clients c ON p.client_id = c.id
WHERE c.id IS NULL;

-- Clientes sem usuário:
SELECT COUNT(*) as clientes_sem_usuario
FROM clients c
LEFT JOIN users u ON c.user_id = u.id
WHERE u.id IS NULL;

-- Usuários sem registro em users (auth only):
SELECT COUNT(*) as usuarios_incompletos
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL;

-- ====================================
-- CRIAR NOTIFICAÇÃO MANUAL
-- ====================================

INSERT INTO notifications (user_id, title, message, link, is_read)
VALUES (
  'uuid-do-usuario',
  'Título da Notificação',
  'Mensagem da notificação',
  '/admin/dashboard',
  false
);

-- ====================================
-- ADICIONAR DATA COMEMORATIVA
-- ====================================

INSERT INTO special_dates (client_id, title, date, description)
VALUES (
  'uuid-do-cliente',
  'Black Friday',
  '2024-11-29',
  'Maior data promocional do ano'
);

-- ====================================
-- ESTATÍSTICAS GERAIS DO SISTEMA
-- ====================================

SELECT 
  (SELECT COUNT(*) FROM users WHERE role = 'admin') as total_admins,
  (SELECT COUNT(*) FROM users WHERE role = 'client') as total_clientes,
  (SELECT COUNT(*) FROM clients WHERE is_active = true) as clientes_ativos,
  (SELECT COUNT(*) FROM posts) as total_posts,
  (SELECT COUNT(*) FROM posts WHERE status = 'pending') as posts_pendentes,
  (SELECT COUNT(*) FROM insights) as total_insights,
  (SELECT COUNT(*) FROM post_comments) as total_comentarios;

-- ====================================
-- PERFORMANCE: ÍNDICES ÚTEIS
-- ====================================

-- Se o sistema ficar lento, considere adicionar estes índices:

CREATE INDEX IF NOT EXISTS idx_posts_client_scheduled 
ON posts(client_id, scheduled_date DESC);

CREATE INDEX IF NOT EXISTS idx_posts_status 
ON posts(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_comments_post 
ON post_comments(post_id, created_at DESC);

-- ====================================
-- RESETAR SENHA DE USUÁRIO
-- ====================================

-- Não há query SQL direta. Faça via:
-- 1. Supabase Dashboard > Authentication > Users > ... > Send reset password email
-- 2. Ou use a API do Supabase para enviar email de reset

-- ====================================
-- DELETAR TODOS OS DADOS DE TESTE
-- ====================================

-- CUIDADO! Isso apaga tudo. Use apenas em desenvolvimento.

BEGIN;

DELETE FROM notifications;
DELETE FROM post_comments;
DELETE FROM edit_history;
DELETE FROM insights;
DELETE FROM special_dates;
DELETE FROM posts;
DELETE FROM caption_templates;
DELETE FROM hashtag_groups;
DELETE FROM drafts;
DELETE FROM clients;
DELETE FROM admin_profiles;
-- Não delete users diretamente, delete via Authentication no Supabase

COMMIT;

