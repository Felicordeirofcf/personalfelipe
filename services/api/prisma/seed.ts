import { PrismaClient, SubscriptionStatus, UserRole, WorkoutStatus, Gender } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hashPassword('ConsultoriaFit@2026');
  const admin = await prisma.user.upsert({
    where: { email: 'personal@consultoriafit.local' },
    update: { name: 'Felipe Ferreira', role: UserRole.ADMIN, cpf: '00000000001', passwordHash },
    create: { name: 'Felipe Ferreira', email: 'personal@consultoriafit.local', cpf: '00000000001', passwordHash, role: UserRole.ADMIN, gender: Gender.MALE },
  });
  const student = await prisma.user.upsert({
    where: { email: 'aluno@consultoriafit.local' },
    update: { name: 'Lucas Almeida', phone: '+5511999999999', role: UserRole.STUDENT, gender: Gender.MALE, cpf: '00000000002', passwordHash, subscriptionStatus: SubscriptionStatus.ACTIVE },
    create: { name: 'Lucas Almeida', email: 'aluno@consultoriafit.local', cpf: '00000000002', passwordHash, phone: '+5511999999999', role: UserRole.STUDENT, gender: Gender.MALE, subscriptionStatus: SubscriptionStatus.ACTIVE },
  });
  if (!await prisma.anamnesis.findFirst({ where: { userId: student.id } })) await prisma.anamnesis.create({ data: { userId: student.id, goal: 'Hipertrofia com melhora do condicionamento geral', experience: 'INTERMEDIATE', gender: student.gender, weeklyDays: 4, injuries: [], availableEquip: 'Academia completa com máquinas, cabos, barras e halteres' } });
  console.log(`Seed comercial concluído. Personal: ${admin.email}. Aluno: ${student.email}. Senha inicial: ConsultoriaFit@2026`);
  console.log(`Planos ativos: ${await prisma.workoutPlan.count({ where: { userId: student.id, status: WorkoutStatus.ACTIVE } })}`);
}
main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
