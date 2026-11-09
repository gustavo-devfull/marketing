# Marketing Ravi – Gestão de Ativos

Gerencia os ativos de marketing de cada produto, organizados pela **referência**:

- **Códigos de barras** – EAN-13 e DUN-14 em curvas (SVG / PDF vetorial), etiqueta EAN-13 de 4 × 3 cm e etiqueta de caixa DUN-14 (A4, 2 páginas), nos modelos Mori e Ravi.
- **Imagens**, **Arte de embalagens**, **Artes para redes sociais** e **Outros** – upload, visualização, download, link, renomear / mover de categoria e exclusão.

O painel lista os produtos da Base de Produtos com indicadores do que cada referência já tem, e permite filtrar pelo que falta (sem EAN, sem imagens, sem arte de embalagem…). Cada referência tem link próprio: `#/ref/RM1554`.

## Tecnologias

React 19 + TypeScript + Vite, Tailwind CSS 4, Supabase (Postgres, Auth e Storage), JsBarcode, opentype.js, jsPDF + svg2pdf.js. Mesmo layout do sistema Base de Produtos.

## Configuração

1. Use o **mesmo projeto Supabase da Base de Produtos**: a lista vem da tabela `products` (somente leitura).
2. No SQL Editor do Supabase, rode `supabase/migrations/0001_marketing_assets.sql`. Ela cria:
   - `marketing_assets` – um registro por arquivo (referência, categoria, título, caminho no Storage);
   - `marketing_labels` – dados das etiquetas por referência (EAN, DUN, modelo, lote, quantidade, composição…);
   - o bucket de Storage `marketing`.
3. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (na Vercel: *Settings → Environment Variables*).

```bash
npm install
npm run dev
```

## Permissões

Igual à Base de Produtos: a consulta é pública e **enviar, editar e excluir exigem login** (usuários criados em *Supabase → Authentication → Users*). O bucket `marketing` é público: quem tiver o link de um arquivo consegue abri-lo.

## Códigos de barras

- O EAN e o DUN começam com o valor do cadastro do produto; ao clicar em **Salvar dados**, ficam gravados em `marketing_labels` (o cadastro do produto não é alterado).
- O DUN-14 pode ser gerado a partir do EAN-13 (indicador logístico 1 + 12 primeiros dígitos + novo dígito verificador).
- Todo texto é convertido em curvas, então os arquivos não dependem de fontes instaladas. Fontes em `public/fonts`, artes dos modelos em `public/templates`.
