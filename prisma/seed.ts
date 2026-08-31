import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.product.upsert({
    where: { id: 'produto-treino-iniciante' },
    update: { 
      price: 5000, // Salvo em centavos para compatibilidade com PostgreSQL
      name: 'EVOTrainer — Treino Essencial de 8 semanas' 
    },
    create: { 
      id: 'produto-treino-iniciante', 
      name: 'EVOTrainer — Treino Essencial de 8 semanas', 
      description: 'Planilha objetiva, progressiva e adaptável para treinar com consistência.', 
      price: 5000, // 5000 = R$ 50,00
      spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/SEU-LINK-AQUI' 
    }
  });
  console.log(`Produto pronto: ${product.id}`);
}

main().finally(() => prisma.$disconnect());