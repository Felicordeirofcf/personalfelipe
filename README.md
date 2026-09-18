# 🏋️ EvoTrainer (ConsultoriaFit)

> Plataforma proprietária de consultoria desportiva, gestão de alunos e prescrição biomecânica inteligente apoiada por Inteligência Artificial.

---

## 📌 Visão Geral

O **EvoTrainer** é um ecossistema digital concebido para a gestão operacional de consultorias de treino personalizado. A aplicação integra um motor cinesiológico que utiliza modelos generativos da OpenAI e validação estruturada com Zod para prescrever planos de treino com salvaguardas clínicas automáticas, respeitando patologias articulares, mecânicas de alavanca e limitações individuais comunicadas na anamnese.

A arquitetura do projeto foi construída de forma modular, com separação de responsabilidades entre serviços e prontidão para evolução em modelo multi-tenant.

---

## 🚀 Funcionalidades Principais

* **Prescrição Biomecânica via IA:** Geração assistida de planos de treino com matriz de variação de implementos (halteres, máquinas articuladas, cabos e pesos livres) sem repetições monótonas de exercícios.
* **Motor Clínico Universal:** Interpretação cinesiológica automática de queixas clínicas (ex.: condromalácia patelar, hérnias de disco, síndrome do impacto subacromial e fibromialgia), ajustando amplitudes, vetores de força e repetições em reserva (RIR).
* **Painel Administrativo para Treinadores:** Fila de alunos com pesquisa em tempo real, seleção direta sem menus suspensos, consulta de prontuário clínico detalhado e histórico de check-ins de fadiga e dor.
* **Editor e Publicação de Treinos:** Edição técnica completa de séries, repetições, cadência e intervalos de descanso, com suporte a exportação/impressão em folha técnica de treino.
* **Área do Aluno:** Visualização diária do plano ativo, acompanhamento de histórico e registo de cargas/repetições executadas.
* **Autenticação & Controlo de Acessos:** Proteção de rotas com JWT no Fastify, guardas de subscrição e controlo de integridade de dados via Prisma ORM.

---

## 🛠️ Stack Tecnológica

| Componente | Tecnologias |
| :--- | :--- |
| **Frontend** | Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide Icons |
| **Backend** | Node.js, Fastify, TypeScript, Zod, JWT |
| **Base de Dados** | PostgreSQL, Prisma ORM |
| **Inteligência Artificial** | OpenAI API (GPT-4o / GPT-4o-mini), JSON Mode |
| **Infraestrutura** | Docker, Docker Compose, Cloudflare Tunnels |

---

## 📂 Estrutura do Projeto

```text
ConsultoriaFit/
├── docker-compose.yml
├── .env.example
├── services/
│   ├── api/                     # Backend Fastify
│   │   ├── prisma/
│   │   │   └── schema.prisma    # Modelação relacional da base de dados
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── ai/          # Motor de IA e prompts clínicos universais
│   │       │   ├── auth/        # Autenticação e gestão de utilizadores
│   │       │   ├── workouts/    # Gestão de treinos, splits e exercícios
│   │       │   └── student/     # Consultas do portal do aluno
│   │       └── server.ts        # Configuração do Fastify, CORS e handlers globais
│   └── web/                     # Frontend Next.js
│       └── src/
│           ├── app/
│           │   ├── admin/       # Painel de gestão da consultoria
│           │   └── ...          # Rotas de autenticação e portal do aluno
│           └── components/      # Componentes de interface e editores técnicos
```

---

## ⚙️ Variáveis de Ambiente

Crie um ficheiro `.env` na raiz do projeto (e nos respetivos diretórios de serviço, conforme necessário):

```env
# Base de Dados
DATABASE_URL="postgresql://postgres:postgres@db:5432/consultoriafit?schema=public"

# Autenticação
JWT_SECRET="sua_chave_jwt_super_segura"

# Inteligência Artificial
OPENAI_API_KEY="sk-proj-..."
OPENAI_MODEL="gpt-4o-mini"

# Aplicação
PORT=3333
NODE_ENV="production"
```

---

## 🐳 Como Executar com Docker

1. **Clonar o repositório:**
   ```bash
   git clone [https://github.com/Felicordeirofcf/consultoriafit.git](https://github.com/Felicordeirofcf/consultoriafit.git)
   cd consultoriafit
   ```

2. **Configurar as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   ```

3. **Construir e iniciar os contentores:**
   ```powershell
   docker compose build
   docker compose up -d
   ```

4. **Executar migrações da base de dados:**
   ```powershell
   docker compose exec api npx prisma migrate deploy
   ```

5. **Aceder às aplicações:**
   * **Frontend (Web):** `http://localhost:3000`
   * **Backend (API):** `http://localhost:3333`

---

## 🔒 Segurança & Boas Práticas

* **Validação de Entradas:** Todas as rotas de entrada e payloads de IA são inspecionados por esquemas Zod com tratamento de campos nulos e fallbacks automáticos.
* **Políticas de CORS:** Manipulador global de erros configurado para garantir a presença dos cabeçalhos `Access-Control-Allow-Origin` mesmo em situações de erro interno (500/502).
* **Gestão de Transações:** Operações de criação, aprovação de treinos e arquivamento de versões anteriores são executadas através de transações atómicas do Prisma.
