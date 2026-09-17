'use client';

import { clearSession, getSessionUser, SESSION_EVENT } from '@/lib/auth';
import { User } from '@/types';
import { Activity, ArrowRight, LogOut, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const isLanding = pathname === '/';
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const syncSession = () => setUser(getSessionUser());
    syncSession();
    window.addEventListener(SESSION_EVENT, syncSession);
    window.addEventListener('storage', syncSession);
    return () => {
      window.removeEventListener(SESSION_EVENT, syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, [pathname]);

  function logout() {
    clearSession();
    setUser(null);
    router.replace('/login');
    router.refresh();
  }

  const dashboardPath = user?.role === 'ADMIN' ? '/admin' : '/aluno';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-zinc-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
        <Link href="/" className="group flex items-center gap-3" aria-label="ConsultoriaFit - início">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-400 text-[#06110e] shadow-lg shadow-emerald-500/20 transition-transform group-hover:-rotate-3"><Activity size={21} strokeWidth={2.6} /></span>
          <span><span className="block font-display text-lg font-bold leading-none tracking-tight text-white">ConsultoriaFit</span><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Treino inteligente</span></span>
        </Link>

        {isLanding && !user ? <nav className="hidden items-center gap-7 md:flex" aria-label="Navegação pública"><Link href="/#como-funciona" className="text-sm font-bold text-slate-400 transition hover:text-white">Como funciona</Link><Link href="/#metodologia" className="text-sm font-bold text-slate-400 transition hover:text-white">Metodologia</Link><Link href="/#planos" className="text-sm font-bold text-slate-400 transition hover:text-white">Planos</Link></nav> : null}

        {user ? (
          <div className="flex items-center gap-2">
            <Link href={dashboardPath} className="hidden items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-bold text-zinc-100 transition hover:bg-zinc-800 sm:inline-flex"><UserRound size={16} /> {user.role === 'ADMIN' ? 'Painel admin' : 'Meu painel'}</Link>
            <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-950/30 px-4 py-2.5 text-sm font-bold text-red-200 transition hover:bg-red-900/50" aria-label="Sair da conta"><LogOut size={16} /> Sair</button>
          </div>
        ) : (
          <Link href="/login?next=/aluno" className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-black text-[#06110e] shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-300">Área do aluno <ArrowRight size={16} /></Link>
        )}
      </div>
      {isLanding && !user ? <nav className="flex gap-5 overflow-x-auto px-5 pb-3 text-xs font-bold text-slate-500 md:hidden"><Link href="/#como-funciona">Como funciona</Link><Link href="/#metodologia">Metodologia</Link><Link href="/#planos">Planos</Link></nav> : null}
    </header>
  );
}
