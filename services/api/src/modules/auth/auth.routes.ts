import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { hashPassword, normalizeCpf, verifyPassword } from '../../lib/password';

const CredentialsSchema = z.object({ email: z.string().email().transform((value) => value.trim().toLowerCase()), password: z.string().min(8).max(128) }).strict();
const RegisterSchema = CredentialsSchema.extend({ name: z.string().trim().min(3).max(120), cpf: z.string().min(11).max(18), gender: z.enum(['MALE', 'FEMALE']) }).strict();

function publicUser(user: { id: string; name: string; email: string; cpf: string; phone: string | null; role: 'ADMIN' | 'STUDENT'; gender: 'MALE' | 'FEMALE'; subscriptionStatus: 'ACTIVE' | 'INACTIVE' | 'OVERDUE' | 'CANCELED' }) {
  const { id, name, email, cpf, phone, role, gender, subscriptionStatus } = user;
  return { id, name, email, cpf, phone, role, gender, subscriptionStatus };
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    const parsed = RegisterSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest('Informe nome, e-mail, CPF, sexo e uma senha válida.');
    const cpf = normalizeCpf(parsed.data.cpf);
    if (cpf.length !== 11) return reply.badRequest('CPF inválido.');
    const exists = await prisma.user.findFirst({ where: { OR: [{ email: parsed.data.email }, { cpf }] } });
    if (exists) return reply.conflict('Já existe uma conta com este e-mail ou CPF.');
    const user = await prisma.user.create({ data: { name: parsed.data.name, email: parsed.data.email, cpf, gender: parsed.data.gender, role: 'STUDENT', passwordHash: await hashPassword(parsed.data.password) } });
    const token = app.jwt.sign({ sub: user.id, email: user.email, role: user.role }, { expiresIn: '12h' });
    return reply.status(201).send({ token, user: publicUser(user) });
  });

  app.post('/login', async (request, reply) => {
    const parsed = CredentialsSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest('E-mail ou senha inválidos.');
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) return reply.unauthorized('E-mail ou senha inválidos.');
    const token = app.jwt.sign({ sub: user.id, email: user.email, role: user.role }, { expiresIn: '12h' });
    return { token, user: publicUser(user) };
  });
}
