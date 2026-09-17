'use client';

import { apiFetch, isNetworkError } from '@/lib/api';
import { saveSession } from '@/lib/auth';
import { User } from '@/types';
import { Activity, ArrowRight, CheckCircle2, WifiOff } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

const demoProfiles: Record<'student' | 'admin', User> = {
  student: { id: 'demo-student', name: 'Lucas Almeida', email: 'aluno@consultoriafit.local', phone: null, role: 'STUDENT', gender: 'MALE', subscriptionStatus: 'ACTIVE' },
  admin: { id: 'demo-admin', name: 'Marina Personal', email: 'personal@consultoriafit.local', phone: null, role: 'ADMIN', gender: 'FEMALE', subscriptionStatus: 'ACTIVE' },
};

type AccessTab = 'student' | 'admin';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedNext = searchParams.get('next');
  const requestedTab: AccessTab = requestedNext === '/admin' ? 'admin' : 'student';
  const [tab, setTab] = useState<AccessTab>(requestedTab);
  const [profiles, setProfiles] = useState<Record<AccessTab, User>>(demoProfiles);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState(demoProfiles[requestedTab].email);
  const [password, setPassword] = useState('demo123');

  useEffect(() => {
    let active = true;
    Promise.all([
      apiFetch<{ users: User[] }>('/users?role=STUDENT'),
      apiFetch<{ users: User[] }>('/users?role=ADMIN'),
    ]).then(([students, admins]) => {
      if (!active) return;
      setProfiles({ student: students.users[0] ?? demoProfiles.student, admin: admins.users[0] ?? demoProfiles.admin });
      setApiOnline(true);
    }).catch((reason: unknown) => {
      if (!active) return;
      setApiOnline(false);
      setNotice(isNetworkError(reason) ? 'API offline: modo demonstração disponível.' : 'API indisponível: você ainda pode usar o perfil de demonstração.');
    });
    return () => { active = false; };
  }, []);

  const selectedProfile = useMemo(() => profiles[tab], [profiles, tab]);

  function changeTab(nextTab: AccessTab) {
    setTab(nextTab);
    setEmail(profiles[nextTab].email);
    setError('');
    setNotice('');
  }

  async function login() {
    setError('');
    setNotice('');
    setLoading(true);
    const destination = tab === 'admin' ? '/admin' : (requestedNext && requestedNext !== '/admin' ? requestedNext : '/treino');
    try {
      const response = await apiFetch<{ token: string; user: Omit<User, 'subscriptionStatus'> }>('/auth/demo-login', { method: 'POST', body: JSON.stringify({ userId: selectedProfile.id, email, password }) });
      saveSession(response.token, { ...selectedProfile, ...response.user });
      router.push(destination);
    } catch (reason) {
      if (isNetworkError(reason)) {
        const offlineUser: User = { ...selectedProfile, email: email || selectedProfile.email };
        saveSession(`offline-demo-${offlineUser.role.toLowerCase()}`, offlineUser);
        setNotice('API offline: acesso demonstrativo liberado localmente.');
        router.push(destination);
      } else {
        setError(reason instanceof Error ? reason.message : 'Não foi possível entrar.');
      }
    } finally {
      setLoading(false);
    }
  }

  return <div className="grid min-h-[calc(100vh-90px)] place-items-center px-5 py-12"><div className="w-full max-w-lg rounded-[2rem] border border-ink/10 bg-white p-7 shadow-soft md:p-10"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink text-lime-300"><Activity size={26} /></div><div className="mt-6 text-center"><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-lime-700">Acesso seguro</p><h1 className="mt-2 font-display text-3xl font-bold">Entrar na sua área</h1><p className="mt-3 text-sm leading-6 text-ink/55">Escolha o perfil e continue. A tela permanece disponível mesmo quando a API estiver offline.</p></div><div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl bg-sand/60 p-1.5"><button type="button" onClick={() => changeTab('student')} className={`rounded-xl px-3 py-3 text-sm font-extrabold transition ${tab === 'student' ? 'bg-white text-ink shadow-sm' : 'text-ink/45'}`}>Entrar como Aluno</button><button type="button" onClick={() => changeTab('admin')} className={`rounded-xl px-3 py-3 text-sm font-extrabold transition ${tab === 'admin' ? 'bg-ink text-white shadow-sm' : 'text-ink/45'}`}>Acesso Personal / Admin</button></div>{apiOnline === false || notice ? <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800"><WifiOff size={16} className="mt-0.5 shrink-0" />{notice || 'Modo Offline / Demonstração'}</div> : null}{error ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}<div className="mt-6 space-y-4"><label className="block"><span className="field-label">E-mail</span><input className="field-control" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={selectedProfile.email} /></label><label className="block"><span className="field-label">Senha</span><input className="field-control" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Senha de demonstração" /></label><button type="button" onClick={login} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-lime-500 px-5 py-4 text-sm font-extrabold text-white transition hover:bg-lime-600 disabled:cursor-wait disabled:opacity-60">{loading ? 'Conectando...' : `Continuar como ${tab === 'student' ? 'aluno' : 'Personal'}`} {loading ? null : <ArrowRight size={17} />}</button></div><div className="mt-6 rounded-2xl bg-[#f8faf6] p-4 text-xs text-ink/55"><p className="flex items-center gap-2 font-extrabold text-ink"><CheckCircle2 size={15} className="text-lime-600" /> Perfil selecionado</p><p className="mt-2">{selectedProfile.name} · {selectedProfile.email}</p><p className="mt-1">{tab === 'student' ? 'Destino: Área do Aluno' : 'Destino: Painel Administrativo'}</p></div><p className="mt-6 text-center text-[11px] font-semibold leading-5 text-ink/40">Demonstração local: a autenticação real deve validar credenciais no backend antes de liberar dados de produção.</p></div></div>;
}

export default function LoginPage() {
  return <Suspense fallback={<div className="grid min-h-[calc(100vh-90px)] place-items-center text-sm font-bold text-ink/45">Carregando acesso...</div>}><LoginContent /></Suspense>;
}
