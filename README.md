# EVOTrainer — MVP de venda de planilhas

Este projeto é uma base funcional em **Next.js App Router + Tailwind CSS + Prisma ORM + SQLite** para vender planilhas de treino com aprovação humana da anamnese. O pagamento é simulado no ambiente local; o webhook está preparado para receber um gateway real.

Após a aprovação no painel, o sistema monta um treino usando a base curada em `lib/exercises.ts`, chama o Gemini quando `GEMINI_API_KEY` estiver configurada e gera dois arquivos em `public/generated`: uma planilha XLSX estilizada e um PDF profissional com links clicáveis para os vídeos. Sem chave do Gemini, o MVP utiliza um plano fallback determinístico para permitir testes locais.

## 1. Requisitos

Instale Node.js 20 ou superior e Git no Windows. Abra a pasta no VS Code e execute os comandos abaixo no PowerShell:

```powershell
npm install
Copy-Item .env.example .env
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Para habilitar o Gemini, preencha `GEMINI_API_KEY` no `.env`. A chamada é feita exclusivamente no backend. O modelo padrão é `gemini-2.5-flash`, alterável por `GEMINI_MODEL`.

## Login administrativo

Defina uma senha mestra no arquivo `.env`:

```env
ADMIN_PASSWORD="uma-senha-forte-e-unica"
```

O acesso a `/admin` e a todas as rotas `/api/admin/*` é bloqueado pelo `middleware.ts` até que o usuário entre em `/admin/login`. O login cria um cookie `HttpOnly`, `SameSite=Strict`, com validade de oito horas e assinatura HMAC baseada na senha. Em produção, use HTTPS e um segredo longo; não versione o arquivo `.env`.

Abra `http://localhost:3000`. O produto inicial é criado pelo seed com preço de R$ 97,00. Substitua a URL demonstrativa em `prisma/seed.ts` pela URL real da planilha antes de executar o seed em uma base limpa. Para visualizar o banco, use `npm run prisma:studio`.

## 2. Rotas da aplicação

| Rota | Finalidade |
|---|---|
| `/` | Landing page pública de vendas |
| `/checkout` | Formulário de dados de contato e anamnese |
| `/checkout/sucesso` | Confirmação do pedido |
| `/admin` | Painel simples do personal |
| `POST /api/orders` | Cria um pedido pendente |
| `POST /api/orders/:id/simulate-payment` | Simula pagamento aprovado localmente |
| `POST /api/webhooks/payment` | Recebe confirmação do gateway |
| `GET /api/admin/orders` | Lista pedidos aprovados aguardando revisão |
| `POST /api/admin/orders/:id/approve` | Aprova e simula envio do link |

## 3. Fluxo de negócio

O cliente envia seus dados e respostas. O servidor salva `answersAnamnesis` como JSON serializado no campo de texto do pedido. No checkout local, a rota de simulação altera `paymentStatus` para `APPROVED` e mantém `deliveryStatus` em `PENDING_REVIEW`. Em produção, o gateway deve chamar o webhook com `orderId` ou `external_reference` e `status: approved`.

No painel, o personal lê a anamnese e aciona **Aprovar e enviar**. O endpoint altera a entrega para `APPROVED_AND_SENT`, grava `approvedAt` e retorna o e-mail, WhatsApp e `spreadsheetUrl`. A implementação atual apenas simula o envio; conecte um provedor transacional de e-mail e/ou WhatsApp nesse ponto.

## 4. Webhook de exemplo

```powershell
$body = '{"orderId":"COLE_O_ID","status":"approved"}'
curl.exe -X POST http://localhost:3000/api/webhooks/payment `
  -H "Content-Type: application/json" `
  -H "x-webhook-secret: segredo-webhook-local" `
  -d $body
```

O endpoint já ignora eventos sem aprovação e usa a atualização do pedido como operação idempotente para reprocessamentos. Em produção, valide a assinatura oficial do gateway, não apenas um segredo estático.

## 5. Segurança e próximos passos

O token administrativo deve ser trocado no `.env`. A listagem GET foi deixada simples para o MVP local; antes de publicar, proteja também essa rota com autenticação de usuário/ sessão e implemente autorização por função. Também é necessário validar e-mails/telefones com uma biblioteca de schema, adicionar rate limiting, registrar eventos de webhook, evitar expor URLs sensíveis e integrar o envio real com tratamento de falhas e retries.

Para Mercado Pago ou outro gateway, crie a preferência de pagamento no servidor, associe o identificador externo ao pedido e configure a URL pública HTTPS do webhook. Nunca confie apenas no status enviado pelo navegador.

## 6. Estrutura

```text
app/
  api/orders/route.ts
  api/orders/[id]/simulate-payment/route.ts
  api/webhooks/payment/route.ts
  api/admin/orders/route.ts
  api/admin/orders/[id]/approve/route.ts
  admin/page.tsx
  checkout/page.tsx
  checkout/sucesso/page.tsx
  page.tsx
components/CheckoutForm.tsx
lib/prisma.ts
prisma/schema.prisma
prisma/seed.ts
```
