'use client';

import { Activity, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AppHeader() {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-[#f8faf6]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 lg:px-8">
        <Link href="/" className="group flex items-center gap-3" aria-label="ConsultoriaFit - início">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink text-lime-300 shadow-lg shadow-ink/20 transition-transform group-hover:-rotate-3"><Activity size={21} strokeWidth={2.6} /></span>
          <span><span className="block font-display text-lg font-bold leading-none tracking-tight text-ink">ConsultoriaFit</span><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-ink/45">Treino inteligente</span></span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Navegação pública">
          <Link href="/#como-funciona" className="text-sm font-bold text-ink/60 transition hover:text-ink">Como funciona</Link>
          <Link href="/#beneficios" className="text-sm font-bold text-ink/60 transition hover:text-ink">Benefícios</Link>
          <Link href="/#planos" className="text-sm font-bold text-ink/60 transition hover:text-ink">Planos</Link>
        </nav>
        <Link href="/login?next=/treino" className="inline-flex items-center gap-2 rounded-xl bg-lime-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-lime-500/20 transition hover:-translate-y-0.5 hover:bg-lime-600">
          Área do aluno <ArrowRight size={16} />
        </Link>
      </div>
      {isLanding ? <nav className="flex gap-5 overflow-x-auto px-5 pb-3 text-xs font-bold text-ink/55 md:hidden"><Link href="/#como-funciona">Como funciona</Link><Link href="/#beneficios">Benefícios</Link><Link href="/#planos">Planos</Link></nav> : null}
    </header>
  );
}
