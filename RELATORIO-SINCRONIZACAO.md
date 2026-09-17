# Relatório de sincronização e alterações

## Estado do repositório

O repositório foi clonado de `https://github.com/Felicordeirofcf/personalfelipe`, atualizado com `git fetch origin --prune` e comparado com `origin/main`. O `HEAD` local estava em `eb75ba4`, exatamente alinhado com `origin/main`, sem commits locais divergentes e sem alterações locais pré-existentes no clone. Foi criada a branch de segurança `backup/antes-da-sincronizacao` antes das alterações. Nenhum commit foi publicado e nenhum banco de produção foi alterado.

## Commits remotos incorporados

Não havia commits remotos pendentes para incorporar: `HEAD...origin/main` resultou em `0 0`. O commit remoto presente no ponto de partida foi `eb75ba4 fix(vercel): set build script strictly to next build without prisma`.

## Alterações realizadas

| Arquivo | Alteração |
|---|---|
| `services/api/src/modules/auth/auth.routes.ts` | Cadastro passou a aceitar somente nome, e-mail, CPF e senha; `gender` deixou de ser obrigatório e o valor padrão do Prisma é preservado. |
| `services/web/src/app/cadastro/page.tsx` | Removida a seleção de sexo da tela de cadastro; ajustes de contraste no tema escuro. |
| `services/web/src/app/anamnese/page.tsx` | Mantida a escolha de sexo somente na anamnese, com apenas os botões Masculino/Feminino; removidas as descrições de ênfase e corrigidos fundos, bordas e textos para dark mode. |
| `services/web/src/app/globals.css` | Removido o override global de `.bg-white`, que mascarava componentes e poderia gerar comportamento visual inesperado. |
| `services/web/src/app/layout.tsx` | Atualizados e-mails e WhatsApp visíveis para `consultoria@evotrainer.com` e `https://wa.me/5521987708652`. |
| `services/web/src/app/page.tsx` | Adicionados contatos corretos no CTA final da landing page. |
| `services/api/src/modules/ai/ai.service.ts` | Atualizada a redação interna do template de treino para não manter as expressões antigas removidas da experiência. |
| `.env.example` | Incluídas explicitamente as origens `https://evotrainer.com.br` e `https://www.evotrainer.com.br` na documentação. |

## Funcionalidades preservadas

A autenticação existente continua usando hash seguro de senha, login por e-mail e senha, troca de senha autenticada e recuperação com token SHA-256, expiração de 30 minutos e uso único. Em produção o token não é retornado pela API; a integração de envio de e-mail permanece preparada, mas requer configuração de um provedor externo. O seed mantém o administrador padrão `personal@consultoriafit.local` com a senha inicial documentada no código e preserva os campos obrigatórios atuais, incluindo `gender`, `cpf` e `passwordHash`.

As migrações Prisma existentes foram preservadas e estão em ordem cronológica: `20260916150000_init`, `20260916210000_retention_scale`, `20260917003000_gender_onboarding`, `20260917071100_commercial_product` e `20260917074200_password_recovery`. O CORS já permitia explicitamente os dois domínios `evotrainer.com.br`, além das origens configuradas e ambientes locais; não foi alegado teste de disponibilidade externa da API, pois isso exigiria ambiente publicado e não foi feito deploy.

## Validações executadas

- `git fetch origin --prune`: concluído.
- Branch de segurança criada: concluído.
- `git diff --check`: concluído sem erros.
- Busca final por contatos antigos, textos removidos e classes `text-gray-800`, `text-gray-900`, `text-slate-900` e `text-black`: nenhuma ocorrência encontrada nos arquivos verificados.
- `npx prisma validate` com `DATABASE_URL` sintaticamente válida de validação: aprovado.
- `npm run typecheck` na API: aprovado.
- `npm run build` na API: aprovado.
- `npm run typecheck` no frontend: aprovado.
- `npm run build` no frontend: aprovado.
- O build do frontend confirmou as rotas `/`, `/login`, `/cadastro`, `/anamnese`, `/aluno`, `/admin` e `/redefinir-senha`, além das rotas adicionais `/checkin` e `/treino`.
- A primeira tentativa de instalação do frontend falhou por erro de integridade/criptografia em `node_modules`; as dependências geradas foram removidas e `npm ci` limpo foi concluído com sucesso. O diretório não versionado não é incluído no ZIP.

## Pendências e limitações

Não foi feito deploy, teste de endpoint público, alteração de banco ou execução do seed, conforme solicitado. A API precisa de `DATABASE_URL` configurada para executar migrações/seed e iniciar em produção. A recuperação de senha ainda precisa de um provedor de e-mail configurado para entrega real das instruções; essa limitação já está registrada no fluxo da API. A disponibilidade externa da API não pode ser classificada como corrigida sem uma URL publicada respondendo, e nenhum status 502/túnel foi mascarado como CORS.

## Empacotamento

O ZIP final exclui `.git`, `node_modules`, `.next`, `dist`, caches e arquivos temporários de validação. A branch de segurança permanece somente no clone local e não é incluída no pacote.

## Adendo — redesign visual completo

Após a sincronização inicial, o frontend recebeu uma refatoração visual abrangente. O sistema de design foi consolidado em fundo `#070A0F`, superfícies grafite, bordas zinc sutis, tipografia branca/zinc de alto contraste e verde esmeralda para ações e estados ativos. Os componentes compartilhados `PageIntro`, `Panel`, `Button`, `Notice` e `StatusBadge` foram atualizados para que landing page, autenticação, dashboards e fluxos operacionais tenham a mesma linguagem visual.

A tela de Anamnese foi reconstruída integralmente com hierarquia tipográfica, cards de seleção de sexo com estado ativo e indicador de check, inputs táteis, slider de dias com badge de valor, chips de restrições, sidebar premium do Método Felipe Ferreira, aviso de segurança e CTA responsivo. As telas de aluno, administrador, treino, check-in, cadastro, login e redefinição passaram pela normalização de classes legadas de tema claro para superfícies e textos dark de alto contraste. A lógica de autenticação, carregamento, envio de formulários e contratos da API foi preservada.

Após o redesign, `npm run typecheck` e `npm run build` do frontend foram executados novamente com sucesso, gerando as 11 rotas da aplicação sem erros.
