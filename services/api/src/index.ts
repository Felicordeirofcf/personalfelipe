import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify from 'fastify';
import { env } from './lib/env';
import { prisma } from './lib/prisma';
import { adminWorkoutRoutes } from './modules/admin/admin-workout.routes';
import { anamnesisRoutes } from './modules/anamnesis/anamnesis.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { adminCheckInRoutes, studentCheckInRoutes } from './modules/checkin/checkin.routes';
import { mercadoPagoRoutes } from './modules/payments/mercadopago.routes';
import { studentWorkoutRoutes } from './modules/student/student.routes';
import { userRoutes } from './modules/users/user.routes';
import { workoutRoutes } from './modules/workout/workout.routes';

async function buildServer() {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  });

  const configuredOrigins = new Set(env.WEB_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean));
  const allowedOrigin = (origin: string | undefined) => {
    if (!origin) return true;
    if (configuredOrigins.has(origin)) return true;
    try {
      const url = new URL(origin);
      return url.protocol === 'https:' && url.hostname.endsWith('.vercel.app');
    } catch {
      return false;
    }
  };

  await app.register(cors, {
    origin: (origin, callback) => callback(null, allowedOrigin(origin)),
    credentials: true,
    methods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Origin', 'Accept', 'Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  });
  await app.register(sensible);
  await app.register(jwt, { secret: env.JWT_SECRET });
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'ConsultoriaFit API',
        description: 'API para anamnese, check-ins, assinaturas, geração assistida, aprovação e execução de treinos.',
        version: '2.0.0',
      },
      servers: [{ url: `http://localhost:${env.PORT}` }],
      tags: [
        { name: 'Sistema', description: 'Saúde da aplicação' },
        { name: 'Usuários', description: 'Perfis disponíveis' },
        { name: 'Autenticação', description: 'Acesso demonstrativo' },
        { name: 'Anamnese', description: 'Dados de avaliação do aluno' },
        { name: 'Treinos', description: 'Prescrição, aprovação e execução' },
        { name: 'Check-ins', description: 'Acompanhamento periódico do aluno' },
        { name: 'Webhooks', description: 'Sincronização segura com provedores externos' },
      ],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });

  app.get(
    '/health',
    { schema: { tags: ['Sistema'], summary: 'Verifica a saúde da API' } },
    async () => {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', service: 'consultoriafit-api', timestamp: new Date().toISOString() };
    },
  );

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(anamnesisRoutes, { prefix: '/api/anamnesis' });
  await app.register(workoutRoutes, { prefix: '/api/workouts' });
  await app.register(studentWorkoutRoutes, { prefix: '/api/student' });
  await app.register(studentCheckInRoutes, { prefix: '/api/student' });
  await app.register(adminWorkoutRoutes, { prefix: '/api/admin' });
  await app.register(adminCheckInRoutes, { prefix: '/api/admin' });
  await app.register(mercadoPagoRoutes, { prefix: '/api/webhooks' });

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    if (reply.sent) return;
    const normalized = error instanceof Error ? error : new Error('Erro desconhecido');
    const candidateStatus = 'statusCode' in normalized && typeof normalized.statusCode === 'number'
      ? normalized.statusCode
      : 500;
    const statusCode = candidateStatus < 500 ? candidateStatus : 500;
    reply.status(statusCode).send({
      error: statusCode === 500 ? 'Erro interno do servidor.' : normalized.message,
    });
  });

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });

  return app;
}

async function start() {
  const app = await buildServer();
  try {
    await app.listen({ host: '0.0.0.0', port: env.PORT });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
