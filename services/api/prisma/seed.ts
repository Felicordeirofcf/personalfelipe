import { PrismaClient, SubscriptionStatus, UserRole, WorkoutStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: 'personal@consultoriafit.local' },
    update: { name: 'Marina Personal', role: UserRole.ADMIN },
    create: {
      name: 'Marina Personal',
      email: 'personal@consultoriafit.local',
      role: UserRole.ADMIN,
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'aluno@consultoriafit.local' },
    update: {
      name: 'Lucas Almeida',
      phone: '+5511999999999',
      role: UserRole.STUDENT,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    },
    create: {
      name: 'Lucas Almeida',
      email: 'aluno@consultoriafit.local',
      phone: '+5511999999999',
      role: UserRole.STUDENT,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
    },
  });

  const existingAnamnesis = await prisma.anamnesis.findFirst({
    where: { userId: student.id },
  });

  if (!existingAnamnesis) {
    await prisma.anamnesis.create({
      data: {
        userId: student.id,
        goal: 'Hipertrofia com melhora do condicionamento geral',
        experience: 'INTERMEDIATE',
        weeklyDays: 4,
        injuries: ['Desconforto leve no ombro direito em amplitudes acima de 90°'],
        availableEquip: 'Academia completa com máquinas, cabos, barras e halteres',
      },
    });
  }

  const existingCheckIn = await prisma.checkIn.findFirst({ where: { userId: student.id } });
  if (!existingCheckIn) {
    await prisma.checkIn.create({
      data: {
        userId: student.id,
        painLevel: 2,
        painLocation: 'Ombro direito',
        fatigueLevel: 4,
        weightKg: 78.4,
        notes: 'Semana produtiva, mantendo amplitude confortável nos exercícios de ombro.',
        photoUrls: [],
      },
    });
  }

  console.log('Seed concluído com sucesso.');
  console.log(`Personal: ${admin.name} (${admin.email})`);
  console.log(`Aluno: ${student.name} (${student.email})`);
  console.log(`Planos ativos existentes: ${await prisma.workoutPlan.count({ where: { userId: student.id, status: WorkoutStatus.ACTIVE } })}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
