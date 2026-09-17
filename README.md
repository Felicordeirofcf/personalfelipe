# ConsultoriaFit

**ConsultoriaFit** é uma aplicação full stack para personal trainers criarem, revisarem e aprovarem prescrições de treino com assistência de inteligência artificial. O sistema também acompanha check-ins, progressão de carga, vídeos demonstrativos, assinatura do aluno, notificações de aprovação e fichas de treino imprimíveis.

O projeto está preparado para execução local no **VS Code para Windows** com Docker Desktop e WSL 2. O modo padrão usa um gerador simulado, portanto todo o fluxo pode ser testado sem chave da OpenAI e sem consumo de créditos.

## O que está incluído

A interface Next.js possui anamnese, check-in periódico, painel do personal com alerta de dor, geração assistida, editor com URL de vídeo, aprovação, ficha A4 e visão do aluno com a carga da sessão anterior. A API Fastify valida as entradas com Zod, documenta as rotas com Swagger, persiste os dados via Prisma e PostgreSQL, recebe webhooks assinados do Mercado Pago e notifica aprovações por um dispatcher HTTP de WhatsApp.

| Serviço | Tecnologia | Porta padrão | Endereço |
| --- | --- | ---: | --- |
| Web | Next.js 16, React 19, Tailwind CSS | 3000 | http://localhost:3000 |
| API | Node.js 20, Fastify 5, Prisma, Zod | 3333 | http://localhost:3333 |
| Swagger | OpenAPI e Swagger UI | 3333 | http://localhost:3333/docs |
| PostgreSQL | PostgreSQL 16 | 5432 | `localhost:5432` |

## Pré-requisitos no Windows

