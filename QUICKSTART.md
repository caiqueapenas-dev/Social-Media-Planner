# 🚀 Início Rápido - Social Media Planner

## 1️⃣ Instalação (5 minutos)

```bash
# Instalar dependências
npm install
```

## 2️⃣ Configurar Supabase (10 minutos)

### A. Criar projeto
1. Acesse https://supabase.com
2. Crie um novo projeto
3. Anote a **URL** e **anon key**

### B. Criar banco de dados
1. Vá para **SQL Editor**
2. Cole o conteúdo de `supabase/schema.sql`
3. Clique em **Run**

## 3️⃣ Configurar Cloudinary (5 minutos)

1. Acesse https://cloudinary.com
2. Crie conta gratuita
3. Anote o **Cloud Name**
4. Em **Settings > Upload**, crie um preset **unsigned**

## 4️⃣ Variáveis de Ambiente

Crie `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=sua-url-aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-key-aqui
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=seu-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=seu-preset
```

## 5️⃣ Executar

```bash
npm run dev
```

Acesse: http://localhost:3000

## 6️⃣ Criar Primeiro Usuário

### Opção A: Via Interface
1. Acesse http://localhost:3000/signup
2. Crie sua conta
3. Pronto! Você é admin por padrão

### Opção B: Via Supabase
1. **Authentication > Users** > Add user
2. Copie o UUID do usuário criado
3. **SQL Editor**:

```sql
INSERT INTO public.users (id, email, role, full_name)
VALUES ('cole-uuid-aqui', 'seu@email.com', 'admin', 'Seu Nome');
```

## 7️⃣ Próximos Passos

1. ✅ Faça login
2. ✅ Crie um cliente em **Clientes**
3. ✅ Crie seu primeiro post em **Calendário**
4. ✅ Explore os templates em **Configurações**

## 🎉 Pronto!

Seu Social Media Planner está funcionando!

---

## 📚 Documentação Completa

- 📖 [README.md](README.md) - Visão geral
- ⚙️ [SETUP.md](SETUP.md) - Configuração detalhada
- ✨ [FEATURES.md](FEATURES.md) - Lista de funcionalidades
- 🔍 [useful-queries.sql](supabase/useful-queries.sql) - Queries úteis

## 🆘 Problemas?

### Erro ao conectar Supabase
- Verifique as variáveis de ambiente
- Confirme que o projeto está ativo

### Não consigo fazer login
- Verifique se criou o usuário na tabela `users`
- Confirme que o email está correto

### Upload de imagens não funciona
- Verifique as credenciais do Cloudinary
- Confirme que o preset é "unsigned"

## 💡 Dicas

- Use **Ctrl+Shift+I** para abrir DevTools e ver erros
- Verifique o console do navegador
- Consulte os logs do Supabase
- Use as queries em `useful-queries.sql` para debug

---

**Desenvolvido com ❤️ usando Next.js + Supabase**

