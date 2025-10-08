# 🚀 Comandos Importantes

## 1️⃣ Instalar Novas Dependências

As seguintes bibliotecas foram adicionadas para drag-and-drop:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Ou simplesmente:

```bash
npm install
```

---

## 2️⃣ Executar o Aplicativo

```bash
npm run dev
```

Acesse: http://localhost:3000

---

## 3️⃣ Testar as Novas Funcionalidades

### ✅ **Datas Especiais** (PRONTO)
1. Faça login como admin
2. Vá para **Datas Especiais** no menu
3. Clique em "Nova Data"
4. Preencha: Cliente, Título, Data, Descrição
5. Salve
6. A data aparecerá no calendário do cliente!

### ✅ **Botões Coloridos de Plataforma** (IMPLEMENTADO)
- Os componentes estão prontos
- Precisa integrar no `post-form.tsx`

### ✅ **Modal de Data/Hora Moderno** (IMPLEMENTADO)
- Componente criado
- Precisa integrar no `post-form.tsx`

### ✅ **Visualização Read-Only** (IMPLEMENTADO)
- Componente criado
- Precisa integrar no calendário

### ✅ **Drag-and-Drop** (IMPLEMENTADO)
- Componente criado
- Precisa integrar no `post-form.tsx`

---

## 4️⃣ O Que Ainda Precisa Ser Feito

### Prioridade ALTA:
1. ⏳ Atualizar `post-form.tsx` completamente
2. ⏳ Atualizar calendário admin (comprimir posts)
3. ⏳ Implementar notificações automáticas
4. ⏳ Corrigir exibição de nomes em insights

### Prioridade MÉDIA:
5. ⏳ Atualizar dashboard admin (seções)
6. ⏳ Atualizar calendário cliente (pontos)
7. ⏳ Templates/hashtags em posts

### Prioridade BAIXA:
8. ⏳ Select colorido de clientes
9. ⏳ Melhorias visuais gerais

---

## 5️⃣ Alterações no Banco de Dados

### Adicionar client_id em templates (OPCIONAL - para depois):

```sql
-- Adicionar client_id em caption_templates
ALTER TABLE caption_templates 
ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Adicionar client_id em hashtag_groups
ALTER TABLE hashtag_groups 
ADD COLUMN client_id UUID REFERENCES clients(id) ON DELETE CASCADE;

-- Atualizar RLS
DROP POLICY IF EXISTS "Admins can manage their templates" ON caption_templates;
CREATE POLICY "Admins can view/manage templates" ON caption_templates
  FOR ALL USING (
    admin_id = auth.uid() OR 
    (client_id IN (SELECT id FROM clients WHERE EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )))
  );
```

---

## 6️⃣ Estado Atual

### ✅ Funcionando:
- Login/Logout
- Dashboard básico (admin e cliente)
- Criação de posts (formato antigo)
- Aprovação de posts
- Clientes
- Insights
- Datas Especiais ⭐ NOVO

### ⚠️ Em Atualização:
- Formulário de posts (integrando novos componentes)
- Calendário admin (compressão de posts)
- Notificações (automáticas)
- Calendário cliente (simplificação)

### ❌ Bugs Conhecidos:
- Notificações abrindo fora do app
- Insights mostrando "Usuário" ao invés do nome real
- Templates/hashtags não utilizáveis em posts
- Calendário cliente com muito texto nas células

---

## 7️⃣ Como Contribuir com o Desenvolvimento

Se você quiser ajudar a implementar as funcionalidades restantes:

1. Leia `ALTERACOES_IMPLEMENTADAS.md` para entender o que foi feito
2. Veja a lista de TODOs
3. Implemente uma funcionalidade por vez
4. Teste antes de marcar como concluído

---

## 8️⃣ Troubleshooting

### Erro: Module not found '@dnd-kit/...'
**Solução**: Execute `npm install`

### Erro: Invalid hook call
**Solução**: Certifique-se de que todos os componentes com hooks estão marcados como `"use client"`

### Posts não aparecem no calendário
**Solução**: Verifique se criou posts com status "approved" e data futura

### Datas especiais não aparecem no cliente
**Solução**: Verifique se associou a data ao cliente correto

---

**Desenvolvido com ❤️**

