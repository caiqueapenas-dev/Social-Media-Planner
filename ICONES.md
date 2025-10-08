# 🎨 Como Adicionar Ícones Personalizados

O aplicativo está funcionando, mas você pode querer adicionar ícones personalizados para a PWA.

## 📝 Opção 1: Usar um Gerador Online (Recomendado)

1. Acesse: https://realfavicongenerator.net/
2. Faça upload do seu logo (PNG de alta qualidade)
3. Configure as opções
4. Baixe o pacote gerado
5. Substitua os arquivos em `/public/`

## 📝 Opção 2: Criar Manualmente

Crie estes arquivos na pasta `public/`:

### Tamanhos Necessários:
- `favicon.ico` - 16x16 ou 32x32
- `icon-192.png` - 192x192 (Android)
- `icon-512.png` - 512x512 (Android HD)
- `apple-touch-icon.png` - 180x180 (iOS)

### Ferramentas Recomendadas:
- **Canva**: https://canva.com
- **Figma**: https://figma.com
- **GIMP**: Software gratuito

## 📝 Opção 3: Usar Logo Existente

Se você já tem um logo:

1. Redimensione para os tamanhos acima
2. Exporte como PNG (com fundo transparente se possível)
3. Coloque na pasta `public/`
4. Atualize o `manifest.json`

## 🔄 Atualizar manifest.json

Depois de adicionar os ícones, atualize o arquivo `public/manifest.json`:

```json
{
  "icons": [
    {
      "src": "/favicon.ico",
      "sizes": "16x16",
      "type": "image/x-icon"
    },
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/apple-touch-icon.png",
      "sizes": "180x180",
      "type": "image/png"
    }
  ]
}
```

## ✅ Por Enquanto

O app está funcionando com um favicon básico. Você pode adicionar ícones personalizados depois!

## 🎨 Sugestão de Design

Para um **Social Media Planner**, considere:
- Ícone de calendário
- Cores do brand (#8b5cf6 - roxo)
- Algo relacionado a redes sociais
- Design minimalista

## 📱 Testar PWA

Depois de adicionar os ícones:
1. Build da aplicação: `npm run build`
2. Teste em dispositivo móvel
3. Verifique se o ícone aparece ao instalar

