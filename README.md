# Social Media Planner

Uma plataforma completa para gerenciamento de conteúdo de mídias sociais, permitindo que agências e clientes colaborem no planejamento, criação e aprovação de posts.

## 🚀 Funcionalidades

### Para Administradores (Agências)
- ✅ Dashboard com estatísticas de posts
- ✅ Gerenciamento completo de clientes
- ✅ Calendário centralizado com todos os posts
- ✅ Criação e agendamento de posts (Foto, Carrossel, Reels, Story)
- ✅ Upload de mídias com Cloudinary
- ✅ Templates de legendas reutilizáveis
- ✅ Grupos de hashtags organizados
- ✅ Sistema de Insights para troca de ideias
- ✅ Ações em massa (bulk actions)

### Para Clientes
- ✅ Dashboard simplificado
- ✅ Visualização de posts por status
- ✅ Sistema de aprovação/reprovação de posts
- ✅ Edição de legendas com log de alterações
- ✅ Calendário com posts e datas comemorativas
- ✅ Sistema de comentários em posts
- ✅ Compartilhamento de insights e ideias

### Recursos Avançados
- ✅ Autenticação segura com Supabase
- ✅ Row Level Security (RLS) para isolamento de dados
- ✅ Sistema de temas (Claro/Escuro/Automático)
- ✅ Progressive Web App (PWA)
- ✅ Notificações em tempo real
- ✅ Design responsivo (Mobile-First)
- ✅ Comentários com atualizações em tempo real

## 🛠️ Tecnologias

- **Frontend**: Next.js 14, React, TypeScript
- **Estilização**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Gerenciamento de Estado**: Zustand
- **Upload de Arquivos**: Cloudinary
- **Animações**: Framer Motion
- **Ícones**: Lucide React

## 📦 Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd social-media-planner
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
Crie um arquivo `.env.local` com:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

4. Configure o banco de dados:
Execute o arquivo `supabase/schema.sql` no SQL Editor do Supabase para criar todas as tabelas e políticas de segurança.

5. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

6. Acesse http://localhost:3000

## 🗄️ Estrutura do Banco de Dados

- **users**: Usuários do sistema (Admin e Cliente)
- **clients**: Dados dos clientes gerenciados
- **posts**: Posts agendados
- **edit_history**: Histórico de edições em posts
- **caption_templates**: Templates de legendas salvos
- **hashtag_groups**: Grupos de hashtags organizados
- **special_dates**: Datas comemorativas específicas por cliente
- **insights**: Ideias e sugestões compartilhadas
- **post_comments**: Comentários em posts
- **notifications**: Notificações do sistema
- **drafts**: Rascunhos de posts (auto-save)
- **admin_profiles**: Perfis personalizados de administradores

## 🔐 Segurança

- Autenticação via Supabase Auth
- Row Level Security (RLS) em todas as tabelas
- Middleware para proteção de rotas
- Separação completa de dados entre clientes

## 📱 PWA

O aplicativo pode ser instalado em dispositivos móveis e desktops, funcionando como um app nativo com capacidade offline.

## 🎨 Temas

Suporte completo para temas claro, escuro e automático (baseado nas preferências do sistema).

## 👥 Usuários de Exemplo

Para testar a aplicação, você precisará criar usuários através do código ou do Supabase Dashboard.

### Admin
```sql
-- Execute no SQL Editor do Supabase após criar o usuário via Auth
INSERT INTO users (id, email, role, full_name)
VALUES ('user-id-from-auth', 'admin@example.com', 'admin', 'Admin Name');
```

### Cliente
Os clientes são criados automaticamente pela interface de gerenciamento de clientes.

## 📄 Licença

Este projeto é privado e de uso restrito.

## 🤝 Contribuindo

Para contribuir com o projeto, entre em contato com a equipe de desenvolvimento.

