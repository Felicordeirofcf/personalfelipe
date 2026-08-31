import { prisma } from '@/lib/prisma';
import CheckoutForm from '@/components/CheckoutForm';

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const product = await prisma.product.findFirst();

  if (!product) {
    return (
      <main className="container py-20">
        <h1 className="text-3xl font-bold">Nenhum produto cadastrado</h1>
        <p className="mt-3">Execute o seed do banco antes de abrir o checkout.</p>
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