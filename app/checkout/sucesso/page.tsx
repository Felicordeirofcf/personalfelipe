'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');

  return (
    <main className="min-h-screen bg-gradient-to-br from-lime-50 via-white to-gray-50 flex items-center justify-center p-4 py-12">
      {/* Card Principal */}
      <div className="max-w-lg w-full bg-white rounded-[2rem] shadow-2xl border border-lime-100 overflow-hidden relative">
        
        {/* Faixa decorativa no topo */}
        <div className="h-4 w-full bg-gradient-to-r from-lime-400 to-lime-600"></div>

        <div className="p-8 md:p-12 text-center">
          
          {/* Ícone Animado de Sucesso */}
          <div className="mx-auto w-24 h-24 bg-lime-100 text-lime-600 rounded-full flex items-center justify-center mb-6 animate-[bounce_1s_ease-in-out_1]">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>

          <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-3">
            Tudo certo! 🎉
          </h1>
          <p className="text-gray-600 mb-8 text-lg">
            Seu pagamento foi aprovado e sua anamnese já está em nossas mãos.
          </p>

          {/* Box de Próximos Passos */}
          <div className="bg-[#f2f8d6] rounded-2xl p-6 text-left mb-8 shadow-inner">
            <h3 className="font-bold text-lime-900 mb-4 uppercase tracking-wider text-xs">O que acontece agora?</h3>
            <ul className="space-y-5">
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-lime-500 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">1</span>
                <p className="text-sm text-lime-950 font-medium pt-1">Nossa equipe analisará seu perfil e objetivos.</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-lime-500 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">2</span>
                <p className="text-sm text-lime-950 font-medium pt-1">Sua planilha será montada de forma 100% personalizada.</p>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-lime-500 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">3</span>
                <p className="text-sm text-lime-950 font-medium pt-1">Você receberá o acesso no seu <strong>WhatsApp</strong> em até 24 horas.</p>
              </li>
            </ul>
          </div>

          {/* ID do Pedido */}
          {orderId && (
            <div className="mb-8">
              <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Número do Pedido</p>
              <p className="text-sm font-mono text-gray-600 bg-gray-50 inline-block px-3 py-1 rounded-md mt-1 border border-gray-100">
                #{orderId.split('-')[0]}
              </p>
            </div>
          )}

          {/* Botão de Retorno */}
          <Link 
            href="/" 
            className="inline-block w-full rounded-xl bg-black px-6 py-4 text-white font-bold hover:bg-gray-800 transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg"
          >
            Voltar para o início
          </Link>

          <p className="mt-6 text-xs text-gray-400">
            Dúvidas? Chame nosso suporte no WhatsApp.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-lime-50">
        <p className="text-lime-700 font-bold animate-pulse">Carregando confirmação...</p>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}