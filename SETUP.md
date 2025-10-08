# Guia de Configuração do Social Media Planner

## 1. Configuração do Supabase

### Passo 1: Criar um projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie uma nova conta ou faça login
3. Crie um novo projeto
4. Anote a URL e a chave anon que serão exibidas

### Passo 2: Configurar o Banco de Dados

1. No painel do Supabase, vá para **SQL Editor**
2. Cole todo o conteúdo do arquivo `supabase/schema.sql`
3. Execute o script (clique em "Run" ou Ctrl+Enter)
4. Verifique se todas as tabelas foram criadas em **Database > Tables**

### Passo 3: Criar o primeiro usuário Admin

Existem duas formas de criar o primeiro usuário:

**Opção A: Via Interface do Supabase**
1. Vá para **Authentication > Users**
2. Clique em "Add user" > "Create new user"
3. Preencha email e senha
4. Após criar, copie o UUID do usuário
5. Vá para **SQL Editor** e execute:

```sql
INSERT INTO public.users (id, email, role, full_name)
VALUES ('UUID-COPIADO-AQUI', 'admin@example.com', 'admin', 'Nome do Admin');
```

**Opção B: Via aplicação (recomendado)**
1. Acesse `/signup` na aplicação
2. Crie sua conta
3. Por padrão, a conta será criada como "admin"
4. Se precisar mudar para "client", execute no SQL Editor:

```sql
UPDATE public.users SET role = 'client' WHERE email = 'email@usuario.com';
```

## 2. Configuração do Cloudinary

1. Acesse [cloudinary.com](https://cloudinary.com)
2. Crie uma conta gratuita
3. No Dashboard, anote:
   - Cloud Name
4. Vá para **Settings > Upload**
5. Crie um Upload Preset:
   - Clique em "Add upload preset"
   - Modo: **Unsigned**
   - Nome do preset: escolha um nome (ex: `app_calendar_unsigned`)
   - Salve

## 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=seu-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=seu-upload-preset
```

## 4. Instalação e Execução

```bash
# Instalar dependências
npm install

# Executar em desenvolvimento
npm run dev

# Build para produção
npm run build

# Executar em produção
npm start
```

## 5. Criar Clientes

1. Faça login como Admin
2. Vá para **Clientes**
3. Clique em "Novo Cliente"
4. Preencha:
   - Nome
   - Email (será criado um usuário automaticamente)
   - Cor da marca
5. O cliente receberá um email (se configurado) ou você pode fornecer as credenciais manualmente

**Nota**: A senha gerada automaticamente é aleatória. Para definir uma senha personalizada, você pode:
- Redefinir senha via Supabase Dashboard
- Ou implementar um endpoint de "esqueci minha senha"

## 6. Funcionalidades Principais

### Para Admins:
- Dashboard com estatísticas
- Gerenciar clientes
- Criar e agendar posts
- Calendário centralizado
- Templates e hashtags
- Insights

### Para Clientes:
- Revisar posts pendentes
- Aprovar/Reprovar posts
- Ver calendário
- Compartilhar ideias

## 7. Segurança

### Row Level Security (RLS)
Todas as tabelas possuem políticas RLS configuradas que garantem:
- Admins só veem seus próprios dados
- Clientes só veem dados relacionados a eles
- Isolamento completo entre clientes diferentes

### Middleware
O middleware protege todas as rotas:
- Usuários não autenticados são redirecionados para login
- Admins não podem acessar rotas de clientes
- Clientes não podem acessar rotas de admins

## 8. PWA (Progressive Web App)

A aplicação pode ser instalada em dispositivos:

**Desktop:**
- Chrome/Edge: Ícone de instalação na barra de endereço
- Safari: Não suporta instalação PWA

**Mobile:**
- Android: Banner de instalação ou menu > "Adicionar à tela inicial"
- iOS: Safari > Compartilhar > "Adicionar à Tela de Início"

## 9. Temas

Disponíveis 3 modos:
- Claro
- Escuro
- Automático (segue as preferências do sistema)

Altere nas configurações da sidebar.

## 10. Notificações

Para implementar notificações push completas (opcional):
1. Configure Firebase Cloud Messaging
2. Adicione o service worker de notificações
3. Solicite permissão do usuário
4. Implemente os triggers no backend

## 11. Solução de Problemas

### Erro: "Failed to fetch"
- Verifique se as variáveis de ambiente estão corretas
- Confirme que o projeto Supabase está ativo

### Erro: "Invalid API key"
- Verifique a chave anon no .env.local
- Certifique-se de usar a chave correta (não a service_role)

### Posts não aparecem
- Verifique as políticas RLS no Supabase
- Confirme que o usuário está autenticado
- Verifique se o client_id está correto

### Upload de imagens falha
- Verifique as credenciais do Cloudinary
- Confirme que o preset é "unsigned"
- Verifique o tamanho do arquivo (max 50MB)

## 12. Próximos Passos (Melhorias Futuras)

- [ ] Integração real com APIs do Instagram/Facebook
- [ ] Analytics e métricas de posts
- [ ] Agendamento automático de publicação
- [ ] Editor de imagens integrado
- [ ] Biblioteca de mídias
- [ ] Relatórios e exportação de dados
- [ ] Múltiplos admins por agência
- [ ] Sistema de permissões granulares
- [ ] Webhooks para eventos
- [ ] API pública para integrações

## Suporte

Para dúvidas ou problemas:
1. Verifique este guia
2. Consulte a documentação do Supabase
3. Entre em contato com o desenvolvedor