Instale o [VS Code](https://code.visualstudio.com/), o [Docker Desktop para Windows](https://docs.docker.com/desktop/setup/install/windows-install/) e o WSL 2. A documentação do Docker recomenda o backend WSL 2 para a maioria dos usuários e informa os requisitos atuais do Windows.[1]

Abra o PowerShell como administrador e confirme o WSL:

```powershell
wsl --install
wsl --update
wsl --version
```

No Docker Desktop, abra **Settings > General** e confirme **Use WSL 2 based engine**. Se utilizar uma distribuição Ubuntu, ative-a também em **Settings > Resources > WSL Integration**.[2]

## Execução rápida pelo terminal do VS Code

### 1. Extraia o projeto

Extraia o ZIP em uma pasta sem sincronização agressiva, por exemplo:

```text
C:\Projetos\ConsultoriaFit
```

Abra essa pasta no VS Code por **File > Open Folder**. Inicie o Docker Desktop e aguarde o indicador informar que o mecanismo está em execução.

### 2. Crie o arquivo de ambiente

No terminal PowerShell do VS Code, execute:

```powershell
Copy-Item .env.example .env
```

O arquivo já usa `OPENAI_API_KEY=mock`. Nesse modo, a API produz um treino válido localmente e não chama serviços pagos.

### 3. Construa e inicie os containers

```powershell
docker compose up --build -d
```

Na primeira execução, o download das imagens e a compilação podem levar alguns minutos. A API executa `prisma migrate deploy` automaticamente antes de iniciar.

### 4. Execute o seed

```powershell
docker compose exec api npm run db:seed
```

O seed é idempotente. Ele cria ou atualiza estes perfis:

| Papel | Nome | E-mail |
| --- | --- | --- |
| Personal | Marina Personal | `personal@consultoriafit.local` |
| Aluno | Lucas Almeida | `aluno@consultoriafit.local` |

### 5. Teste o fluxo de ponta a ponta

Acesse http://localhost:3000 e siga esta sequência:

1. Abra **Anamnese**, selecione Lucas Almeida, preencha os dados e envie.
2. No **Painel Personal**, localize a avaliação e clique em **Gerar com IA**.
3. Edite séries, repetições, RIR, descanso, cadência ou observações. Clique em **Salvar rascunho**.
4. Clique em **Aprovar treino**. A versão ativa anterior, se existir, será arquivada.
5. Abra **Meu treino**, confira o badge da sessão anterior, assista aos vídeos cadastrados e registre carga, repetições e RPE por série.
6. Abra **Check-in**, informe dor, fadiga, peso e observações. O último registro aparecerá no painel do personal, com alerta vermelho para dor a partir de 5.
7. Use **Imprimir / Salvar PDF** no treino para gerar uma ficha A4 pelo diálogo nativo do navegador.

A documentação interativa da API fica em http://localhost:3333/docs. A verificação de saúde fica em http://localhost:3333/health.

## Script automático para Windows

Como alternativa aos comandos manuais, execute:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\start-windows.ps1
```

O script cria `.env` quando necessário, executa o build, inicia os containers, aplica o seed e exibe os endereços da aplicação.

## Usar a OpenAI real

Edite o arquivo `.env` e substitua:

```dotenv
OPENAI_API_KEY=mock
```

por:

```dotenv
OPENAI_API_KEY=sua-chave-real
```

Opcionalmente, altere `OPENAI_MODEL=gpt-4o-mini` no `.env`. Depois, recrie somente a API:

```powershell
docker compose up -d --build api
```

A chave fica somente no ambiente do container da API. Ela nunca é enviada ao navegador. A API exige resposta JSON, valida a estrutura com Zod e aplica uma verificação adicional para restrições de ombro. Falhas do provedor retornam erro controlado; o sistema não troca silenciosamente para o modo simulado quando uma chave real está configurada.

## Aplicar a migração Prisma

O repositório já inclui a migração incremental `20260916210000_retention_scale`. No Docker Compose, ela é aplicada automaticamente pelo comando de inicialização da API. Para aplicá-la manualmente em um ambiente existente, execute:

```powershell
docker compose up -d postgres
docker compose run --rm api npx prisma migrate deploy
docker compose up -d
```

Durante desenvolvimento local, depois de alterar o schema, use `npx prisma migrate dev --name nome_da_alteracao`. O comando `npx prisma db push` deve ficar restrito a protótipos descartáveis, pois não produz o histórico de migrações usado em produção.

## Mercado Pago e controle de acesso

O endpoint é `POST /api/webhooks/mercadopago`. Cadastre uma URL pública HTTPS terminando nesse caminho e habilite o evento **Payments**. O Mercado Pago envia `payment.created` e `payment.updated`, espera uma resposta HTTP 200 ou 201 e recomenda consultar `GET /v1/payments/{id}` antes de atualizar o sistema.[3]

Defina `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET` no `.env`. A API valida `x-signature` por HMAC-SHA256 e localiza o aluno por `metadata.user_id`, `external_reference`, e-mail do pagador ou ID de cliente. Pagamentos aprovados ativam o acesso; recusados deixam a assinatura em atraso; cancelamentos, estornos e chargebacks cancelam o acesso. Com os valores `mock_token` e `mock_secret`, é possível testar localmente sem chamadas externas.

## WhatsApp

Defina `WHATSAPP_API_URL` com o endpoint HTTP completo do seu provedor e troque `WHATSAPP_API_KEY`. O dispatcher envia JSON no formato `{ "phone": "...", "message": "..." }`, com os cabeçalhos `Authorization: Bearer` e `apikey`. Adapte somente esse pequeno serviço caso o seu provedor exija outro contrato. Com `mock_key`, ou se o telefone estiver ausente, a mensagem é registrada como log estruturado e a aprovação do treino continua normalmente.

## Opções de execução

| Abordagem | Trade-offs | Custo | Complexidade de configuração |
| --- | --- | --- | --- |
| Docker Compose local | Ideal para testar todas as telas; provedores externos não conseguem chamar `localhost` diretamente. | Sem custo de hospedagem | Baixa |
| Servidor público com HTTPS | Recebe webhooks reais e mantém o sistema disponível continuamente; exige domínio, segredos e operação do servidor. | Depende do provedor | Média |

## Comandos úteis

```powershell
# Acompanhar todos os logs
docker compose logs -f

# Acompanhar apenas a API
docker compose logs -f api

# Ver o estado dos serviços
docker compose ps

# Parar sem apagar os dados
docker compose down

# Parar e apagar também o banco local
docker compose down -v

# Reexecutar o seed
docker compose exec api npm run db:seed

# Reconstruir após alterar código
docker compose up --build -d

# Reconstruir apenas a API sem usar cache e recriar o container
docker compose build --no-cache api
docker compose up -d --force-recreate api
```

> **Atenção:** `docker compose down -v` remove o volume do PostgreSQL e apaga os dados locais.

## Estrutura do projeto

```text
ConsultoriaFit/
├── docker-compose.yml
├── .env.example
├── start-windows.ps1
├── services/
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── migrations/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── lib/
│   │   │   └── modules/
│   │   └── Dockerfile
│   └── web/
│       ├── src/app/
│       ├── src/components/
│       ├── src/lib/
│       └── Dockerfile
└── README.md
```

## Arquitetura e regras de segurança

O navegador chama somente rotas com o prefixo `/api`, de acordo com a documentação Swagger. A API centraliza a validação de entrada e a serialização das respostas. O gerador recebe a anamnese como dados delimitados, exige um JSON sem propriedades extras e só persiste a saída depois da validação Zod.

Planos recém-gerados recebem o estado `DRAFT`. A aprovação ocorre em uma transação: o treino ativo anterior é arquivado e o rascunho selecionado se torna `ACTIVE`. O aluno consulta apenas o plano ativo. Um registro de série só é aceito quando o exercício pertence a esse plano.

A aplicação demonstra o fluxo funcional com perfis seed e login JWT de demonstração em `POST /api/auth/demo-login`. Para uma implantação pública, implemente um provedor de identidade real, controle de acesso por rota, HTTPS, rate limiting, política de retenção e consentimento adequado para dados de saúde.

## Solução de problemas

**A porta já está em uso.** Altere `WEB_PORT`, `PORT` ou `POSTGRES_PORT` no `.env`. Se alterar `PORT`, ajuste também `NEXT_PUBLIC_API_URL` e reconstrua o serviço web.

**O frontend não encontra a API.** Confirme que `NEXT_PUBLIC_API_URL=http://localhost:3333/api` contém o prefixo `/api` e execute `docker compose up -d --build web`.

**O banco não inicia.** Rode `docker compose logs postgres`. Para descartar um banco local corrompido durante testes, use `docker compose down -v` e inicie novamente.

**O seed falha porque a API ainda está iniciando.** Aguarde alguns segundos e repita `docker compose exec api npm run db:seed`.

**A OpenAI retorna erro.** Confirme a chave, o modelo disponível e a conexão. Para voltar ao teste local, defina `OPENAI_API_KEY=mock` e reconstrua a API.

## Referências

[1]: https://docs.docker.com/desktop/setup/install/windows-install/ "Install Docker Desktop on Windows"
[2]: https://docs.docker.com/desktop/features/wsl/ "Docker Desktop WSL 2 backend on Windows"
[3]: https://www.mercadopago.com.mx/developers/en/docs/checkout-pro-preferences/payment-notifications "Mercado Pago — Configure payment notifications"
