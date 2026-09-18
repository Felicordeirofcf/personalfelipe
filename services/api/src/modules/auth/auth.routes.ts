import { createHash, randomBytes } from 'node:crypto';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { env } from '../../lib/env';
import { hashPassword, normalizeCpf, verifyPassword } from '../../lib/password';

const CredentialsSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128),
}).strict();

const RegisterSchema = CredentialsSchema.extend({
  name: z.string().trim().min(3).max(120),
  cpf: z.string().min(11).max(18),
}).strict();

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8).max(128),
}).strict();

const ForgotSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
}).strict();

const ResetSchema = z.object({
  token: z.string().min(20),
  newPassword: z.string().min(8).max(128),
}).strict();

type PublicUser = {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string | null;
  role: 'ADMIN' | 'STUDENT';
  gender: 'MALE' | 'FEMALE';
  subscriptionStatus: 'ACTIVE' | 'INACTIVE' | 'OVERDUE' | 'CANCELED';
  hasCompletedAnamnesis: boolean;
};

function publicUser(user: any): PublicUser {
  // Trata relação 1:N (array) ou 1:1 (objeto direto) retornada pelo Prisma
  const hasCompletedAnamnesis = Array.isArray(user.anamnesis)
    ? user.anamnesis.length > 0
    : Boolean(user.anamnesis);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    cpf: user.cpf,
    phone: user.phone ?? null,
    role: user.role,
    gender: user.gender ?? 'MALE',
    subscriptionStatus: user.subscriptionStatus,
    hasCompletedAnamnesis,
  };
}

function tokenHash(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const parsed = RegisterSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest('Informe nome, e-mail, CPF e uma senha válida.');

    const cpf = normalizeCpf(parsed.data.cpf);
    if (cpf.length !== 11) return reply.badRequest('CPF inválido.');

    if (await prisma.user.findFirst({ where: { OR: [{ email: parsed.data.email }, { cpf }] } })) {
      return reply.conflict('Já existe uma conta com este e-mail ou CPF.');
    }

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        cpf,
        role: 'STUDENT',
        passwordHash: await hashPassword(parsed.data.password),
        updatedAt: new Date(),
      },
      include: {
        anamnesis: {
          select: { id: true },
          take: 1,
        },
      },
    });

    const token = app.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: '12h' }
    );

    return reply.status(201).send({ token, user: publicUser(user) });
  });

  app.post('/login', async (request, reply) => {
    const parsed = CredentialsSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest('E-mail ou senha inválidos.');

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      include: {
        anamnesis: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return reply.unauthorized('E-mail ou senha inválidos.');
    }

    const token = app.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: '12h' }
    );

    return { token, user: publicUser(user) };
  });

  app.get('/me', async (request, reply) => {
    await request.jwtVerify();

    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      include: {
        anamnesis: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!user) return reply.notFound('Usuário não encontrado.');

    return { user: publicUser(user) };
  });

  app.post('/change-password', async (request, reply) => {
    await request.jwtVerify();
    const parsed = ChangePasswordSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest('A nova senha deve ter pelo menos 8 caracteres.');

    const user = await prisma.user.findUnique({ where: { id: request.user.sub } });
    if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      return reply.unauthorized('Senha atual incorreta.');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(parsed.data.newPassword),
        updatedAt: new Date(),
      },
    });

    return { changed: true };
  });

  app.post('/forgot-password', async (request, reply) => {
    const parsed = ForgotSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest('Informe um e-mail válido.');

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) return { message: 'Se o e-mail estiver cadastrado, as instruções serão disponibilizadas.' };

    const rawToken = randomBytes(32).toString('hex');
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: tokenHash(rawToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    request.log.info({ userId: user.id }, 'Token de recuperação criado. Conecte um provedor de e-mail para envio em produção.');
    return {
      message: 'Se o e-mail estiver cadastrado, as instruções serão disponibilizadas.',
      ...(env.NODE_ENV !== 'production' ? { resetToken: rawToken } : {}),
    };
  });

  app.post('/reset-password', async (request, reply) => {
    const parsed = ResetSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest('Token ou nova senha inválidos.');

    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: tokenHash(parsed.data.token) },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return reply.badRequest('Token expirado ou inválido.');
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash: await hashPassword(parsed.data.newPassword),
          updatedAt: new Date(),
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { reset: true };
  });
}
