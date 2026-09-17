'use client';

import { Activity, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AppHeader() {
  const pathname = usePathname(); const isLanding = pathname === '/';
  return <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-zinc-950/80 backdrop-blur-md"><div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 lg:px-8"><Link href="/" className="group flex items-center gap-3" aria-label="ConsultoriaFit - início"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400 text-[#06110e] shadow-lg shadow-emerald-500/20 transition-transform group-hover:-rotate-3"><Activity size={21} strokeWidth={2.6} /></span><span><span className="block font-display text-lg font-bold leading-none tracking-tight text-white">ConsultoriaFit</span><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Treino inteligente</span></span></Link><nav className="hidden items-center gap-7 md:flex" aria-label="Navegação pública"><Link href="/#como-funciona" className="text-sm font-bold text-slate-400 transition hover:text-white">Como funciona</Link><Link href="/#metodologia" className="text-sm font-bold text-slate-400 transition hover:text-white">Metodologia</Link><Link href="/#planos" className="text-sm font-bold text-slate-400 transition hover:text-white">Planos</Link></nav><Link href="/login?next=/treino" className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-[#06110e] shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-300">Área do aluno <ArrowRight size={16} /></Link></div>{isLanding ? <nav className="flex gap-5 overflow-x-auto px-5 pb-3 text-xs font-bold text-slate-500 md:hidden"><Link href="/#como-funciona">Como funciona</Link><Link href="/#metodologia">Metodologia</Link><Link href="/#planos">Planos</Link></nav> : null}</header>;
}
