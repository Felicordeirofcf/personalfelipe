import { prisma } from '@/lib/prisma';
import CheckoutForm from '@/components/CheckoutForm';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
<<<<<<< HEAD
  let product = null;

  try {
    product = await prisma.product.findFirst();
  } catch (error) {
    console.error('Erro ao buscar produto no banco de dados:', error);
  }

  if (!product) {
    return (
      <main className="container py-20 max-w-2xl mx-auto text-center">
        <h1 className="text-3xl font-bold text-gray-900">Banco de dados em sincronização</h1>
        <p className="mt-3 text-gray-600">
          O sistema está conectando ao banco de dados de produção. Se esta é a primeira execução, certifique-se de que o seed ou a migration foram aplicados no banco em nuvem.
        </p>
        <a href="/" className="mt-6 inline-block rounded-lg bg-black px-6 py-3 text-white font-bold hover:bg-gray-800">
          ← Voltar para o início
        </a>
=======
  const product = await prisma.product.findFirst();

  if (!product) {
    return (
      <main className="container py-20">
        <h1 className="text-3xl font-bold">Nenhum produto cadastrado</h1>
        <p className="mt-3">Execute o seed do banco antes de abrir o checkout.</p>
>>>>>>> 1608bef8dee8cbf07d571fd9acc970b2df48f5ac
      </main>
    );
  }

  // Garante que o valor exiba 50.00 corretamente caso esteja armazenado em centavos (5000)
  const rawPrice = product.price ?? 50;
  const finalPrice = rawPrice > 200 ? rawPrice / 100 : rawPrice;

  return (
    <main className="container max-w-3xl py-10 md:py-16">
      <a href="/" className="text-sm text-gray-500 hover:underline">← Voltar</a>
      <div className="mb-8 mt-10">
        <p className="text-sm font-bold uppercase tracking-[.18em] text-lime-700">Passo 1 de 2</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Vamos personalizar seu ponto de partida.</h1>
        <p className="mt-3 text-gray-600">{product.description || 'Planilha objetiva, progressiva e adaptável para treinar com consistência.'}</p>
        <div className="mt-4 inline-block rounded-lg bg-lime-100 px-4 py-2 text-lime-800 font-bold">
          Valor: R$ {finalPrice.toFixed(2)}
        </div>
      </div>
      <CheckoutForm productId={product.id} />
    </main>
  );
}