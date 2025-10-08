# 👥 Como Criar Usuários no Supabase

## 🎯 Método Recomendado (Mais Fácil)

### Passo 1: Criar via Dashboard do Supabase

1. Acesse seu projeto no Supabase
2. Vá para **Authentication** > **Users**
3. Clique em **Add user** > **Create new user**
4. Para cada usuário abaixo:

#### 🔑 Admin
- **Email**: `admin@socialplanner.com`
- **Password**: `Admin@123456`
- Auto Confirm Email: ✅ Ativado
- Clique em **Create user**
- ⚠️ **COPIE O UUID** que aparece (você vai precisar)

#### 👥 Clientes

Crie cada um desses usuários:

| Nome | Email | Senha |
|------|-------|-------|
| Bressan Bonfim | bressan.bonfim@email.com | Cliente@123 |
| Clínica Gama | clinica.gama@email.com | Cliente@123 |
| Carlos Henrique | carlos.henrique@email.com | Cliente@123 |
| Centro Médico Bressan Bonfim | centro.bressan@email.com | Cliente@123 |
| Clean Saúde Esplanada | clean.esplanada@email.com | Cliente@123 |
| Clean Saúde Rio Real | clean.rioreal@email.com | Cliente@123 |
| Otto Mais | otto.mais@email.com | Cliente@123 |
| PantherBlazz | pantherblazz@email.com | Cliente@123 |

Para cada um:
- Auto Confirm Email: ✅ Ativado
- **COPIE O UUID**

### Passo 2: Executar SQL

Depois de criar todos no Authentication, vá para **SQL Editor** e execute:

```sql
-- SUBSTITUA OS UUIDs PELOS REAIS!

BEGIN;

-- Admin
INSERT INTO public.users (id, email, role, full_name) VALUES
  ('COLE-UUID-DO-ADMIN', 'admin@socialplanner.com', 'admin', 'Administrador');

-- Clientes
INSERT INTO public.users (id, email, role, full_name) VALUES
  ('COLE-UUID-1', 'bressan.bonfim@email.com', 'client', 'Bressan Bonfim'),
  ('COLE-UUID-2', 'clinica.gama@email.com', 'client', 'Clínica Gama'),
  ('COLE-UUID-3', 'carlos.henrique@email.com', 'client', 'Carlos Henrique'),
  ('COLE-UUID-4', 'centro.bressan@email.com', 'client', 'Centro Médico Bressan Bonfim'),
  ('COLE-UUID-5', 'clean.esplanada@email.com', 'client', 'Clean Saúde Esplanada'),
  ('COLE-UUID-6', 'clean.rioreal@email.com', 'client', 'Clean Saúde Rio Real'),
  ('COLE-UUID-7', 'otto.mais@email.com', 'client', 'Otto Mais'),
  ('COLE-UUID-8', 'pantherblazz@email.com', 'client', 'PantherBlazz');

-- Perfis de Clientes
INSERT INTO public.clients (name, email, user_id, brand_color, is_active) VALUES
  ('Bressan Bonfim', 'bressan.bonfim@email.com', 'COLE-UUID-1', '#3B82F6', true),
  ('Clínica Gama', 'clinica.gama@email.com', 'COLE-UUID-2', '#10B981', true),
  ('Carlos Henrique', 'carlos.henrique@email.com', 'COLE-UUID-3', '#F59E0B', true),
  ('Centro Médico Bressan Bonfim', 'centro.bressan@email.com', 'COLE-UUID-4', '#EF4444', true),
  ('Clean Saúde Esplanada', 'clean.esplanada@email.com', 'COLE-UUID-5', '#8B5CF6', true),
  ('Clean Saúde Rio Real', 'clean.rioreal@email.com', 'COLE-UUID-6', '#EC4899', true),
  ('Otto Mais', 'otto.mais@email.com', 'COLE-UUID-7', '#06B6D4', true),
  ('PantherBlazz', 'pantherblazz@email.com', 'COLE-UUID-8', '#F97316', true);

COMMIT;
```

### Passo 3: Verificar

Execute para ver se deu certo:

```sql
SELECT 
  u.full_name as "Nome",
  u.email as "Email",
  u.role as "Tipo",
  c.brand_color as "Cor",
  CASE WHEN c.is_active THEN '✅' ELSE '❌' END as "Status"
FROM users u
LEFT JOIN clients c ON u.id = c.user_id
ORDER BY u.role DESC, u.full_name;
```

---

## 🚀 Método Alternativo (Via Interface do App)

Uma forma ainda mais fácil é usar a própria interface do app:

1. Faça login como admin em: `http://localhost:3000/login`
   - Email: `admin@socialplanner.com`
   - Senha: `Admin@123456`

2. Vá para **Clientes**

3. Clique em **Novo Cliente** e adicione cada um:
   - Nome
   - Email
   - Cor da marca

O app criará automaticamente:
- ✅ Usuário no Authentication
- ✅ Registro na tabela users
- ✅ Registro na tabela clients

**Nota**: A senha gerada é aleatória. Você pode:
- Ir no **Authentication > Users** e clicar em **Send password reset email**
- Ou definir manualmente no dashboard

---

## 🎨 Cores das Marcas

Escolhidas cores únicas para cada cliente:

| Cliente | Cor | Hex |
|---------|-----|-----|
| Bressan Bonfim | 🔵 Azul | #3B82F6 |
| Clínica Gama | 🟢 Verde | #10B981 |
| Carlos Henrique | 🟡 Amarelo | #F59E0B |
| Centro Médico Bressan Bonfim | 🔴 Vermelho | #EF4444 |
| Clean Saúde Esplanada | 🟣 Roxo | #8B5CF6 |
| Clean Saúde Rio Real | 🩷 Rosa | #EC4899 |
| Otto Mais | 🔷 Ciano | #06B6D4 |
| PantherBlazz | 🟠 Laranja | #F97316 |

Essas cores aparecerão no calendário para identificar visualmente cada cliente!

---

## 📝 Credenciais de Acesso

### Admin
- **URL**: http://localhost:3000/login
- **Email**: admin@socialplanner.com
- **Senha**: Admin@123456

### Clientes
- **URL**: http://localhost:3000/login
- **Senha padrão**: Cliente@123

| Cliente | Email |
|---------|-------|
| Bressan Bonfim | bressan.bonfim@email.com |
| Clínica Gama | clinica.gama@email.com |
| Carlos Henrique | carlos.henrique@email.com |
| Centro Médico Bressan Bonfim | centro.bressan@email.com |
| Clean Saúde Esplanada | clean.esplanada@email.com |
| Clean Saúde Rio Real | clean.rioreal@email.com |
| Otto Mais | otto.mais@email.com |
| PantherBlazz | pantherblazz@email.com |

---

## ⚠️ Importante

- Todos os usuários são criados com **email confirmado**
- As senhas são temporárias, recomende trocar no primeiro acesso
- Os clientes começam **ativos** por padrão
- Você pode ativar/desativar clientes na interface admin

---

## 🐛 Solução de Problemas

### Erro: "User already exists"
- O email já foi usado. Use outro email ou delete o usuário existente.

### Erro: "duplicate key value violates unique constraint"
- UUID já existe. Use UUIDs únicos ou deixe o banco gerar automaticamente.

### Cliente não consegue fazer login
- Verifique se criou o usuário no Authentication
- Confirme que o registro existe nas tabelas users e clients
- Verifique se o cliente está ativo

### Admin não vê todos os clientes
- Execute a query de verificação
- Confirme que o role está como 'admin' na tabela users

