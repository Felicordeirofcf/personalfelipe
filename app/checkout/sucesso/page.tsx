import Link from 'next/link';
import MetaPurchase from '@/components/MetaPurchase';

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <main className="container max-w-xl py-24">
    <MetaPurchase orderId={id} value={50} />
    <div className="card p-8 md:p-12"><p className="text-sm font-bold uppercase tracking-[.18em] text-lime-700">Pedido recebido</p><h1 className="mt-4 text-4xl font-black tracking-tight">Agora entra a curadoria humana.</h1><p className="mt-5 leading-7 text-gray-600">Seu pagamento foi simulado como aprovado. O personal revisará sua anamnese e, após a aprovação, o link da planilha será enviado.</p>{id && <p className="mt-6 rounded-xl bg-gray-50 p-4 font-mono text-xs text-gray-500">Pedido: {id}</p>}<Link href="/" className="btn btn-dark mt-8 inline-block">Voltar para o início</Link></div>
  </main>;
}
