# Deploy de produção do ConsultoriaFit

## 1. VPS

Na VPS Ubuntu, instale Docker Engine e o plugin Docker Compose, clone o repositório e crie o ambiente real:

```bash
git clone <URL_DO_REPOSITORIO> /opt/consultoriafit
cd /opt/consultoriafit
cp .env.production.example .env
nano .env
chmod +x deploy-vps.sh
./deploy-vps.sh
```

O Caddy precisa receber tráfego externo nas portas TCP **80** e **443**. O DNS de `api.felipepersonal.com` deve apontar para o IP público da VPS antes do primeiro deploy para que o Let's Encrypt emita o certificado.

A API será verificada em `https://api.felipepersonal.com/health` e o Swagger, se mantido público, em `https://api.felipepersonal.com/docs`.

## 2. Variáveis da VPS

Use `.env.production.example` como base. Os valores de produção não devem ser commitados. Em especial, troque `POSTGRES_PASSWORD`, `JWT_SECRET`, `MERCADO_PAGO_WEBHOOK_SECRET` e as chaves de provedores externos.

## 3. Variáveis exatas na Vercel

Cadastre estas variáveis no projeto do frontend, em **Production**, **Preview** e **Development** conforme o ambiente:

| Variável | Produção | Preview / Desenvolvimento |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://api.felipepersonal.com/api` | URL HTTPS da API de teste, se houver |

Não cadastre `JWT_SECRET`, `DATABASE_URL`, `OPENAI_API_KEY`, `MERCADO_PAGO_ACCESS_TOKEN` ou `WHATSAPP_API_KEY` na Vercel: são segredos exclusivos da VPS/API e não devem ser expostos ao bundle do navegador.

No projeto Vercel, configure o domínio `felipepersonal.com` e o alias `www.felipepersonal.com` conforme o painel fornecer. O frontend já lê `process.env.NEXT_PUBLIC_API_URL` em `services/web/src/lib/api.ts`.

## 4. DNS

Substitua `<IP_PUBLICO_DA_VPS>` pelo endereço real da VPS e `<CNAME_FORNECIDO_PELA_VERCEL>` pelos valores exibidos no painel da Vercel:

| Tipo | Nome / Host | Valor / Destino | Finalidade |
| --- | --- | --- | --- |
| A | `@` | `<IP_PUBLICO_DA_VPS>` | Domínio raiz na Vercel, quando o provedor permitir o apontamento recomendado pela Vercel |
| CNAME | `www` | `<CNAME_FORNECIDO_PELA_VERCEL>` | Alias `www` para a Vercel |
| A | `api` | `<IP_PUBLICO_DA_VPS>` | API na VPS via Caddy |

> A Vercel pode recomendar registros A/AAAA diferentes para o domínio raiz. Siga os valores atuais exibidos na tela **Domains** da Vercel para `@`; não mantenha registros conflitantes antigos. Para `api`, não use proxy CDN que impeça o desafio HTTP-01 do Caddy, a menos que o provedor esteja configurado para repassar corretamente 80/443.

## 5. Primeiro teste ponta a ponta

1. Confirme `https://api.felipepersonal.com/health` retornando HTTP 200.
2. Na Vercel, publique o frontend com `NEXT_PUBLIC_API_URL=https://api.felipepersonal.com/api`.
3. Abra `https://felipepersonal.com/` e valide a landing page.
4. Teste login, anamnese, área do aluno, painel administrativo e check-in.
5. Para Mercado Pago, configure o webhook para `https://api.felipepersonal.com/api/webhooks/mercadopago` e use o segredo correspondente no `.env` da VPS.
6. Monitore com `docker compose -f docker-compose.prod.yml logs -f api caddy`.

## 6. Operação contínua

Atualizações posteriores devem ser feitas por commit e executadas na VPS com `./deploy-vps.sh`. O script usa `git pull --ff-only`, reconstrói os serviços, espera a API ficar saudável e executa `npx prisma migrate deploy`.
