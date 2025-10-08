-- ====================================
-- SCRIPT DE CRIAÇÃO DE USUÁRIOS
-- Social Media Planner
-- ====================================

-- IMPORTANTE: Execute este script em DUAS ETAPAS

-- ====================================
-- ETAPA 1: Criar Usuários no Authentication
-- ====================================
-- Vá para Authentication > Users no Supabase Dashboard
-- Clique em "Add user" > "Create new user"
-- Crie cada usuário abaixo manualmente e ANOTE os UUIDs gerados

-- Admin:
-- Email: admin@socialplanner.com
-- Senha: Admin@123456

-- Clientes:
-- Email: bressan.bonfim@email.com | Senha: Cliente@123
-- Email: clinica.gama@email.com | Senha: Cliente@123
-- Email: carlos.henrique@email.com | Senha: Cliente@123
-- Email: centro.bressan@email.com | Senha: Cliente@123
-- Email: clean.esplanada@email.com | Senha: Cliente@123
-- Email: clean.rioreal@email.com | Senha: Cliente@123
-- Email: otto.mais@email.com | Senha: Cliente@123
-- Email: pantherblazz@email.com | Senha: Cliente@123


-- ====================================
-- ETAPA 2: Execute o SQL abaixo
-- ====================================
-- SUBSTITUA os UUIDs pelos IDs reais gerados no passo anterior!

-- 1. CRIAR ADMIN
INSERT INTO public.users (id, email, role, full_name)
VALUES (
  '5946c622-d721-47b8-9bae-e81c48799c16', -- Substitua pelo UUID real
  'admin@socialplanner.com',
  'admin',
  'Administrador'
);

-- 2. CRIAR CLIENTES NA TABELA USERS
INSERT INTO public.users (id, email, role, full_name) VALUES
  ('dace7b5b-20c8-45b2-a272-76344619f0cc', 'bressan.bonfim@email.com', 'client', 'Bressan Bonfim'),
  ('c4a80030-8b76-4504-a5c2-f27695cc9de7', 'clinica.gama@email.com', 'client', 'Clínica Gama'),
  ('14c6f657-5735-4eab-a999-0df15b0feaa3', 'carlos.henrique@email.com', 'client', 'Carlos Henrique'),
  ('1efe244f-e837-43df-b748-430c175fa0bf', 'centro.bressan@email.com', 'client', 'Centro Médico Bressan Bonfim'),
  ('053f946e-e5b2-44ca-bd4f-b57980b3cad3', 'clean.esplanada@email.com', 'client', 'Clean Saúde Esplanada'),
  ('c3b828e1-dd92-4ec1-afd7-b85e657ecb33', 'clean.rioreal@email.com', 'client', 'Clean Saúde Rio Real'),
  ('591a2853-4a0e-4df3-a7ff-34a8a560807d', 'otto.mais@email.com', 'client', 'Otto Mais'),
  ('91d21ba7-aedb-4506-a77f-75deab7a0bd1', 'pantherblazz@email.com', 'client', 'PantherBlazz');

-- 3. CRIAR REGISTROS DE CLIENTES
INSERT INTO public.clients (name, email, user_id, brand_color, is_active) VALUES
  ('Bressan Bonfim', 'bressan.bonfim@email.com', 'dace7b5b-20c8-45b2-a272-76344619f0cc', '#3B82F6', true),
  ('Clínica Gama', 'clinica.gama@email.com', 'c4a80030-8b76-4504-a5c2-f27695cc9de7', '#10B981', true),
  ('Carlos Henrique', 'carlos.henrique@email.com', '14c6f657-5735-4eab-a999-0df15b0feaa3', '#F59E0B', true),
  ('Centro Médico Bressan Bonfim', 'centro.bressan@email.com', '1efe244f-e837-43df-b748-430c175fa0bf', '#EF4444', true),
  ('Clean Saúde Esplanada', 'clean.esplanada@email.com', '053f946e-e5b2-44ca-bd4f-b57980b3cad3', '#8B5CF6', true),
  ('Clean Saúde Rio Real', 'clean.rioreal@email.com', 'c3b828e1-dd92-4ec1-afd7-b85e657ecb33', '#EC4899', true),
  ('Otto Mais', 'otto.mais@email.com', '591a2853-4a0e-4df3-a7ff-34a8a560807d', '#06B6D4', true),
  ('PantherBlazz', 'pantherblazz@email.com', '91d21ba7-aedb-4506-a77f-75deab7a0bd1', '#F97316', true);

-- ====================================
-- VERIFICAÇÃO
-- ====================================
-- Execute para confirmar que tudo foi criado corretamente:

SELECT 
  u.full_name as nome,
  u.email,
  u.role as tipo,
  c.brand_color as cor,
  CASE WHEN c.is_active THEN 'Ativo' ELSE 'Inativo' END as status
FROM users u
LEFT JOIN clients c ON u.id = c.user_id
ORDER BY u.role DESC, u.full_name;