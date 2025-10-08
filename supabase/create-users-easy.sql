-- ====================================
-- MÉTODO FÁCIL - USANDO UUIDs FIXOS
-- ====================================
-- Este script usa UUIDs pré-definidos para facilitar
-- Você precisará criar os usuários no Authentication com esses IDs

-- ====================================
-- PASSO 1: Usar a API do Supabase
-- ====================================
-- Cole este código no console do navegador (F12) na página do Supabase:

/*
const SUPABASE_URL = 'SUA_URL_AQUI';
const SERVICE_ROLE_KEY = 'SUA_SERVICE_ROLE_KEY_AQUI'; // Settings > API > service_role

const users = [
  { id: '11111111-1111-1111-1111-111111111111', email: 'admin@socialplanner.com', password: 'Admin@123456' },
  { id: '22222222-2222-2222-2222-222222222222', email: 'bressan.bonfim@email.com', password: 'Cliente@123' },
  { id: '33333333-3333-3333-3333-333333333333', email: 'clinica.gama@email.com', password: 'Cliente@123' },
  { id: '44444444-4444-4444-4444-444444444444', email: 'carlos.henrique@email.com', password: 'Cliente@123' },
  { id: '55555555-5555-5555-5555-555555555555', email: 'centro.bressan@email.com', password: 'Cliente@123' },
  { id: '66666666-6666-6666-6666-666666666666', email: 'clean.esplanada@email.com', password: 'Cliente@123' },
  { id: '77777777-7777-7777-7777-777777777777', email: 'clean.rioreal@email.com', password: 'Cliente@123' },
  { id: '88888888-8888-8888-8888-888888888888', email: 'otto.mais@email.com', password: 'Cliente@123' },
  { id: '99999999-9999-9999-9999-999999999999', email: 'pantherblazz@email.com', password: 'Cliente@123' }
];

async function createUsers() {
  for (const user of users) {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY
      },
      body: JSON.stringify({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { full_name: user.email.split('@')[0] }
      })
    });
    
    const data = await response.json();
    console.log(`Criado: ${user.email}`, data);
  }
}

createUsers();
*/

-- ====================================
-- PASSO 2: Execute este SQL
-- ====================================

BEGIN;

-- Criar Admin
INSERT INTO public.users (id, email, role, full_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@socialplanner.com', 'admin', 'Administrador');

-- Criar Clientes na tabela users
INSERT INTO public.users (id, email, role, full_name) VALUES
  ('22222222-2222-2222-2222-222222222222', 'bressan.bonfim@email.com', 'client', 'Bressan Bonfim'),
  ('33333333-3333-3333-3333-333333333333', 'clinica.gama@email.com', 'client', 'Clínica Gama'),
  ('44444444-4444-4444-4444-444444444444', 'carlos.henrique@email.com', 'client', 'Carlos Henrique'),
  ('55555555-5555-5555-5555-555555555555', 'centro.bressan@email.com', 'client', 'Centro Médico Bressan Bonfim'),
  ('66666666-6666-6666-6666-666666666666', 'clean.esplanada@email.com', 'client', 'Clean Saúde Esplanada'),
  ('77777777-7777-7777-7777-777777777777', 'clean.rioreal@email.com', 'client', 'Clean Saúde Rio Real'),
  ('88888888-8888-8888-8888-888888888888', 'otto.mais@email.com', 'client', 'Otto Mais'),
  ('99999999-9999-9999-9999-999999999999', 'pantherblazz@email.com', 'client', 'PantherBlazz');

-- Criar registros de clientes
INSERT INTO public.clients (name, email, user_id, brand_color, is_active) VALUES
  ('Bressan Bonfim', 'bressan.bonfim@email.com', '22222222-2222-2222-2222-222222222222', '#3B82F6', true),
  ('Clínica Gama', 'clinica.gama@email.com', '33333333-3333-3333-3333-333333333333', '#10B981', true),
  ('Carlos Henrique', 'carlos.henrique@email.com', '44444444-4444-4444-4444-444444444444', '#F59E0B', true),
  ('Centro Médico Bressan Bonfim', 'centro.bressan@email.com', '55555555-5555-5555-5555-555555555555', '#EF4444', true),
  ('Clean Saúde Esplanada', 'clean.esplanada@email.com', '66666666-6666-6666-6666-666666666666', '#8B5CF6', true),
  ('Clean Saúde Rio Real', 'clean.rioreal@email.com', '77777777-7777-7777-7777-777777777777', '#EC4899', true),
  ('Otto Mais', 'otto.mais@email.com', '88888888-8888-8888-8888-888888888888', '#06B6D4', true),
  ('PantherBlazz', 'pantherblazz@email.com', '99999999-9999-9999-9999-999999999999', '#F97316', true);

COMMIT;

-- Verificar
SELECT 
  u.full_name as "Nome",
  u.email as "Email",
  u.role as "Tipo",
  c.brand_color as "Cor da Marca",
  CASE WHEN c.is_active THEN '✅ Ativo' ELSE '❌ Inativo' END as "Status"
FROM users u
LEFT JOIN clients c ON u.id = c.user_id
ORDER BY u.role DESC, u.full_name;

